import { getTotalAmount } from "@/app/service/menuService";
import { getUserStripeConnectId } from "@/app/service/userService";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

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
        automatic_payment_methods: { enabled: true },
      },
      {
        stripeAccount: stripeConnectId,
      }
    );
    console.log("Created PaymentIntent:", paymentIntent.id);
    console.log("Client Secret:", paymentIntent.client_secret);

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