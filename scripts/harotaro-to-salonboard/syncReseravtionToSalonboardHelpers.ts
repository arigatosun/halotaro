// syncReservationToSalonboardHelpers.ts

import { Page } from "playwright";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "../logger";
import { format } from "date-fns";

export async function fillReservationForm(page: Page, reservationData: any) {
  // 日時の設定
  const startTime = new Date(reservationData.startTime);
  const endTime = new Date(reservationData.endTime);

  console.log(reservationData);

  await page.selectOption("#jsiRsvHour", format(startTime, "HH"));
  await page.selectOption("#jsiRsvMinute", format(startTime, "mm"));

  // 所要時間の設定
  const durationInMinutes =
    (endTime.getTime() - startTime.getTime()) / (1000 * 60);
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
  } else {
    logger.error(`Staff not found: ${reservationData.staffName}`);
    throw new Error(`Staff not found: ${reservationData.staffName}`);
  }

  // 顧客情報の入力
  await page.fill(
    "#nmSeiKana",
    reservationData.customerInfo.kana.split(" ")[0]
  );
  await page.fill(
    "#nmMeiKana",
    reservationData.customerInfo.kana.split(" ")[1]
  );
  await page.fill("#nmSei", reservationData.customerInfo.name.split(" ")[0]);
  await page.fill("#nmMei", reservationData.customerInfo.name.split(" ")[1]);
  await page.fill("#tel", reservationData.customerInfo.phone);

  // メモの入力（オプション）
  if (reservationData.memo) {
    await page.fill("#rsvEtc", reservationData.memo);
  }
}

export async function updateSyncStatus(
  reservationId: string,
  success: boolean,
  salonboardReservationId: string | null,
  errorMessage?: string
) {
  const { error } = await supabase.from("salonboard_reservation_sync").upsert({
    reservation_id: reservationId,
    sync_status: success ? "synced" : "failed",
    salonboard_reservation_id: salonboardReservationId,
    last_sync_attempt: new Date().toISOString(),
    error_message: errorMessage,
  });

  if (error) {
    logger.error(`同期状態の更新中にエラーが発生しました: ${error.message}`);
  } else {
    logger.log(`予約 ${reservationId} の同期状態を更新しました`);
  }
}

async function findStaffIdByName(
  page: Page,
  staffName: string
): Promise<string | null> {
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
