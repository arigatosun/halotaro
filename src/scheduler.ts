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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '[設定済み]' : '[未設定]');
console.log('STRIPE_SECRET_KEY:', STRIPE_SECRET_KEY ? '[設定済み]' : '[未設定]');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !STRIPE_SECRET_KEY) {
  console.error('必要な環境変数が設定されていません。');
  console.error('SUPABASE_URL:', SUPABASE_URL);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '[設定済み]' : '[未設定]');
  console.error('STRIPE_SECRET_KEY: [機密情報のため非表示]');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

console.log('スケジューラーが起動しました。');

cron.schedule('* * * * *', async () => {
  console.log(`[${new Date().toISOString()}] PaymentIntent キャプチャタスクを開始します...`);

  try {
    const now = new Date().toISOString();

    const { data: paymentIntents, error } = await supabase
      .from('payment_intents')
      .select('payment_intent_id, user_id, status')
      .lte('capture_date', now)
      .eq('status', 'requires_capture');

    if (error) {
      console.error('payment_intents の取得中にエラーが発生しました:', error);
      return;
    }

    if (!paymentIntents || paymentIntents.length === 0) {
      console.log('現時点でキャプチャが必要な PaymentIntent はありません。');
      return;
    }

    console.log(`キャプチャが必要な PaymentIntent を ${paymentIntents.length}件 見つけました。`);

    let processedCount = 0;
    let successCount = 0;
    let successfulIds: string[] = [];

    for (const paymentIntentData of paymentIntents) {
      const { payment_intent_id, user_id, status } = paymentIntentData;

      if (status !== 'requires_capture') {
        console.log(`PaymentIntent ${payment_intent_id} のステータスが 'requires_capture' ではありません。スキップします。`);
        continue;
      }

      processedCount++;

      const { data: userData, error: userError } = await supabase
        .from('stripe_profiles')
        .select('stripe_connect_id')
        .eq('user_id', user_id)
        .single();

      if (userError || !userData || !userData.stripe_connect_id) {
        console.error(`ユーザー ${user_id} の Stripe Connect ID 取得中にエラーが発生しました:`, userError);
        continue;
      }

      const stripeAccountId = userData.stripe_connect_id;

      try {
        const paymentIntent = await stripe.paymentIntents.capture(
          payment_intent_id,
          {},
          {
            stripeAccount: stripeAccountId,
          }
        );

        console.log(`PaymentIntent ${paymentIntent.id} のキャプチャに成功しました。`);

        const { error: updateError } = await supabase
          .from('payment_intents')
          .update({ status: paymentIntent.status })
          .eq('payment_intent_id', paymentIntent.id);

        if (updateError) {
          console.error(`PaymentIntent ${paymentIntent.id} のステータス更新中にエラーが発生しました:`, updateError);
        } else {
          console.log(`PaymentIntent ${paymentIntent.id} のステータスを '${paymentIntent.status}' に更新しました。`);
          successCount++;
          successfulIds.push(paymentIntent.id);
        }
      } catch (captureError: any) {
        console.error(`PaymentIntent ${payment_intent_id} のキャプチャ中にエラーが発生しました:`, captureError);
      }
    }

    console.log(`処理が必要な PaymentIntent ${processedCount}件 のうち、${successCount}件 のキャプチャに成功しました。`);
    console.log('キャプチャに成功した PaymentIntent の ID:', successfulIds.join(', '));
  } catch (err: any) {
    console.error('PaymentIntentキャプチャタスク中にエラーが発生しました:', err);
  }
});