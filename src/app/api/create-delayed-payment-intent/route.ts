// app/api/create-delayed-payment-intent/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { stripeCustomerId, paymentMethodId, amount, reservationDate, userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Supabase クライアントの初期化
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 接続アカウントのIDを取得
    const { data: stripeProfile, error: stripeProfileError } = await supabase
      .from('stripe_profiles')
      .select('stripe_connect_id')
      .eq('user_id', userId)
      .single();

    if (stripeProfileError || !stripeProfile || !stripeProfile.stripe_connect_id) {
      console.error('Error fetching Stripe Connect ID:', stripeProfileError);
      return NextResponse.json({ error: 'Failed to fetch Stripe Connect ID' }, { status: 500 });
    }

    const connectedAccountId = stripeProfile.stripe_connect_id;

    // Stripe クライアントの初期化
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20',
    });

    // 予約日から30日前の日付を計算
    const captureDate = new Date(reservationDate);
    captureDate.setDate(captureDate.getDate() - 30);

    // Payment Intentの作成（接続アカウントで）
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: 'jpy',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        capture_method: 'manual',
        confirm: true, // 即座に確定
        payment_method_types: ['card'],
        // オプションで設定が必要な場合は追加
      },
      {
        stripeAccount: connectedAccountId, // 接続アカウントを指定
      }
    );

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      captureDate: captureDate.toISOString(),
      status: paymentIntent.status,
    });
  } catch (error: any) {
    console.error('Error creating Payment Intent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
