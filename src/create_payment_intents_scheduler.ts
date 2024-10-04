import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// ESMモジュールで __dirname を定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 環境変数の読み込み
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

// SupabaseとStripeの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// スケジューラー設定（毎分実行）
cron.schedule('* * * * *', async () => {
  console.log(
    `[${new Date().toISOString()}] Running scheduled PaymentIntent creation task...`
  );

  try {
    console.log('Fetching reservations without existing PaymentIntents...');

    // reservations テーブルから PaymentIntent がない予約を取得
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        total_price,
        start_time,
        reservation_customers (
          id,
          stripe_customers (
            stripe_customer_id,
            payment_method_id
          )
        ),
        payment_intents!left ( reservation_id )
      `)
      .gte('start_time', new Date().toISOString())
      .lte(
        'start_time',
        new Date(new Date().setDate(new Date().getDate() + 30)).toISOString()
      )
      .eq('status', 'confirmed')
      .is('payment_intents.reservation_id', null); // PaymentIntent がない予約を取得

    if (error) {
      console.error('Error fetching reservations:', error);
      return;
    }

    console.log(
      `Fetched ${reservations.length} reservation(s) without PaymentIntents.`
    );

    if (!reservations || reservations.length === 0) {
      console.log('No reservations require PaymentIntent creation at this time.');
      return;
    }

    for (const reservation of reservations) {
      console.log(`Processing reservation ID: ${reservation.id}`);

      const {
        id: reservationId,
        user_id: userId,
        total_price: amount,
        start_time: startTime,
        reservation_customers,
      } = reservation;

      // reservation_customers の最初の要素を取得
      const reservationCustomer = reservation_customers?.[0];

      if (!reservationCustomer || !reservationCustomer.stripe_customers) {
        console.error(
          `Reservation ${reservationId} is missing customer or stripe customer information.`
        );
        continue; // 次の予約へ
      }

      const stripeCustomer = reservationCustomer.stripe_customers[0];

      if (!stripeCustomer) {
        console.error(
          `Reservation ${reservationId} has no associated stripe customer.`
        );
        continue; // 次の予約へ
      }

      const stripeCustomerId = stripeCustomer.stripe_customer_id;
      const paymentMethodId = stripeCustomer.payment_method_id;

      // Stripe ConnectアカウントIDの取得
      console.log(`Fetching Stripe Connect ID for user ${userId}...`);
      const { data: stripeProfile, error: stripeProfileError } = await supabase
        .from('stripe_profiles')
        .select('stripe_connect_id')
        .eq('user_id', userId)
        .single();

      if (
        stripeProfileError ||
        !stripeProfile ||
        !stripeProfile.stripe_connect_id
      ) {
        console.error(
          `Error fetching Stripe Connect ID for user ${userId}:`,
          stripeProfileError
        );
        continue;
      }

      const stripeConnectId = stripeProfile.stripe_connect_id;

      try {
        // PaymentIntentの作成
        console.log(`Creating PaymentIntent for reservation ${reservationId}...`);
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount,
            currency: 'jpy',
            capture_method: 'manual',
            customer: stripeCustomerId,
            payment_method: paymentMethodId,
            confirm: true,
            off_session: true,
          },
          {
            stripeAccount: stripeConnectId,
          }
        );

        console.log(
          `Created PaymentIntent ${paymentIntent.id} for reservation ${reservationId}`
        );

        // キャンセルポリシー適用日を計算
        const maxCancelPolicyDays = await getMaxCancelPolicyDays(userId);
        const captureDate = new Date(startTime);
        captureDate.setDate(captureDate.getDate() - maxCancelPolicyDays);

        // payment_intentsテーブルに保存
        console.log(`Saving PaymentIntent ${paymentIntent.id} to database...`);
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
          console.error(
            `Error saving PaymentIntent ${paymentIntent.id}:`,
            saveError
          );
        } else {
          console.log(
            `Saved PaymentIntent ${paymentIntent.id} to database.`
          );
        }
      } catch (err) {
        console.error(
          `Error creating PaymentIntent for reservation ${reservationId}:`,
          err
        );
      }
    }
  } catch (err) {
    console.error('Error in scheduled PaymentIntent creation task:', err);
  }
});

// キャンセルポリシーの最長日数を取得する関数
async function getMaxCancelPolicyDays(userId: string): Promise<number> {
  console.log(`Fetching cancel policies for user ${userId}...`);
  const { data, error } = await supabase
    .from('cancel_policies')
    .select('policies')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching cancel policies:', error);
    return 7; // デフォルトで7日
  }

  // policies が存在し、配列であることを確認
  if (!data || !data.policies || !Array.isArray(data.policies)) {
    console.error('Cancel policies data is invalid:', data);
    return 7; // デフォルトで7日
  }

  const policies = data.policies as Array<{ days: number }>;
  const maxDays = Math.max(...policies.map((policy) => policy.days));

  console.log(`Max cancel policy days for user ${userId}: ${maxDays}`);
  return maxDays;
}
