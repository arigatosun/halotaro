// main.ts
import { chromium, Browser, Page, BrowserContext } from "playwright";
import fs from "fs";
import path from "path";

import { saveReservations } from "./save-reservations";

import { logger } from "./logger";
import { createClient } from "@supabase/supabase-js";
import { saveMenus } from "./menu/save-menu";
import { scrapeMenus } from "./menu/scrapeMenus";
import { scrapeReservations } from "./scrapeReservation";
import { scrapeStaff } from "./staff/scrapeStaff";
import { processStaffData } from "./staff/processStaffData";
import { syncStaff } from "./staff/syncStaff";
import { scrapeCoupons } from "./coupon/scrapeCoupons";
import { processCouponData } from "./coupon/processCouponData";
import { saveCoupons } from "./coupon/save-coupons";
import { decrypt, encrypt } from "@/utils/encryption";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SessionData {
  cookies: any[];
}

const SESSION_FILE = path.join(process.cwd(), "session.json");

export async function saveSession(userId: string, context: BrowserContext) {
  const cookies = await context.cookies();
  const sessionData: SessionData = { cookies };

  const encryptedSession = encrypt(JSON.stringify(sessionData));

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後

  const { error } = await supabase.from("salonboard_sessions").upsert({
    user_id: userId,
    session_data: encryptedSession,
    expires_at: expiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function loadSession(
  userId: string,
  context: BrowserContext
): Promise<boolean> {
  const { data, error } = await supabase
    .from("salonboard_sessions")
    .select("session_data, expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !data) return false;

  if (new Date(data.expires_at) < new Date()) {
    // セッションの有効期限切れ
    await supabase.from("salonboard_sessions").delete().eq("user_id", userId);
    return false;
  }

  const sessionData: SessionData = JSON.parse(decrypt(data.session_data));

  await context.addCookies(sessionData.cookies);
  return true;
}

async function setupBrowser(): Promise<{
  browser: Browser;
  context: BrowserContext;
}> {
  const browser = await chromium.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-infobars",
      "--window-position=0,0",
      "--ignore-certifcate-errors",
      "--ignore-certifcate-errors-spki-list",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    geolocation: { longitude: 139.7594549, latitude: 35.6828387 },
    permissions: ["geolocation"],
  });

  return { browser, context };
}

async function loginAndNavigate(
  page: Page,
  context: BrowserContext,
  haloTaroUserId: string,
  salonboardUserId: string,
  password: string,
  url: string
) {
  const sessionLoaded = await loadSession(haloTaroUserId, context);
  if (sessionLoaded) {
    console.log("保存された認証情報を使用してブラウザを開きました。");

    if (await page.isVisible('input[name="userId"]')) {
      console.log("セッションが無効になっています。再ログインが必要です。");
      await loginWithManualCaptcha(page, salonboardUserId, password);
      await saveSession(haloTaroUserId, context);
    }
  } else {
    console.log("新規ログインを行います。");
    await loginWithManualCaptcha(page, salonboardUserId, password);
    await saveSession(haloTaroUserId, context);
  }

  await page.goto(url, { waitUntil: "networkidle" });
  await checkAndRelogin(
    page,
    salonboardUserId,
    password,
    context,
    haloTaroUserId
  );
}

export async function syncReservations(
  haloTaroUserId: string,
  salonboardUserId: string,
  password: string
) {
  logger.setup();
  console.log(
    "Starting Salonboard reservation sync at",
    new Date().toISOString()
  );

  const { browser, context } = await setupBrowser();
  const page = await context.newPage();

  try {
    await loginAndNavigate(
      page,
      context,
      haloTaroUserId,
      salonboardUserId,
      password,
      "https://salonboard.com/KLP/reserve/reserveList/init"
    );
    await page.waitForSelector("#reserveList", { timeout: 10000 });

    const { data: lastSyncLog } = await supabase
      .from("salonboard_sync_logs")
      .select("last_sync_time, last_reservation_id")
      .eq("user_id", haloTaroUserId)
      .order("last_sync_time", { ascending: false })
      .limit(1)
      .single();

    const lastSyncTime = lastSyncLog
      ? new Date(lastSyncLog.last_sync_time)
      : new Date(0); // Unix epoch

    console.log(`Last sync time: ${lastSyncTime}`);
    const lastReservationId = lastSyncLog
      ? lastSyncLog.last_reservation_id
      : null;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 61);

    console.log("予約を取得中...");
    const {
      reservations,
      dataHash,
      lastReservationId: newLastReservationId,
    } = await scrapeReservations(
      page,
      startDate,
      endDate,
      lastSyncTime,
      lastReservationId
    );
    console.log("予約を取得しました");
    console.log("予約:", reservations);
    console.log("dataHash:", dataHash);
    console.log("newLastReservationId:", newLastReservationId);

    console.log("予約情報を保存中...");
    await saveReservations(
      reservations,
      haloTaroUserId,
      salonboardUserId,
      startDate,
      endDate,
      dataHash,
      newLastReservationId
    );
    console.log("予約情報の保存が完了しました");

    return `Successfully processed ${reservations.length} reservations`;
  } catch (error) {
    console.error("An error occurred during reservation sync:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

export async function syncMenus(
  haloTaroUserId: string,
  salonboardUserId: string,
  password: string
) {
  logger.setup();
  console.log("Starting Salonboard menu sync at", new Date().toISOString());

  const { browser, context } = await setupBrowser();
  const page = await context.newPage();

  try {
    await loginAndNavigate(
      page,
      context,
      haloTaroUserId,
      salonboardUserId,
      password,
      "https://salonboard.com/CNK/draft/menuEdit/"
    );
    await page.waitForSelector("#menuEditForm", { timeout: 5000 });

    console.log("メニューを取得中...");
    const { menus, dataHash } = await scrapeMenus(page);
    console.log("メニューを取得しました");
    console.log("メニュー:", menus);
    console.log("dataHash:", dataHash);

    console.log("メニュー情報を保存中...");
    await saveMenus(menus, haloTaroUserId, dataHash);
    console.log("メニュー情報の保存が完了しました");

    return `Successfully processed ${menus.length} menu items`;
  } catch (error) {
    console.error("An error occurred during menu sync:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

export async function syncStaffData(
  haloTaroUserId: string,
  salonboardUserId: string,
  password: string
) {
  logger.setup();
  console.log("Starting Salonboard staff sync at", new Date().toISOString());

  const { browser, context } = await setupBrowser();
  const page = await context.newPage();

  try {
    await loginAndNavigate(
      page,
      context,
      haloTaroUserId,
      salonboardUserId,
      password,
      "https://salonboard.com/CNK/draft/staffList/"
    );
    await page.waitForSelector('table tbody tr[name="staff_info"]', {
      timeout: 10000,
    });

    console.log("スタッフ情報を取得中...");
    const rawStaffData = await scrapeStaff(page);
    console.log("スタッフ情報を取得しました");

    const processedStaffData = processStaffData(rawStaffData, haloTaroUserId);

    console.log("スタッフ情報を同期中...");
    const result = await syncStaff(processedStaffData, haloTaroUserId);
    console.log("スタッフ情報の同期が完了しました");

    return `Successfully processed staff data. Updated: ${result.updated}, Inserted: ${result.inserted}, Deactivated: ${result.deactivated}`;
  } catch (error) {
    console.error("An error occurred during staff sync:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

export async function syncCoupons(
  haloTaroUserId: string,
  salonboardUserId: string,
  password: string
) {
  const { browser, context } = await setupBrowser();
  const page = await context.newPage();

  try {
    await loginAndNavigate(
      page,
      context,
      haloTaroUserId,
      salonboardUserId,
      password,
      "https://salonboard.com/CNK/draft/couponList/"
    );

    console.log("クーポン情報を取得中...");
    const { coupons, dataHash } = await scrapeCoupons(page);
    console.log("クーポン情報を取得しました");
    console.log("クーポン:", coupons);
    console.log("dataHash:", dataHash);

    console.log("クーポン情報を保存中...");
    const processedCoupons = processCouponData(coupons, haloTaroUserId);
    console.log("クーポン情報を処理中...");
    const result = await saveCoupons(
      processedCoupons,
      haloTaroUserId,
      dataHash
    );
    console.log("クーポン情報の保存が完了しました");
    return result;
  } catch (error) {
    console.error("Error syncing coupons:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function loginWithManualCaptcha(
  page: Page,
  userId: string,
  password: string
) {
  await page.goto("https://salonboard.com/login/");
  await page.fill('input[name="userId"]', userId);
  await page.fill('input[name="password"]', password);

  await Promise.all([page.click(".common-CNCcommon__primaryBtn.loginBtnSize")]);

  await page.waitForEvent("load");

  const isLoggedIn = await page.isVisible("#todayReserve");
  if (!isLoggedIn) {
    throw new Error("Login failed: Dashboard element not found");
  }

  console.log("ログイン完了");
}

async function checkAndRelogin(
  page: Page,
  userId: string,
  password: string,
  context: BrowserContext,
  haloTaroUserId: string
) {
  const errorSelector = ".mod_color_e50000.mod_font01.mod_align_center";
  const isErrorPresent = await page.isVisible(errorSelector);

  if (isErrorPresent) {
    console.log("セッションの期限切れを検出しました。再ログインを試みます。");
    await loginWithManualCaptcha(page, userId, password);
    await saveSession(haloTaroUserId, context);

    // 現在のURLに再度アクセス
    await page.reload({ waitUntil: "networkidle" });

    // 再ログイン後もエラーが表示される場合
    if (await page.isVisible(errorSelector)) {
      throw new Error(
        "再ログイン後もエラーが発生しています。手動での確認が必要です。"
      );
    }
  }
}
