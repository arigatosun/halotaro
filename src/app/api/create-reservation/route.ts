// app/api/create-reservation/route.ts
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { CreateReservationBody } from "@/lib/types";
import {
  validateRequestBody,
  fetchStaffName,
  fetchMenuOrCouponInfo,
  fetchRecipientEmails,
  getMaxCancelPolicyDays,
  createReservation,
  handlePaymentIntents,
  updateStripeCustomers,
  sendReservationEmails,
} from "@/app/service/reservationService";

/**
 * API ルート:
 * POST /api/create-reservation
 */
export async function POST(request: Request) {
  try {
    // ---- リクエストボディをパース ----
    const body = (await request.json()) as CreateReservationBody;
    // 必須項目チェック
    validateRequestBody(body);

    // ---- スタッフ名, メニュー/クーポン情報 ----
    const staffName = await fetchStaffName(body.staffId);
    const { duration, serviceName } = await fetchMenuOrCouponInfo(body.menuId);

    // ---- 通知先メールアドレス一覧 ----
    const recipientEmails = await fetchRecipientEmails(body.userId);

    // ---- キャンセルポリシー最大日数 ----
    const maxCancelPolicyDays = await getMaxCancelPolicyDays(body.userId);

    // ---- 予約作成 (RPC) ----
    const { reservationId, reservationCustomerId } = await createReservation(
      body
    );

    // ---- paymentIntents 更新/作成 ----
    await handlePaymentIntents(
      reservationId,
      body.startTime,
      maxCancelPolicyDays,
      body.paymentInfo,
      body.userId,
      body.totalPrice
    );

    // ---- stripe_customers 更新 (任意) ----
    if (body.paymentMethodId) {
      await updateStripeCustomers(reservationId, body.paymentMethodId);
    } else {
      console.log("No paymentMethodId; skipping stripe_customers update");
    }

    // ---- メール送信 ----
    try {
      await sendReservationEmails({
        reservationId,
        customerInfo: body.customerInfo,
        startTime: body.startTime,
        endTime: body.endTime,
        staffName,
        serviceName,
        totalPrice: body.totalPrice,
        recipientEmails,
      });
      console.log("Emails sent successfully");
    } catch (emailError) {
      // メール送信失敗しても予約自体は作成成功しているため、ログのみ
      console.error("Error sending emails:", emailError);
    }

    // ---- 正常終了レスポンス ----
    return NextResponse.json({
      success: true,
      reservationId,
      reservationCustomerId,
      stripeCustomerUpdated: !!(reservationId && body.paymentMethodId),
    });
  } catch (error: any) {
    // createReservation 内で一意制約違反などを投げた場合
    if (error?.code === 409) {
      return NextResponse.json(
        { error: error.error, details: error.details },
        { status: 409 }
      );
    }

    // その他のエラー
    console.error("Error saving reservation:", error);
    return NextResponse.json(
      {
        error: error.message || "Unknown error",
        details: {
          errorCode: error.code,
          errorDetails: error.details,
        },
      },
      { status: 400 }
    );
  }
}
