// src/utils/automation.ts

import moment from "moment";

/**
 * 日付形式を "YYYYMMDD" に変更
 */
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

/**
 * 内部APIに予約情報を送信する関数
 */
export async function sendReservationToAutomation(reservationData: any) {
  try {
    // 内部APIのURL（環境変数から取得）
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    // 開始日時のDateオブジェクトを作成
    const startDateTime = new Date(reservationData.startTime);

    // 内部APIに渡すデータを作成
    const automationData = {
      user_id: reservationData.userId,
      date: formatDate(reservationData.startTime), // "YYYYMMDD" 形式に変更
      rsv_hour: startDateTime.getHours().toString(),
      rsv_minute: String(startDateTime.getMinutes()).padStart(2, "0"), // 常に2桁で、0分の場合は "00"
      staff_name: reservationData.staffName,
      nm_sei_kana: reservationData.customerInfo.lastNameKana,
      nm_mei_kana: reservationData.customerInfo.firstNameKana,
      nm_sei: reservationData.customerInfo.lastNameKanji,
      nm_mei: reservationData.customerInfo.firstNameKanji,
      rsv_term_hour: reservationData.rsvTermHour,
      rsv_term_minute: reservationData.rsvTermMinute,
    };

    // 内部APIにリクエストを送信
    const response = await fetch(`${apiUrl}/api/salonboard-automation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(automationData),
    });

    const data = await response.json();

    if (!response.ok) {
      // エラーメッセージを取得
      const errorMessage = data.detail || data.error || "Automation failed";
      return { success: false, error: errorMessage };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 内部APIに予約情報を送信する関数
 */
export async function sendStaffScheduleToAutomation(staffScheduleData: any) {
  try {
    // 内部APIのURL（環境変数から取得）
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    // 開始日時のDateオブジェクトを作成
    const startDateTime = new Date(staffScheduleData.startTime);

    // 内部APIに渡すデータを作成
    const automationData = {
      user_id: staffScheduleData.userId,
      date: formatDate(staffScheduleData.startTime), // "YYYYMMDD" 形式に変更
      rsv_hour: startDateTime.getHours().toString(),
      rsv_minute: String(startDateTime.getMinutes()).padStart(2, "0"), // 常に2桁で、0分の場合は "00"
      staff_name: staffScheduleData.staffName,
      nm_sei_kana: staffScheduleData.customerInfo.lastNameKana,
      nm_mei_kana: staffScheduleData.customerInfo.firstNameKana,
      nm_sei: staffScheduleData.customerInfo.lastNameKanji,
      nm_mei: staffScheduleData.customerInfo.firstNameKanji,
      rsv_term_hour: staffScheduleData.rsvTermHour,
      rsv_term_minute: staffScheduleData.rsvTermMinute,
    };

    // 内部APIにリクエストを送信
    const response = await fetch(`${apiUrl}/api/salonboard-automation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(automationData),
    });

    const data = await response.json();

    if (!response.ok) {
      // エラーメッセージを取得
      const errorMessage = data.detail || data.error || "Automation failed";
      return { success: false, error: errorMessage };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
