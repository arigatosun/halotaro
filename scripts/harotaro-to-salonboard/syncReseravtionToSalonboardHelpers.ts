// syncReservationToSalonboardHelpers.ts

import { Page } from "playwright";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "../logger";
import { ProcessedReservation } from "@/types/reservations";

export async function fillReservationForm(
  page: Page,
  reservation: ProcessedReservation
) {
  logger.log("サロンボード予約フォームの入力を開始");

  // 日付と時間の入力
  await page.fill('input[name="year"]', reservation.start_time.split("-")[0]);
  await page.fill('input[name="month"]', reservation.start_time.split("-")[1]);
  await page.fill(
    'input[name="day"]',
    reservation.start_time.split("-")[2].split("T")[0]
  );
  await page.selectOption(
    'select[name="hour"]',
    reservation.start_time.split("T")[1].split(":")[0]
  );
  await page.selectOption(
    'select[name="minute"]',
    reservation.start_time.split("T")[1].split(":")[1]
  );

  // スタッフの選択
  await page.selectOption('select[name="staffId"]', reservation.staff_id || "");

  // メニューの選択
  await page.selectOption('select[name="menuId"]', String(reservation.menu_id));

  // その他の必要な情報を入力
  // 注意: 実際のフォーム構造に合わせて適宜調整が必要です

  logger.log("予約フォームの入力が完了しました");
}

export async function submitReservation(page: Page): Promise<string> {
  logger.log("サロンボード予約の送信を開始");

  await Promise.all([
    page.click("#submitButton"),
    page.waitForNavigation({ waitUntil: "networkidle" }),
  ]);

  // 予約完了ページから予約IDを取得
  // 注意: 実際の予約完了ページの構造に合わせて適宜調整が必要です
  const salonboardReservationId = await page.$eval(
    ".reservation-id",
    (el) => el.textContent
  );

  if (!salonboardReservationId) {
    throw new Error("サロンボード予約IDの取得に失敗しました");
  }

  logger.log(
    `予約が正常に送信されました。サロンボード予約ID: ${salonboardReservationId}`
  );
  return salonboardReservationId;
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
