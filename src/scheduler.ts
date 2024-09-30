// src/scheduler.ts

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// ESMモジュールで __dirname を定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 環境変数の読み込み
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// 環境変数の確認
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// デバッグ用ログ（必要に応じてコメントアウト）
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '[SET]' : '[NOT SET]');
console.log('STRIPE_SECRET_KEY:', STRIPE_SECRET_KEY ? '[SET]' : '[NOT SET]');

// 環境変数が未定義の場合はエラーを投げる
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !STRIPE_SECRET_KEY) {
  console.error('必要な環境変数が設定されていません。');
  console.error('SUPABASE_URL:', SUPABASE_URL);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY);
  console.error('STRIPE_SECRET_KEY: [REDACTED]');
  process.exit(1);
}

// Supabase クライアントの初期化
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Stripe クライアントの初期化
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20', // 最新のAPIバージョンに更新
});

// スケジューラー起動時のログ
console.log('Scheduler has started.');

// スケジュールタスクの設定
// テストのために毎分実行されるように設定
cron.schedule('* * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Running scheduled capture task...`);

  try {
    // 現在のUTC時刻を取得
    const now = new Date().toISOString();

    // capture_date が現在時刻以下で、status が 'requires_capture' の PaymentIntent を取得
    const { data: paymentIntents, error } = await supabase
      .from('payment_intents')
      .select('payment_intent_id, user_id, status')
      .lte('capture_date', now)
      .eq('status', 'requires_capture');

    if (error) {
      console.error('Error fetching payment intents:', error);
      return;
    }

    if (!paymentIntents || paymentIntents.length === 0) {
      console.log('No PaymentIntents require capture at this time.');
      return;
    }

    console.log(`Found ${paymentIntents.length} PaymentIntent(s) to capture.`);

    for (const paymentIntentData of paymentIntents) {
      const { payment_intent_id, user_id, status } = paymentIntentData;

      // ステータスが 'requires_capture' であることを再確認
      if (status !== 'requires_capture') {
        console.log(`PaymentIntent ${payment_intent_id} status is not 'requires_capture'. Skipping.`);
        continue;
      }

      // Stripe Connect アカウントIDを取得（stripe_profiles テーブルをクエリ）
      const { data: userData, error: userError } = await supabase
        .from('stripe_profiles') // 'user_view' から 'stripe_profiles' に変更
        .select('stripe_connect_id')
        .eq('user_id', user_id)
        .single();

      if (userError || !userData || !userData.stripe_connect_id) {
        console.error(`Error fetching Stripe Connect ID for user ${user_id}:`, userError);
        continue;
      }

      const stripeAccountId = userData.stripe_connect_id;

      try {
        // PaymentIntent をキャプチャ
        const paymentIntent = await stripe.paymentIntents.capture(
          payment_intent_id,
          {},
          {
            stripeAccount: stripeAccountId,
          }
        );

        console.log(`Successfully captured PaymentIntent ${paymentIntent.id}`);

        // payment_intents テーブルのステータスを更新
        const { error: updateError } = await supabase
          .from('payment_intents')
          .update({ status: paymentIntent.status })
          .eq('payment_intent_id', paymentIntent.id);

        if (updateError) {
          console.error(`Error updating status for PaymentIntent ${paymentIntent.id}:`, updateError);
        } else {
          console.log(`Updated status for PaymentIntent ${paymentIntent.id} to '${paymentIntent.status}'.`);
        }
      } catch (captureError: any) {
        console.error(`Error capturing PaymentIntent ${payment_intent_id}:`, captureError);
        // 必要に応じて再試行のロジックや通知の仕組みを追加
      }
    }
  } catch (err: any) {
    console.error('Error in scheduled capture task:', err);
  }
});
