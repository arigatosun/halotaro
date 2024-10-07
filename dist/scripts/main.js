"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSession = saveSession;
exports.loadSession = loadSession;
exports.syncReservations = syncReservations;
exports.syncMenus = syncMenus;
exports.syncStaffData = syncStaffData;
exports.syncCoupons = syncCoupons;
exports.syncReservationToSalonboard = syncReservationToSalonboard;
// main.ts
const playwright_1 = require("playwright");
const save_reservations_1 = require("./save-reservations");
const logger_1 = require("./logger");
const supabase_js_1 = require("@supabase/supabase-js");
const save_menu_1 = require("./menu/save-menu");
const scrapeMenus_1 = require("./menu/scrapeMenus");
const scrapeReservation_1 = require("./scrapeReservation");
const scrapeStaff_1 = require("./staff/scrapeStaff");
const processStaffData_1 = require("./staff/processStaffData");
const syncStaff_1 = require("./staff/syncStaff");
const scrapeCoupons_1 = require("./coupon/scrapeCoupons");
const processCouponData_1 = require("./coupon/processCouponData");
const save_coupons_1 = require("./coupon/save-coupons");
const encryption_1 = require("../src/utils/encryption");
const syncReseravtionToSalonboardHelpers_1 = require("./harotaro-to-salonboard/syncReseravtionToSalonboardHelpers");
const date_fns_1 = require("date-fns");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function saveSession(userId, context) {
    const cookies = await context.cookies();
    const sessionData = { cookies };
    const encryptedSession = (0, encryption_1.encrypt)(JSON.stringify(sessionData));
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後
    const { error } = await supabase.from("salonboard_sessions").upsert({
        user_id: userId,
        session_data: encryptedSession,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
    });
    if (error)
        throw error;
}
async function loadSession(userId, context) {
    const { data, error } = await supabase
        .from("salonboard_sessions")
        .select("session_data, expires_at")
        .eq("user_id", userId)
        .single();
    if (error || !data)
        return false;
    if (new Date(data.expires_at) < new Date()) {
        // セッションの有効期限切れ
        await supabase.from("salonboard_sessions").delete().eq("user_id", userId);
        return false;
    }
    const sessionData = JSON.parse((0, encryption_1.decrypt)(data.session_data));
    await context.addCookies(sessionData.cookies);
    return true;
}
async function setupBrowser() {
    const browser = await playwright_1.chromium.launch({
        headless: false,
        channel: "chrome", // ここでChromeを使用
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-infobars",
            "--window-position=0,0",
            "--ignore-certifcate-errors",
            "--ignore-certifcate-errors-spki-list",
            "--disable-blink-features=AutomationControlled", // 追加
            "--start-maximized", // 追加
        ],
    });
    const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        hasTouch: false, // デスクトップ環境に合わせて変更
        isMobile: false, // デスクトップ環境に合わせて変更
        locale: "ja-JP",
        timezoneId: "Asia/Tokyo",
        geolocation: { longitude: 139.7594549, latitude: 35.6828387 },
        permissions: ["geolocation"],
    });
    // navigator.webdriver を偽装してヘッドレス検知を回避
    await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", {
            get: () => false,
        });
    });
    return { browser, context };
}
async function loginAndNavigate(page, context, haloTaroUserId, salonboardUserId, password, url) {
    const sessionLoaded = await loadSession(haloTaroUserId, context);
    if (sessionLoaded) {
        console.log("保存された認証情報を使用してブラウザを開きました。");
        if (await page.isVisible('input[name="userId"]')) {
            console.log("セッションが無効になっています。再ログインが必要です。");
            await loginWithManualCaptcha(page, salonboardUserId, password);
            await saveSession(haloTaroUserId, context);
        }
    }
    else {
        console.log("新規ログインを行います。");
        await loginWithManualCaptcha(page, salonboardUserId, password);
        await saveSession(haloTaroUserId, context);
    }
    await page.goto(url, { waitUntil: "networkidle" });
    await checkAndRelogin(page, salonboardUserId, password, context, haloTaroUserId);
}
// サロンボードのログイン画面にログインする
async function loginWithManualCaptcha(page, userId, password) {
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
async function checkAndRelogin(page, userId, password, context, haloTaroUserId) {
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
            throw new Error("再ログイン後もエラーが発生しています。手動での確認が必要です。");
        }
    }
}
// サロンボードの予約情報を同期する
async function syncReservations(haloTaroUserId, salonboardUserId, password) {
    logger_1.logger.log("予約情報同期の開始 user_id:", haloTaroUserId);
    logger_1.logger.log(new Date().toISOString());
    const { browser, context } = await setupBrowser();
    const page = await context.newPage();
    try {
        await loginAndNavigate(page, context, haloTaroUserId, salonboardUserId, password, "https://salonboard.com/KLP/reserve/reserveList/init");
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
        const { reservations, dataHash, lastReservationId: newLastReservationId, } = await (0, scrapeReservation_1.scrapeReservations)(page, startDate, endDate, lastSyncTime, lastReservationId);
        console.log("予約を取得しました");
        console.log("予約:", reservations);
        console.log("dataHash:", dataHash);
        console.log("newLastReservationId:", newLastReservationId);
        console.log("予約情報を保存中...");
        await (0, save_reservations_1.saveReservations)(reservations, haloTaroUserId, salonboardUserId, startDate, endDate, dataHash, newLastReservationId);
        console.log("予約情報の保存が完了しました");
        return `Successfully processed ${reservations.length} reservations`;
    }
    catch (error) {
        console.error("An error occurred during reservation sync:", error);
        throw error;
    }
    finally {
        await browser.close();
    }
}
// サロンボードのメニュー情報を同期する
async function syncMenus(haloTaroUserId, salonboardUserId, password) {
    logger_1.logger.log("メニューの同期: user_id", haloTaroUserId);
    logger_1.logger.log(new Date().toISOString());
    const { browser, context } = await setupBrowser();
    const page = await context.newPage();
    try {
        await loginAndNavigate(page, context, haloTaroUserId, salonboardUserId, password, "https://salonboard.com/CNK/draft/menuEdit/");
        await page.waitForSelector("#menuEditForm", { timeout: 5000 });
        console.log("メニューを取得中...");
        const { menus, dataHash } = await (0, scrapeMenus_1.scrapeMenus)(page);
        console.log("メニューを取得しました");
        console.log("メニュー:", menus);
        console.log("dataHash:", dataHash);
        console.log("メニュー情報を保存中...");
        await (0, save_menu_1.saveMenus)(menus, haloTaroUserId, dataHash);
        console.log("メニュー情報の保存が完了しました");
        return `Successfully processed ${menus.length} menu items`;
    }
    catch (error) {
        console.error("An error occurred during menu sync:", error);
        throw error;
    }
    finally {
        await browser.close();
    }
}
// サロンボードのスタッフ情報を同期する
async function syncStaffData(haloTaroUserId, salonboardUserId, password) {
    logger_1.logger.log("スタッフ情報同期 user_id:", haloTaroUserId);
    logger_1.logger.log(new Date().toISOString());
    const { browser, context } = await setupBrowser();
    const page = await context.newPage();
    try {
        await loginAndNavigate(page, context, haloTaroUserId, salonboardUserId, password, "https://salonboard.com/CNK/draft/staffList/");
        await page.waitForSelector('table tbody tr[name="staff_info"]', {
            timeout: 10000,
        });
        console.log("スタッフ情報を取得中...");
        const rawStaffData = await (0, scrapeStaff_1.scrapeStaff)(page);
        console.log("スタッフ情報を取得しました");
        const processedStaffData = (0, processStaffData_1.processStaffData)(rawStaffData, haloTaroUserId);
        console.log("スタッフ情報を同期中...");
        const result = await (0, syncStaff_1.syncStaff)(processedStaffData, haloTaroUserId);
        console.log("スタッフ情報の同期が完了しました");
        return `Successfully processed staff data. Updated: ${result.updated}, Inserted: ${result.inserted}, Deactivated: ${result.deactivated}`;
    }
    catch (error) {
        console.error("An error occurred during staff sync:", error);
        throw error;
    }
    finally {
        await browser.close();
    }
}
// サロンボードのクーポン情報を同期する
async function syncCoupons(haloTaroUserId, salonboardUserId, password) {
    const { browser, context } = await setupBrowser();
    const page = await context.newPage();
    try {
        await loginAndNavigate(page, context, haloTaroUserId, salonboardUserId, password, "https://salonboard.com/CNK/draft/couponList/");
        console.log("クーポン情報を取得中...");
        const { coupons, dataHash } = await (0, scrapeCoupons_1.scrapeCoupons)(page);
        console.log("クーポン情報を取得しました");
        console.log("クーポン:", coupons);
        console.log("dataHash:", dataHash);
        console.log("クーポン情報を保存中...");
        const processedCoupons = (0, processCouponData_1.processCouponData)(coupons, haloTaroUserId);
        console.log("クーポン情報を処理中...");
        const result = await (0, save_coupons_1.saveCoupons)(processedCoupons, haloTaroUserId, dataHash);
        console.log("クーポン情報の保存が完了しました");
        return result;
    }
    catch (error) {
        console.error("Error syncing coupons:", error);
        throw error;
    }
    finally {
        await browser.close();
    }
}
async function syncReservationToSalonboard(haloTaroUserId, salonboardUserId, password, reservationId, reservationData) {
    logger_1.logger.log("予約情報のサロンボードへの同期開始 user_id:", haloTaroUserId, "reservation_id:", reservationId);
    logger_1.logger.log(new Date().toISOString());
    const { browser, context } = await setupBrowser();
    const page = await context.newPage();
    try {
        // サロンボードにログインし、スケジュールページに移動
        await loginAndNavigate(page, context, haloTaroUserId, salonboardUserId, password, "https://salonboard.com/KLP/schedule/salonSchedule/");
        // スタッフ名に基づいてスタッフIDを取得
        const staffId = await getStaffIdByName(page, reservationData.staffName);
        if (!staffId) {
            logger_1.logger.error("スタッフが見つかりませんでした。", reservationData.staffName);
            logger_1.logger.error("スタッフが見つかりませんでした。, user_id:", haloTaroUserId);
            logger_1.logger.error("スタッフが見つかりませんでした。, salonboard_user_id:", salonboardUserId);
            throw new Error(`スタッフ "${reservationData.staffName}" が見つかりませんでした。`);
        }
        // 予約ページに移動
        const startTime = new Date(reservationData.startTime);
        const reserveUrl = `https://salonboard.com/KLP/reserve/ext/extReserveRegist/?staffId=${staffId}&date=${(0, date_fns_1.format)(startTime, "yyyyMMdd")}&rsvHour=${(0, date_fns_1.format)(startTime, "HH")}&rsvMinute=00&rlastupdate=20240919182008`;
        await page.goto(reserveUrl);
        // 予約フォームを入力
        await (0, syncReseravtionToSalonboardHelpers_1.fillReservationForm)(page, reservationData);
        console.log("予約を送信中...");
        // 予約を送信
        await page.evaluate(() => {
            const button = document.querySelector("#regist");
            button.click();
        });
        await page.waitForTimeout(300000);
        return "予約ページへの遷移が完了しました。";
    }
    catch (error) {
        logger_1.logger.error("サロンボードへの予約同期中にエラーが発生しました:", error);
        throw error;
    }
    finally {
        await browser.close();
    }
}
function normalizeString(str) {
    return str
        .replace(/\s+/g, "") // すべての空白文字（半角、全角、タブ、改行など）を削除
        .replace(/　/g, "") // 全角スペースを削除
        .toLowerCase() // 小文字に変換
        .normalize("NFKC"); // Unicode正規化（全角英数字を半角に変換など）
}
async function getStaffIdByName(page, staffName) {
    const normalizedStaffName = normalizeString(staffName);
    // スタッフリストを取得
    const staffList = await page.$$("li.scheduleMainHead");
    for (const staffElement of staffList) {
        // スタッフの名前を取得
        const nameElement = await staffElement.$(".scheduleLinkInner");
        if (!nameElement)
            continue;
        const name = await nameElement.innerText();
        const normalizedName = normalizeString(name);
        // 正規化した名前が一致した場合、IDを取得して返す
        if (normalizedName === normalizedStaffName) {
            const idAttribute = await staffElement.getAttribute("id");
            if (idAttribute) {
                const match = idAttribute.match(/STAFF_(\w+)_/);
                if (match) {
                    return match[1];
                }
            }
        }
    }
    // 一致するスタッフが見つからなかった場合
    return null;
}
