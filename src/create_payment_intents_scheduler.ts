import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
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
  reservation_customer_id: string;
  customer_email: string;
  status: string;
  reservation_customers: {
    id: string;
    reservation_id: string;
    reservations: Reservation;
  };
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

cron.schedule('* * * * *', async () => {
  console.log(`[${new Date().toISOString()}] PaymentIntent作成タスクを開始します...`);

  try {
    const { data: stripeCustomers, error } = await supabase
      .from('stripe_customers')
      .select(`
        id,
        stripe_customer_id,
        payment_method_id,
        reservation_customer_id,
        customer_email,
        status,
        reservation_customers!reservation_customer_id (
          id,
          reservation_id,
          reservations!reservation_id (
            id,
            user_id,
            total_price,
            start_time,
            status
          )
        )
      `)
      .eq('status', 'request');

    if (error) {
      console.error('stripe_customersの取得中にエラーが発生しました:', error);
      return;
    }

    console.log(`"request"ステータスの stripe_customer を ${stripeCustomers?.length}件 取得しました。`);

    if (!stripeCustomers || stripeCustomers.length === 0) {
      console.log('現時点でPaymentIntentの作成が必要なstripe_customersはありません。');
      return;
    }

    let processedCount = 0;
    let successCount = 0;
    let successfulIds: string[] = [];

    for (const stripeCustomer of stripeCustomers as unknown as StripeCustomer[]) {
      const {
        id: stripeCustomerId,
        stripe_customer_id: customerId,
        payment_method_id: paymentMethodId,
        reservation_customers,
      } = stripeCustomer;

      const reservationCustomerFromJoin = reservation_customers;

      if (!reservationCustomerFromJoin) {
        console.error(`stripe_customer ${stripeCustomerId} に関連する reservation_customer がありません。`);
        continue;
      }

      const {
        reservations,
      } = reservationCustomerFromJoin;

      const reservation = reservations;

      if (!reservation) {
        console.error(`Reservation customer ${reservationCustomerFromJoin.id} に関連する reservation がありません。`);
        continue;
      }

      const {
        id: reservationId,
        user_id: userId,
        total_price: amount,
        start_time: startTime,
        status: reservationStatus,
      } = reservation;

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

    console.log(`処理が必要な stripe_customers ${processedCount}件 のうち、${successCount}件 の PaymentIntent を作成・保存しました。`);
    console.log('処理に成功した stripe_customers の ID:', successfulIds.join(', '));
  } catch (err) {
    console.error('PaymentIntent作成タスク中にエラーが発生しました:', err);
  }
});

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