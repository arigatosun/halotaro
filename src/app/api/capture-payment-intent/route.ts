// capture-payment-intent/route.ts
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    console.error('Error updating PaymentIntent status in database:', error);
    throw new Error('Failed to update PaymentIntent status in database');
  }

  return data;
}

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, stripeAccountId } = await request.json();

    if (!paymentIntentId || !stripeAccountId) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // PaymentIntentをキャプチャ
    const paymentIntent = await stripe.paymentIntents.capture(
      paymentIntentId,
      {},
      {
        stripeAccount: stripeAccountId,
      }
    );

    // キャプチャ後、データベースのステータスを更新
    await updatePaymentIntentStatusInDatabase({
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });

    return NextResponse.json({ success: true, paymentIntent });
  } catch (err: any) {
    console.error('Error capturing PaymentIntent:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
