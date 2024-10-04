//api/create-payment-intent/route.ts

import { getTotalAmount } from "@/app/service/menuService";
import { getUserStripeConnectId } from "@/app/service/userService";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 関数の実装
async function savePaymentIntentToDatabase({
  paymentIntentId,
  userId,
  status,
  amount,
}: {
  paymentIntentId: string;
  userId: string;
  status: string;
  amount: number;
}) {
  const { data, error } = await supabase.from('payment_intents').insert([
    {
      payment_intent_id: paymentIntentId,
      user_id: userId,
      status: status,
      amount: amount,
    },
  ]);

  if (error) {
    console.error('Error saving PaymentIntent to database:', error);
    throw new Error('Failed to save PaymentIntent to database');
  }

  return data;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: NextRequest) {
  try {
    const { userId, selectedMenuIds } = await request.json();
    console.log("Received request for userId:", userId);
    console.log("Selected menu IDs:", selectedMenuIds);

    if (!userId || !selectedMenuIds || selectedMenuIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const stripeConnectId = await getUserStripeConnectId(userId);
    console.log("Retrieved Stripe Connect ID:", stripeConnectId);

    if (!stripeConnectId) {
      console.error("Stripe Connect ID not found for user:", userId);
      return NextResponse.json(
        { error: "User not found or Stripe Connect ID not set" },
        { status: 404 }
      );
    }

    const amount = await getTotalAmount(selectedMenuIds, userId);
    console.log("Calculated total amount:", amount);

    if (amount <= 0) {
      console.error("Invalid amount:", amount);
      return NextResponse.json(
        { error: "Invalid amount calculated" },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: "jpy",
        capture_method: 'manual',
        payment_method_types: ['card'], // automatic_payment_methodsの代わりに指定
      },
      {
        stripeAccount: stripeConnectId,
      }
    );
    console.log("Created PaymentIntent:", paymentIntent.id);
    console.log("Client Secret:", paymentIntent.client_secret);

    // データベースに保存
await savePaymentIntentToDatabase({
  paymentIntentId: paymentIntent.id,
  userId: userId,
  status: paymentIntent.status,
  amount: amount,
});

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      connectedAccountId: stripeConnectId,
    });
  } catch (err: any) {
    console.error("Error creating PaymentIntent:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}