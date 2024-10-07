"use strict";
// syncReservationToSalonboardHelpers.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillReservationForm = fillReservationForm;
exports.updateSyncStatus = updateSyncStatus;
const supabaseClient_1 = require("../../src/lib/supabaseClient");
const logger_1 = require("../logger");
const date_fns_1 = require("date-fns");
async function fillReservationForm(page, reservationData) {
    // 日時の設定
    const startTime = new Date(reservationData.startTime);
    const endTime = new Date(reservationData.endTime);
    console.log(reservationData);
    await page.selectOption("#jsiRsvHour", (0, date_fns_1.format)(startTime, "HH"));
    await page.selectOption("#jsiRsvMinute", (0, date_fns_1.format)(startTime, "mm"));
    // 所要時間の設定
    const durationInMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;
    if (minutes != 0) {
        await page.selectOption("#jsiRsvTermMinute", String(minutes));
    }
    await page.selectOption("#jsiRsvTermHour", String(hours));
    // スタッフの選択
    const staffId = await findStaffIdByName(page, reservationData.staffName);
    if (staffId) {
        await page.selectOption('select[name="staffIdList"]', staffId);
    }
    else {
        logger_1.logger.error(`Staff not found: ${reservationData.staffName}`);
        throw new Error(`Staff not found: ${reservationData.staffName}`);
    }
    // 顧客情報の入力
    await page.fill("#nmSeiKana", reservationData.customerInfo.kana.split(" ")[0]);
    await page.fill("#nmMeiKana", reservationData.customerInfo.kana.split(" ")[1]);
    await page.fill("#nmSei", reservationData.customerInfo.name.split(" ")[0]);
    await page.fill("#nmMei", reservationData.customerInfo.name.split(" ")[1]);
    await page.fill("#tel", reservationData.customerInfo.phone);
    // メモの入力（オプション）
    if (reservationData.memo) {
        await page.fill("#rsvEtc", reservationData.memo);
    }
}
async function updateSyncStatus(reservationId, success, salonboardReservationId, errorMessage) {
    const { error } = await supabaseClient_1.supabase.from("salonboard_reservation_sync").upsert({
        reservation_id: reservationId,
        sync_status: success ? "synced" : "failed",
        salonboard_reservation_id: salonboardReservationId,
        last_sync_attempt: new Date().toISOString(),
        error_message: errorMessage,
    });
    if (error) {
        logger_1.logger.error(`同期状態の更新中にエラーが発生しました: ${error.message}`);
    }
    else {
        logger_1.logger.log(`予約 ${reservationId} の同期状態を更新しました`);
    }
}
async function findStaffIdByName(page, staffName) {
    const options = await page.$$('select[name="staffIdList"] option');
    for (const option of options) {
        const value = await option.getAttribute("value");
        const text = await option.innerText();
        const cleanedText = text.replace(/^[×○]\s*/, "").trim();
        if (cleanedText === staffName) {
            return value || null;
        }
    }
    return null;
}
