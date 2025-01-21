import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Stripe from "stripe";

// ユーザーのStripe Connect IDを取得する関数をインポート
import { getUserStripeConnectId } from "@/app/service/userService";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const { reservationId, cancellationType } = await request.json();
  const supabase = createRouteHandlerClient({ cookies });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20",
  });

  try {
    // 1. 予約情報の取得
    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", reservationId)
      .single();

    if (reservationError || !reservation) {
      throw new Error("予約が見つかりません");
    }
    console.log(`予約ID:${reservationId} の予約情報を取得しました。`);

    // 2. 支払い情報の取得
    const { data: paymentIntentData, error: paymentIntentError } =
      await supabase
        .from("payment_intents")
        .select("*")
        .eq("reservation_id", reservationId)
        .single();

    const paymentIntentExists = paymentIntentData && !paymentIntentError;

    if (paymentIntentExists) {
      console.log(
        `予約ID:${reservationId} に対応するPayment Intentが見つかりました。`
      );
    } else {
      console.log(
        `予約ID:${reservationId} に対応するPayment Intentが見つかりません。`
      );
    }

    // 3. ユーザーのStripe Connect IDを取得
    const userId = reservation.user_id;
    const stripeConnectId = await getUserStripeConnectId(userId);
    if (!stripeConnectId) {
      console.log(
        "ユーザーにStripe Connect IDが設定されていないため、返金処理は行いません。"
      );
    }

    // 4. キャンセルポリシーの取得
    //    DB上では { policies: [...], customText: "..." } という構造と想定
    const { data: policyData, error: policyError } = await supabase
      .from("cancel_policies")
      .select("policies") // カラムを指定したければ 'policies' or '*'
      .eq("user_id", userId)
      .single();

    if (policyError || !policyData || !policyData.policies) {
      throw new Error("キャンセルポリシーが見つかりません。");
    }

    // 4-1. policyData.policies の中にさらに .policies が配列としてある想定
    //      例: policyData.policies = { policies: [...], customText: "..." }
    const realPolicies = policyData.policies.policies;
    if (!realPolicies || !Array.isArray(realPolicies)) {
      console.error(
        "キャンセルポリシーが配列として取得できません:",
        policyData.policies
      );
      throw new Error("キャンセルポリシーが配列として取得できません。");
    }

    // 5. キャンセル料計算
    const now = new Date();
    const reservationDate = new Date(reservation.start_time);
    const timeDiff = reservationDate.getTime() - now.getTime();
    const daysDiff = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));

    // ポリシーを日数で昇順にソート
    const sortedPolicies = realPolicies.sort(
      (a: any, b: any) => a.days - b.days
    );
    let applicablePolicy = null;
    for (let policy of sortedPolicies) {
      if (daysDiff <= policy.days) {
        applicablePolicy = policy;
        break;
      }
    }

    const feePercentage = applicablePolicy ? applicablePolicy.feePercentage : 0;
    const cancellationFee = (reservation.total_price * feePercentage) / 100;
    const refundAmount = reservation.total_price - cancellationFee;

    console.log(`キャンセル料: ¥${cancellationFee}, 返金額: ¥${refundAmount}`);

    // 6. 支払い情報がある場合 → 返金またはオーソリキャンセル
    if (paymentIntentExists && stripeConnectId) {
      const paymentIntentId = paymentIntentData.payment_intent_id;
      const paymentStatus = paymentIntentData.status;

      console.log(
        `Payment Intent ID: ${paymentIntentId}, ステータス: ${paymentStatus}`
      );

      if (paymentStatus === "requires_capture") {
        // オーソリをキャンセル
        await stripe.paymentIntents.cancel(paymentIntentId, {
          stripeAccount: stripeConnectId,
        });
        console.log(
          `Payment Intent ID: ${paymentIntentId} のオーソリをキャンセルしました。`
        );

        // payment_intents テーブルを更新
        const { error: updateError } = await supabase
          .from("payment_intents")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentIntentData.id);

        if (updateError) throw updateError;
        console.log(
          `Payment Intent ID: ${paymentIntentId} のステータスを 'canceled' に更新しました。`
        );
      } else if (paymentStatus === "succeeded") {
        if (refundAmount > 0) {
          // 返金処理
          await stripe.refunds.create(
            {
              payment_intent: paymentIntentId,
              amount: Math.round(refundAmount), // 円の場合、そのまま整数でOK
            },
            {
              stripeAccount: stripeConnectId,
            }
          );
          console.log(
            `Payment Intent ID: ${paymentIntentId} に対して ¥${refundAmount} の返金を行いました。`
          );

          // payment_intents テーブル更新
          const { error: updateError } = await supabase
            .from("payment_intents")
            .update({
              status: "refunded",
              updated_at: new Date().toISOString(),
            })
            .eq("id", paymentIntentData.id);

          if (updateError) throw updateError;
          console.log(
            `Payment Intent ID: ${paymentIntentId} のステータスを 'refunded' に更新しました。`
          );
        } else {
          // 返金額が0円なら返金処理スキップ
          console.log("返金額が¥0のため、返金処理をスキップしました。");

          const { error: updateError } = await supabase
            .from("payment_intents")
            .update({
              status: "cancellation_fee_charged",
              updated_at: new Date().toISOString(),
            })
            .eq("id", paymentIntentData.id);

          if (updateError) throw updateError;
          console.log(
            `Payment Intent ID: ${paymentIntentId} のステータスを 'cancellation_fee_charged' に更新しました。`
          );
        }
      } else {
        console.log(
          `Payment Intent ID: ${paymentIntentId} はキャンセルや返金の対象外のステータスです。`
        );
      }
    } else {
      // 支払い情報が存在しない場合 → 返金処理なし、予約ステータスだけ更新
      console.log(
        "支払い情報が見つからないため返金処理は行わず、ステータス更新のみ実施します。"
      );
    }

    // 7. 予約ステータスの更新
    const newStatus =
      cancellationType === "same_day_cancellation"
        ? "same_day_cancelled"
        : "cancelled";

    const { error: reservationUpdateError } = await supabase
      .from("reservations")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservationId);

    if (reservationUpdateError) throw reservationUpdateError;
    console.log(
      `予約ID:${reservationId} のステータスを '${newStatus}' に更新しました。`
    );

    return NextResponse.json(
      { message: "予約が正常にキャンセルされました" },
      { status: 200 }
    );
  } catch (error) {
    console.error("予約キャンセル中のエラー:", error);
    return NextResponse.json(
      { error: "予約のキャンセルに失敗しました" },
      { status: 500 }
    );
  }
}
