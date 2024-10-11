import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

// ユーザーのStripe Connect IDを取得する関数をインポート
import { getUserStripeConnectId } from '@/app/service/userService';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const { reservationId, cancellationType } = await request.json();
  const supabase = createRouteHandlerClient({ cookies });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
  });

  try {
    // 予約情報の取得
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservation) {
      throw new Error('予約が見つかりません');
    }
    console.log(`予約ID:${reservationId} の予約情報を取得しました。`);

    // 支払い情報の取得
    const { data: paymentIntentData, error: paymentIntentError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('reservation_id', reservationId)
      .single();

    const paymentIntentExists = paymentIntentData && !paymentIntentError;

    if (paymentIntentExists) {
      console.log(`予約ID:${reservationId} に対応するPayment Intentが見つかりました。`);
    } else {
      console.log(`予約ID:${reservationId} に対応するPayment Intentが見つかりません。`);
    }

    // ユーザーのStripe Connect IDを取得
    const userId = reservation.user_id;
    const stripeConnectId = await getUserStripeConnectId(userId);
    if (!stripeConnectId) {
      throw new Error('ユーザーのStripe Connect IDが見つかりません');
    }
    console.log(`ユーザーID:${userId} のStripe Connect IDを取得しました。`);

    // キャンセルポリシーの取得
    const { data: policyData, error: policyError } = await supabase
      .from('cancel_policies')
      .select('policies')
      .eq('user_id', reservation.user_id)
      .single();

    if (policyError || !policyData || !policyData.policies) {
      throw new Error('キャンセルポリシーが見つかりません。');
    }

    // キャンセル料の計算
    const now = new Date();
    const reservationDate = new Date(reservation.start_time);
    const timeDiff = reservationDate.getTime() - now.getTime();
    const daysDiff = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));

    // ポリシーを日数で昇順にソート
    const sortedPolicies = policyData.policies.sort((a: any, b: any) => a.days - b.days);

    // 適用可能なポリシーを見つける
    let applicablePolicy = null;
    for (let policy of sortedPolicies) {
      if (daysDiff <= policy.days) {
        applicablePolicy = policy;
        break; // 適用可能なポリシーを見つけたらループを終了
      }
    }

    const feePercentage = applicablePolicy ? applicablePolicy.feePercentage : 0;
    const cancellationFee = (reservation.total_price * feePercentage) / 100;
    const refundAmount = reservation.total_price - cancellationFee;

    console.log(`キャンセル料を計算しました。キャンセル料: ¥${cancellationFee}, 返金額: ¥${refundAmount}`);

    // 支払い情報が存在する場合の処理
    if (paymentIntentExists) {
      const paymentIntentId = paymentIntentData.payment_intent_id;
      const paymentStatus = paymentIntentData.status;

      console.log(`Payment Intent ID: ${paymentIntentId}, ステータス: ${paymentStatus}`);

      // 支払いステータスに応じた処理
      if (paymentStatus === 'requires_capture') {
        // オーソリをキャンセル
        await stripe.paymentIntents.cancel(paymentIntentId, {
          stripeAccount: stripeConnectId,
        });
        console.log(`Payment Intent ID: ${paymentIntentId} のオーソリをキャンセルしました。`);

        // 支払い情報の更新
        const { error: updateError } = await supabase
          .from('payment_intents')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentIntentData.id);

        if (updateError) throw updateError;
        console.log(`Payment Intent ID: ${paymentIntentId} のステータスを 'canceled' に更新しました。`);
      } else if (paymentStatus === 'succeeded') {
        if (refundAmount > 0) {
          // 返金処理
          await stripe.refunds.create(
            {
              payment_intent: paymentIntentId,
              amount: Math.round(refundAmount), // 金額は最小通貨単位（例：円の場合は円単位）
            },
            {
              stripeAccount: stripeConnectId,
            }
          );
          console.log(`Payment Intent ID: ${paymentIntentId} に対して ¥${refundAmount} の返金を行いました。`);

          // 支払い情報の更新
          const { error: updateError } = await supabase
            .from('payment_intents')
            .update({
              status: 'refunded',
              updated_at: new Date().toISOString(),
            })
            .eq('id', paymentIntentData.id);

          if (updateError) throw updateError;
          console.log(`Payment Intent ID: ${paymentIntentId} のステータスを 'refunded' に更新しました。`);
        } else {
          console.log(`返金額が¥0のため、返金処理をスキップしました。`);

          // 支払い情報のステータスを更新（必要に応じて）
          const { error: updateError } = await supabase
            .from('payment_intents')
            .update({
              status: 'cancellation_fee_charged',
              updated_at: new Date().toISOString(),
            })
            .eq('id', paymentIntentData.id);

          if (updateError) throw updateError;
          console.log(`Payment Intent ID: ${paymentIntentId} のステータスを 'cancellation_fee_charged' に更新しました。`);
        }
      } else {
        console.log(`Payment Intent ID: ${paymentIntentId} はキャンセルや返金の対象外のステータスです。`);
      }
    } else {
      // 支払い情報が見つからない場合の処理
      // stripe_customersテーブルからデータを取得
      const { data: stripeCustomerData, error: stripeCustomerError } = await supabase
        .from('stripe_customers')
        .select('*')
        .eq('reservation_id', reservationId)
        .single();

      if (stripeCustomerError || !stripeCustomerData) {
        console.warn('支払い情報およびStripe顧客情報が見つかりませんでした。');
      } else {
        // stripe_customersのステータスを更新
        const { error: updateCustomerError } = await supabase
          .from('stripe_customers')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', stripeCustomerData.id);

        if (updateCustomerError) throw updateCustomerError;
        console.log(`Stripe Customer ID: ${stripeCustomerData.stripe_customer_id} のステータスを 'canceled' に更新しました。`);
      }
    }

    // 予約ステータスの更新
    const { error: reservationUpdateError } = await supabase
      .from('reservations')
      .update({
        status: cancellationType === 'same_day_cancellation' ? 'same_day_cancelled' : 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId);

    if (reservationUpdateError) throw reservationUpdateError;
    console.log(`予約ID:${reservationId} のステータスを '${cancellationType === 'same_day_cancellation' ? 'same_day_cancelled' : 'cancelled'}' に更新しました。`);

    return NextResponse.json({ message: '予約が正常にキャンセルされました' }, { status: 200 });
  } catch (error) {
    console.error('予約キャンセル中のエラー:', error);
    return NextResponse.json({ error: '予約のキャンセルに失敗しました' }, { status: 500 });
  }
}
