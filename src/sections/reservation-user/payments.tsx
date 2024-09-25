import React, { useState, useEffect, useCallback } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useReservation } from "@/contexts/reservationcontext";
import getStripe from "@/lib/stripe";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";

interface PaymentFormProps {
  onBack: () => void;
  onPaymentComplete: (status: string, paymentIntent?: any) => void;
  clientSecret: string;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  onBack,
  onPaymentComplete,
  clientSecret,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProcessing(true);

    if (!stripe || !elements) {
      setError("Stripe.js has not loaded yet.");
      setProcessing(false);
      return;
    }

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/reservation-complete`,
        },
        redirect: "if_required",
      });

      if (result.error) {
        setError(result.error.message || "An error occurred during payment");
        onPaymentComplete("failed");
      } else if (result.paymentIntent) {
        onPaymentComplete("succeeded", result.paymentIntent);
      }
    } catch (err: any) {
      console.error("Error confirming payment:", err);
      setError(
        `決済の確認中にエラーが発生しました: ${err.message}. もう一度お試しください。`
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
        <CardTitle className="flex items-center justify-between">
        <span>Stripeで安全に決済</span>
            <Image src="/images/stripe-logo-white-on-blue.png" alt="Stripe" width={70} height={25} quality={100}/>
          </CardTitle>
        </CardHeader>
        <CardContent>
        <p className="text-sm text-gray-600 mb-4">
    Stripeの安全な決済システムを使用しています。カード情報は暗号化され、当社のサーバーには保存されません。
  </p>
          <PaymentElement />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack} disabled={processing}>
            戻る
          </Button>
          <Button type="submit" disabled={!stripe || processing}>
            {processing ? "処理中..." : "支払う"}
          </Button>
        </CardFooter>
      </Card>
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
};

interface PaymentProps {
  onBack: () => void;
  onPaymentComplete: (status: string, paymentIntent?: any) => void;
  userId: string;
  selectedMenuId: string;
}

const Payment: React.FC<PaymentProps> = ({
  onBack,
  onPaymentComplete,
  userId,
  selectedMenuId,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { setPaymentInfo, selectedMenus } = useReservation();

  const fetchPaymentIntent = useCallback(async () => {
    try {
      setProgress(25);
      console.log("Sending request with:", { userId, selectedMenus });
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          selectedMenuIds: selectedMenus.map(menu => menu.id.toString()),
        }),
      });
      
      setProgress(50);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server response:", errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Received PaymentIntent data:", data);
      setClientSecret(data.clientSecret);
      setConnectedAccountId(data.connectedAccountId);
      setProgress(100);
    } catch (err: any) {
      console.error("Error fetching PaymentIntent:", err);
      setError(
        "決済の準備中にエラーが発生しました。もう一度お試しください。"
      );
      setProgress(0);
    }
  }, [userId, selectedMenus]);

  useEffect(() => {
    fetchPaymentIntent();
  }, [fetchPaymentIntent]);

  const handlePaymentComplete = (status: string, paymentIntent?: any) => {
    if (status === "succeeded" && paymentIntent) {
      setPaymentInfo({
        method: "credit_card",
        status: paymentIntent.status,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
      });
    }
    onPaymentComplete(status, paymentIntent);
  };

  if (!clientSecret) {
    return (
      <div className="w-full max-w-md mx-auto mt-8">
        <Progress value={progress} className="w-full" />
        <p className="text-center mt-4">決済の準備中...</p>
      </div>
    );
  }

  return (
    <Elements
      stripe={getStripe(connectedAccountId ?? undefined)}
      options={{ clientSecret }}
    >
      <PaymentForm
        onBack={onBack}
        onPaymentComplete={handlePaymentComplete}
        clientSecret={clientSecret}
      />
    </Elements>
  );
};

export default Payment;