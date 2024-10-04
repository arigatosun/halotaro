// /api/save-payment-method/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { customerEmail, paymentMethodId, stripeCustomerId, status } = await req.json();

    if (!customerEmail || !paymentMethodId || !stripeCustomerId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 既存のテーブル構造を維持し、必要な情報を保存
    const { error } = await supabase
      .from('stripe_customers')
      .insert({
        customer_email: customerEmail,
        stripe_customer_id: stripeCustomerId,
        payment_method_id: paymentMethodId,
        status: status, // 追加
        // reservation_customer_id は後で更新します
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error saving payment method:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
