import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, stripeConnectId } = await request.json();

    const paymentIntent = await stripe.paymentIntents.capture(
      paymentIntentId,
      {},
      {
        stripeAccount: stripeConnectId,
      }
    );

    return NextResponse.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
    });
  } catch (err: any) {
    console.error("Error capturing PaymentIntent:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
