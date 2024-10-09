//create-setup-intent.route.ts

import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { customerEmail, userId } = await request.json();

    if (!customerEmail || !userId) {
      return NextResponse.json({ error: 'Customer Email and User ID are required' }, { status: 400 });
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

    // 接続アカウント内で顧客を取得または作成
    let customerId: string | null = null;

    // 接続アカウント内でメールアドレスから顧客を検索
    const customers = await stripe.customers.list(
      { email: customerEmail, limit: 1 },
      { stripeAccount: connectedAccountId }
    );

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // 顧客が存在しない場合、新規作成
      const customer = await stripe.customers.create(
        {
          email: customerEmail,
        },
        {
          stripeAccount: connectedAccountId,
        }
      );
      customerId = customer.id;
    }

    // 接続アカウント内で Setup Intent を作成
    const setupIntent = await stripe.setupIntents.create(
      {
        customer: customerId,
        payment_method_types: ['card'],
      },
      {
        stripeAccount: connectedAccountId,
      }
    );

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customerId,
      connectedAccountId: connectedAccountId,
    });
  } catch (err: any) {
    console.error('Error creating Setup Intent:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}