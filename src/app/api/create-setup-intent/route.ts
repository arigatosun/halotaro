//create-setup-intent/route.ts
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

export async function POST(request: NextRequest) {
    try {
      const { customerEmail } = await request.json();
  
      if (!customerEmail) {
        return NextResponse.json({ error: 'Customer Email is required' }, { status: 400 });
      }
  
      // Stripe Customer の取得または作成
      const { data: customerData, error: customerError } = await supabase
        .from('stripe_customers')
        .select('stripe_customer_id')
        .eq('customer_email', customerEmail)
        .single();
  
      if (customerError && customerError.code !== 'PGRST116') {
        return NextResponse.json({ error: 'Error fetching customer data' }, { status: 500 });
      }
  
      let customerId = customerData?.stripe_customer_id;
  
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: customerEmail,
        });
        customerId = customer.id;
  
        // Stripe Customer ID をデータベースに保存
        const { error: insertError } = await supabase
          .from('stripe_customers')
          .insert({ 
            customer_email: customerEmail, 
            stripe_customer_id: customerId
          });
  
        if (insertError) {
          console.error('Error inserting stripe customer:', insertError);
          return NextResponse.json({ error: 'Error saving customer ID' }, { status: 500 });
        }
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