import React, { useState, useEffect, useCallback } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useReservation } from "@/contexts/reservationcontext";
import getStripe from "@/lib/stripe";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { LockIcon, CreditCardIcon, ShieldCheckIcon, AlertCircleIcon } from "lucide-react";

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
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardTitle className="flex items-center justify-between">
            <span className="text-2xl font-bold">安全な決済</span>
            <Image src="/images/stripe-logo-white-on-blue.png" alt="Stripe" width={70} height={25} quality={100}/>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <LockIcon className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600">SSL暗号化で保護されています</span>
          </div>
          <PaymentElement className="mb-6" />
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <ShieldCheckIcon className="w-4 h-4 mr-1 text-green-500" />
              <span>安全な取引</span>
            </div>
            <div className="flex items-center">
              <CreditCardIcon className="w-4 h-4 mr-1 text-blue-500" />
              <span>カード情報は保存されません</span>
            </div>
          </div>
        </CardContent>
        <Separator className="my-4" />
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack} disabled={processing}>
            戻る
          </Button>
          <Button 
            type="submit" 
            disabled={!stripe || processing}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {processing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                処理中...
              </span>
            ) : (
              <span className="flex items-center">
                <LockIcon className="w-4 h-4 mr-2" />
                安全に支払う
              </span>
            )}
          </Button>
        </CardFooter>
      </Card>
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircleIcon className="h-4 w-4" />
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
      <div className="w-full max-w-md mx-auto mt-8 space-y-4">
        <Progress value={progress} className="w-full" />
        <p className="text-center text-gray-600">決済の準備中...</p>
        <div className="flex justify-center space-x-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`w-3 h-3 rounded-full ${
                progress >= step * 33 ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
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