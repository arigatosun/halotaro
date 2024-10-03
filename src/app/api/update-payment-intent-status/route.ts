import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, status } = await request.json();

    // データベースのPaymentIntentのステータスを更新
    const { data, error } = await supabase
      .from('payment_intents')
      .update({ status })
      .eq('payment_intent_id', paymentIntentId);

    if (error) {
      console.error('Error updating PaymentIntent status in database:', error);
      return NextResponse.json(
        { error: 'Failed to update PaymentIntent status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in update-payment-intent-status API:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
