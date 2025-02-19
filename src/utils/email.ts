// src/utils/email.ts

import { Resend } from "resend";
import { ReservationConfirmation } from "@/emails/ReservationConfirmation";
import { NewReservationNotification } from "@/emails/NewReservationNotification";
import { SynchronizationErrorNotification } from "@/emails/SynchronizationErrorNotification";
import { generateCancelUrl } from "@/utils/url";

// Resendクライアントの初期化
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is not set in the environment variables");
}
const resend = new Resend(resendApiKey);

/**
 * 顧客とサロン運営者に予約完了メールを送信
 */
export async function sendReservationEmails(
  customerInfo: any,
  reservationDetails: any,
  recipientEmails: string[],
  baseUrl: string
) {
  const cancelUrl = generateCancelUrl(
    baseUrl,
    reservationDetails.reservationId
  );

  // 顧客へのメール送信
  await resend.emails.send({
    from: "Harotalo運営 <noreply@harotalo.com>",
    to: customerInfo.email,
    subject: "予約完了のお知らせ",
    react: ReservationConfirmation({
      customerName: reservationDetails.customerFullName,
      dateTime: new Date(reservationDetails.startTime).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
      }),
      endTime: new Date(reservationDetails.endTime).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
      }),
      staffName: reservationDetails.staffName,
      serviceName: reservationDetails.serviceName,
      totalPrice: reservationDetails.totalPrice,
      reservationId: reservationDetails.reservationId,
      cancelUrl: cancelUrl,
    }),
  });

  // サロン運営者とスタッフへのメール送信
  if (recipientEmails.length > 0) {
    await resend.emails.send({
      from: "Harotalo運営 <noreply@harotalo.com>",
      to: recipientEmails,
      subject: "新規予約のお知らせ",
      react: NewReservationNotification({
        customerName: reservationDetails.customerFullName,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        dateTime: new Date(reservationDetails.startTime).toLocaleString(
          "ja-JP",
          {
            timeZone: "Asia/Tokyo",
          }
        ),
        endTime: new Date(reservationDetails.endTime).toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo",
        }),
        staffName: reservationDetails.staffName,
        serviceName: reservationDetails.serviceName,
        totalPrice: reservationDetails.totalPrice,
      }),
    });
  }
}

/**
 * 予約同期エラー時にエラーメールを送信
 */
export async function sendSyncErrorEmail(
  recipientEmails: string[],
  errorMessage: string,
  reservationData: any
) {
  if (recipientEmails.length > 0) {
    await resend.emails.send({
      from: "Harotalo運営 <noreply@harotalo.com>",
      to: recipientEmails,
      subject: "【重要】予約同期エラーのお知らせ",
      react: SynchronizationErrorNotification({
        adminName: "管理者",
        errorMessage: errorMessage,
        reservationData: {
          customerName: reservationData.customerName,
          startTime: reservationData.startTime,
          endTime: reservationData.endTime,
          staffName: reservationData.staffName,
        },
      }),
    });
  }
}
