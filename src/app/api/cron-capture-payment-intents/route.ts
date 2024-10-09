import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// 環境変数の確認
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const CRON_SECRET = process.env.CRON_SECRET!;

// デバッグ用ログ
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '[設定済み]' : '[未設定]');
console.log('STRIPE_SECRET_KEY:', STRIPE_SECRET_KEY ? '[設定済み]' : '[未設定]');
console.log('CRON_SECRET:', CRON_SECRET ? '[設定済み]' : '[未設定]');

// Stripe クライアントの初期化
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// Supabase クライアントの初期化
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// データベースのPaymentIntentステータスを更新する関数
async function updatePaymentIntentStatusInDatabase({
  paymentIntentId,
  status,
}: {
  paymentIntentId: string;
  status: string;
}) {
  const { data, error } = await supabase
    .from('payment_intents')
    .update({ status })
    .eq('payment_intent_id', paymentIntentId);

  if (error) {
    console.error('データベース内のPaymentIntentステータス更新中にエラーが発生しました:', error);
    throw new Error('データベース内のPaymentIntentステータスの更新に失敗しました');
  }

  return data;
}

// サーバーレス関数の実装
export async function GET(request: NextRequest) {
  // 認証チェック
  if (request.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`) {
    console.error('不正なアクセス試行がありました');
    return NextResponse.json({ error: '認証されていません' }, { status: 401 });
  }

  console.log('スケジューラーが起動しました。');
  console.log(`[${new Date().toISOString()}] PaymentIntentキャプチャタスクを開始します...`);

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
      console.error('payment_intentsの取得中にエラーが発生しました:', error);
      return NextResponse.json({ error: 'payment_intentsの取得に失敗しました' }, { status: 500 });
    }

    if (!paymentIntents || paymentIntents.length === 0) {
      console.log('現時点でキャプチャが必要なPaymentIntentはありません。');
      return NextResponse.json({ message: '現時点でキャプチャが必要なPaymentIntentはありません。' }, { status: 200 });
    }

    console.log(`キャプチャが必要なPaymentIntentを${paymentIntents.length}件見つけました。`);

    let processedCount = 0;
    let successCount = 0;
    let successfulIds: string[] = [];

    for (const paymentIntentData of paymentIntents) {
      const { payment_intent_id, user_id, status } = paymentIntentData;

      // ステータスが 'requires_capture' であることを再確認
      if (status !== 'requires_capture') {
        console.log(`PaymentIntent ${payment_intent_id} のステータスが 'requires_capture' ではありません。スキップします。`);
        continue;
      }

      processedCount++;

      // Stripe Connect アカウントIDを取得（stripe_profiles テーブルをクエリ）
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
        // PaymentIntent をキャプチャ
        const paymentIntent = await stripe.paymentIntents.capture(
          payment_intent_id,
          {},
          {
            stripeAccount: stripeAccountId,
          }
        );

        console.log(`PaymentIntent ${paymentIntent.id} のキャプチャに成功しました。`);

        // payment_intents テーブルのステータスを更新
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
        // 必要に応じて再試行のロジックや通知の仕組みを追加
      }
    }

    console.log(`処理が必要なPaymentIntent ${processedCount}件のうち、${successCount}件のキャプチャに成功しました。`);
    console.log('キャプチャに成功したPaymentIntentのID:', successfulIds.join(', '));

    return NextResponse.json({ message: 'PaymentIntentキャプチャタスクが完了しました。' }, { status: 200 });
  } catch (err: any) {
    console.error('PaymentIntentキャプチャタスク中にエラーが発生しました:', err);
    return NextResponse.json({ error: 'PaymentIntentキャプチャタスク中にエラーが発生しました' }, { status: 500 });
  }
}