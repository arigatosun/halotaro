// app/api/process-reservation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import { SynchronizationErrorNotification } from "@/emails/SynchronizationErrorNotification";

// Edge Function の設定
export const config = {
  runtime: 'edge',
};

// 日付形式を "YYYYMMDD" に変更するヘルパー関数
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      reservationId,
      startTime,
      endTime,
      staffName,
      customerInfo,
      rsvTermHour,
      rsvTermMinute,
      recipientEmails,
      customerFullName,
      paymentMethodId,
    } = await request.json();

    // Resend クライアントの初期化
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not set in the environment variables");
    }
    const resend = new Resend(resendApiKey);

    // sendReservationToAutomation 関数を実行
    const automationResponse = await sendReservationToAutomation({
      userId,
      reservationId,
      startTime,
      endTime,
      staffName,
      customerInfo,
      rsvTermHour,
      rsvTermMinute,
    });

    if (!automationResponse.success) {
      console.error("Automation sync failed:", automationResponse.error);

      // Sentry にエラーを送信
      Sentry.captureException(new Error(automationResponse.error), {
        contexts: {
          reservation: {
            userId: userId,
            reservationId: reservationId,
          },
        },
      });

      // サロンオーナーとスタッフへエラーメールを送信
      if (recipientEmails.length > 0) {
        try {
          await resend.emails.send({
            from: "Harotalo運営 <noreply@harotalo.com>",
            to: recipientEmails,
            subject: "【重要】予約同期エラーのお知らせ",
            react: SynchronizationErrorNotification({
              adminName: "管理者",
              errorMessage: automationResponse.error,
              reservationData: {
                customerName: customerFullName,
                startTime: startTime,
                endTime: endTime,
                staffName: staffName,
              },
            }),
          });
          console.log(
            `Error notification sent to ${recipientEmails.join(", ")}`
          );
        } catch (error) {
          console.error("Failed to send error notification:", error);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in process-reservation Edge Function:", error);
    Sentry.captureException(error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// sendReservationToAutomation 関数の定義
async function sendReservationToAutomation(reservationData: any) {
  try {
    const startDateTime = new Date(reservationData.startTime);

    const automationData = {
      user_id: reservationData.userId,
      date: formatDate(reservationData.startTime), // "YYYYMMDD" 形式
      rsv_hour: startDateTime.getHours().toString(),
      rsv_minute: String(startDateTime.getMinutes()).padStart(2, "0"),
      staff_name: reservationData.staffName,
      nm_sei_kana: reservationData.customerInfo.lastNameKana,
      nm_mei_kana: reservationData.customerInfo.firstNameKana,
      nm_sei: reservationData.customerInfo.lastNameKanji,
      nm_mei: reservationData.customerInfo.firstNameKanji,
      rsv_term_hour: reservationData.rsvTermHour,
      rsv_term_minute: reservationData.rsvTermMinute,
    };

    const FASTAPI_ENDPOINT = process.env.FASTAPI_ENDPOINT;

    if (!FASTAPI_ENDPOINT) {
      throw new Error("FASTAPI_ENDPOINT is not set in the environment variables");
    }

    const response = await fetch(FASTAPI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(automationData),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.detail || data.error || "Automation failed";
      return { success: false, error: errorMessage };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in sendReservationToAutomation:", error);
    return { success: false, error: error.message };
  }
}
