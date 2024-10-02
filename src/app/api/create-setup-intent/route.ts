import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
    try {
      const { customerEmail, totalAmount } = await request.json();
  
      if (!customerEmail || totalAmount === undefined) {
        return NextResponse.json({ error: 'Customer Email and Total Amount are required' }, { status: 400 });
      }
  
      // Stripe Customer の取得または作成
      const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
      let customerId = customers.data.length > 0 ? customers.data[0].id : null;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: customerEmail,
        });
        customerId = customer.id;
      }
  
      // Setup Intent の作成
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        metadata: { totalAmount: totalAmount.toString() }, // 金額をメタデータとして保存
      });
  
      return NextResponse.json({
        clientSecret: setupIntent.client_secret,
        customerId: customerId,
        totalAmount: totalAmount, // クライアントに金額を返す
      });
    } catch (err: any) {
      console.error('Error creating Setup Intent:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
}