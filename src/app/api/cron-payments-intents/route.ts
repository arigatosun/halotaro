import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// 環境変数の確認
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const CRON_SECRET = process.env.CRON_SECRET!;

// Supabaseクライアントの初期化
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Stripeクライアントの初期化
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

interface Reservation {
  id: string;
  user_id: string;
  total_price: number;
  start_time: string;
  status: string;
}

interface StripeCustomer {
  id: string;
  stripe_customer_id: string;
  payment_method_id: string;
  reservation_id: string;
  customer_email: string;
  status: string;
  reservations: Reservation;
}

async function getMaxCancelPolicyDays(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('cancel_policies')
    .select('policies')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('キャンセルポリシーの取得中にエラーが発生しました:', error);
    return 7;
  }

  if (!data || !data.policies || !Array.isArray(data.policies)) {
    console.error('キャンセルポリシーのデータが無効です:', data);
    return 7;
  }

  const policies = data.policies as Array<{ days: number }>;
  const maxDays = Math.max(...policies.map((policy) => policy.days));

  return maxDays;
}

export async function GET(request: NextRequest) {
  // 認証チェック
  if (request.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`) {
    console.error('不正なアクセス試行がありました');
    return NextResponse.json({ error: '認証されていません' }, { status: 401 });
  }

  console.log(`[${new Date().toISOString()}] PaymentIntent作成タスクを開始します...`);

  try {
    const { data: stripeCustomers, error } = await supabase
      .from('stripe_customers')
      .select(`
        id,
        stripe_customer_id,
        payment_method_id,
        reservation_id,
        customer_email,
        status,
        reservations!reservation_id (
          id,
          user_id,
          total_price,
          start_time,
          status
        )
      `)
      .eq('status', 'request');

    if (error) {
      console.error('stripe_customersの取得中にエラーが発生しました:', error);
      return NextResponse.json({ error: 'stripe_customersの取得に失敗しました' }, { status: 500 });
    }

    console.log(`"request"ステータスのstripe_customerを${stripeCustomers?.length}件取得しました。`);

    if (!stripeCustomers || stripeCustomers.length === 0) {
      console.log('現時点でPaymentIntentの作成が必要なstripe_customersはありません。');
      return NextResponse.json({ message: 'PaymentIntentの作成が必要なstripe_customersはありません。' }, { status: 200 });
    }

    let processedCount = 0;
    let successCount = 0;
    let successfulIds: string[] = [];

    for (const stripeCustomer of stripeCustomers as unknown as StripeCustomer[]) {
      const {
        id: stripeCustomerId,
        stripe_customer_id: customerId,
        payment_method_id: paymentMethodId,
        reservations,
      } = stripeCustomer;

      if (!reservations) {
        console.error(`stripe_customer ${stripeCustomerId} に関連する reservation がありません。`);
        continue;
      }

      const {
        id: reservationId,
        user_id: userId,
        total_price: amount,
        start_time: startTime,
        status: reservationStatus,
      } = reservations;

      if (reservationStatus !== 'confirmed') {
        continue;
      }

      const now = new Date();
      const reservationDate = new Date(startTime);
      const daysUntilReservation = (reservationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      if (daysUntilReservation > 30) {
        continue;
      }

      processedCount++;

      const { data: stripeProfile, error: stripeProfileError } = await supabase
        .from('stripe_profiles')
        .select('stripe_connect_id')
        .eq('user_id', userId)
        .single();

      if (stripeProfileError || !stripeProfile || !stripeProfile.stripe_connect_id) {
        console.error(`ユーザー ${userId} の Stripe Connect ID 取得中にエラーが発生しました:`, stripeProfileError);
        continue;
      }

      const stripeConnectId = stripeProfile.stripe_connect_id;

      try {
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount,
            currency: 'jpy',
            capture_method: 'manual',
            customer: customerId,
            payment_method: paymentMethodId,
            confirm: true,
            off_session: true,
          },
          {
            stripeAccount: stripeConnectId,
          }
        );

        const maxCancelPolicyDays = await getMaxCancelPolicyDays(userId);
        const captureDate = new Date(startTime);
        captureDate.setDate(captureDate.getDate() - maxCancelPolicyDays);

        const { error: saveError } = await supabase
          .from('payment_intents')
          .insert({
            payment_intent_id: paymentIntent.id,
            user_id: userId,
            status: paymentIntent.status,
            amount,
            reservation_id: reservationId,
            capture_date: captureDate.toISOString(),
          });

        if (saveError) {
          console.error(`PaymentIntent ${paymentIntent.id} の保存中にエラーが発生しました:`, saveError);
        } else {
          const { error: updateError } = await supabase
            .from('stripe_customers')
            .update({ status: 'requires_capture' })
            .eq('id', stripeCustomerId);

          if (updateError) {
            console.error(`stripe_customer ${stripeCustomerId} のステータス更新中にエラーが発生しました:`, updateError);
          } else {
            successCount++;
            successfulIds.push(stripeCustomerId);
          }
        }
      } catch (err) {
        console.error(`予約 ${reservationId} の PaymentIntent 作成中にエラーが発生しました:`, err);
      }
    }

    console.log(`処理が必要なstripe_customers ${processedCount}件のうち、${successCount}件のPaymentIntentを作成・保存しました。`);
    console.log('処理に成功したstripe_customersのID:', successfulIds.join(', '));

    return NextResponse.json({ message: 'PaymentIntent作成タスクが完了しました。' }, { status: 200 });
  } catch (err) {
    console.error('PaymentIntent作成タスク中にエラーが発生しました:', err);
    return NextResponse.json({ error: 'PaymentIntent作成タスク中にエラーが発生しました' }, { status: 500 });
  }
}