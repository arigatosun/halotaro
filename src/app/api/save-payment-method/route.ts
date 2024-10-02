// /api/save-payment-method/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { customerEmail, paymentMethodId } = await req.json();

    if (!customerEmail || !paymentMethodId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('stripe_customers')
      .update({ payment_method_id: paymentMethodId })
      .eq('customer_email', customerEmail);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error saving payment method:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
