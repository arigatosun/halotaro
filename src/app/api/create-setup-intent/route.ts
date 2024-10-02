// /api/create-setup-intent/route.ts

import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
    try {
      const { customerEmail } = await request.json();
  
      if (!customerEmail) {
        return NextResponse.json({ error: 'Customer Email is required' }, { status: 400 });
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
      });
  
      return NextResponse.json({
        clientSecret: setupIntent.client_secret,
        customerId: customerId,
      });
    } catch (err: any) {
      console.error('Error creating Setup Intent:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
