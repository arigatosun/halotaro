import { chromium, Browser, Page, BrowserContext } from "playwright";
import fs from "fs";
import path from "path";
import { scrapeReservations } from "./scrapeReservation";
import { saveReservations } from "./save-reservations";

const SESSION_FILE = path.join(process.cwd(), "session.json");
console.log("SESSION_FILE:", SESSION_FILE);

async function saveSession(context: BrowserContext) {
  const cookies = await context.cookies();
  const validCookies = cookies.filter(
    (cookie) =>
      cookie &&
      typeof cookie.name === "string" &&
      typeof cookie.value === "string"
  );
  fs.writeFileSync(SESSION_FILE, JSON.stringify(validCookies, null, 2));
}

async function loadSession(context: BrowserContext): Promise<boolean> {
  if (fs.existsSync(SESSION_FILE)) {
    const cookiesData = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
    console.log("Loaded cookies:", cookiesData); // デバッグ用

    // クッキーの形式を確認し、必要に応じて修正
    const validCookies = cookiesData.filter(
      (cookie: any) =>
        cookie &&
        typeof cookie.name === "string" &&
        typeof cookie.value === "string"
    );

    if (validCookies.length > 0) {
      await context.addCookies(validCookies);
      return true;
    } else {
      console.log("No valid cookies found");
      return false;
    }
  }
  return false;
}

export async function runSalonboardIntegration(
  userId: string,
  password: string
) {
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

  const page = await context.newPage();

  try {
    const sessionLoaded = await loadSession(context);
    if (sessionLoaded) {
      console.log("保存された認証情報を使用してブラウザを開きました。");

      if (await page.isVisible('input[name="userId"]')) {
        console.log("セッションが無効になっています。再ログインが必要です。");
        await loginWithManualCaptcha(page, userId, password);
        await saveSession(context);
      }
    } else {
      console.log("新規ログインを行います。");
      await loginWithManualCaptcha(page, userId, password);
      await saveSession(context);
    }

    // ログイン成功後、予約一覧ページに明示的に遷移
    await page.goto("https://salonboard.com/KLP/reserve/reserveList/init", {
      waitUntil: "networkidle",
    });
    await page.waitForSelector("#reserveList", { timeout: 10000 });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 61);

    console.log("予約を取得中...");
    const reservations = await scrapeReservations(page, startDate, endDate);
    console.log("予約を取得しました");
    console.log(reservations);

    // 新しく追加するコード
    console.log("予約情報を保存中...");
    await saveReservations(reservations, userId);
    console.log("予約情報の保存が完了しました");

    return `Successfully processed ${reservations.length} reservations`;
  } catch (error) {
    console.error("An error occurred:", error);
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

  console.log("CAPTCHAが表示された場合は、手動で解決してください。");
  console.log("解決後、ログインボタンを押してください。");

  await page.waitForEvent("load");

  const isLoggedIn = await page.isVisible("#todayReserve");
  if (!isLoggedIn) {
    throw new Error("Login failed: Dashboard element not found");
  }

  console.log("ログイン完了");
}

// この関数を呼び出してインテグレーションを実行
// runSalonboardIntegration("yourUserId", "yourPassword");
