// payments.tsx

import React, { useState, useEffect, useRef } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useReservation } from "@/contexts/reservationcontext";
import getStripe from "@/lib/stripe";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { LockIcon, CreditCardIcon, ShieldCheckIcon, AlertCircleIcon } from "lucide-react";
import { CircularProgress } from "@mui/material";

// PaymentFormコンポーネントのプロパティ定義
interface PaymentFormProps {
  onBack: () => void;
  onPaymentComplete: (status: string, intent?: any) => void;
  clientSecret: string;
  isSetupIntent: boolean;
  stripeCustomerId: string;
  userId: string;
}

// PaymentFormコンポーネント
const PaymentForm: React.FC<PaymentFormProps> = ({
  onBack,
  onPaymentComplete,
  clientSecret,
  isSetupIntent,
  stripeCustomerId,
  userId,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { setPaymentInfo, customerInfo } = useReservation();

  // フォーム送信時の処理
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProcessing(true);

    if (!stripe || !elements) {
      setError("Stripe.jsがまだ読み込まれていません。");
      setProcessing(false);
      return;
    }

    try {
      let result;
      if (isSetupIntent) {
        // SetupIntentの確認処理
        result = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/reservation-complete`,
          },
          redirect: "if_required",
        });

        if (result.error) {
          setError(result.error.message || "決済中にエラーが発生しました");
          onPaymentComplete("failed");
        } else if (result.setupIntent) {
          const setupIntent = result.setupIntent;
          const paymentMethodId = setupIntent.payment_method;

          if (typeof paymentMethodId === 'string') {
            setPaymentInfo((prev) => ({
              ...prev!,
              paymentMethodId,
              status: setupIntent.status,
            }));
          } else {
            console.error('Unexpected paymentMethodId type:', paymentMethodId);
          }

          // バックエンドにpaymentMethodIdを送信して保存
          const response = await fetch('/api/save-payment-method', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerEmail: customerInfo.email,
              paymentMethodId,
              stripeCustomerId,
              userId,
              status: 'request',
            }),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save payment method');
          }

          onPaymentComplete("succeeded", setupIntent);
        }
      } else {
        // PaymentIntentの確認処理
        result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/reservation-complete`,
          },
          redirect: "if_required",
        });

        if (result.error) {
          setError(result.error.message || "決済中にエラーが発生しました");
          onPaymentComplete("failed");
        } else if (result.paymentIntent) {
          onPaymentComplete("succeeded", result.paymentIntent);
        }
      }
    } catch (err: any) {
      console.error("Error confirming payment or setup:", err);
      setError(`決済の確認中にエラーが発生しました: ${err.message}. もう一度お試しください。`);
      onPaymentComplete("failed");
    } finally {
      setProcessing(false);
    }
  };

  // フォームのレンダリング
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

// Paymentコンポーネントのプロパティ定義
interface PaymentProps {
  onBack: () => void;
  onPaymentComplete: (status: string, intent?: any) => void;
  userId: string;
  isOver30Days: boolean;
  totalAmount: number;
}

// Paymentコンポーネント
const Payment: React.FC<PaymentProps> = ({
  onBack,
  onPaymentComplete,
  userId,
  isOver30Days,
  totalAmount,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setPaymentInfo, selectedMenus, customerInfo } = useReservation();
  const didFetch = useRef(false);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);

  // クライアントシークレットの取得
  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    const fetchIntent = async () => {
      try {
        setIsLoading(true);
        const endpoint = isOver30Days ? "/api/create-setup-intent" : "/api/create-payment-intent";
        
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerEmail: customerInfo.email,
            userId,
            selectedMenuIds: selectedMenus.map(menu => menu.id.toString()),
            totalAmount,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setClientSecret(data.clientSecret);
        setConnectedAccountId(data.connectedAccountId);
        setStripeCustomerId(data.customerId);

        if (!isOver30Days) {
          setPaymentInfo((prev) => ({
            ...prev!,
            stripePaymentIntentId: data.paymentIntentId,
          }));
        }
      } catch (err: any) {
        console.error("Error fetching intent:", err);
        setError("決済の準備中にエラーが発生しました。もう一度お試しください。");
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchIntent();
  }, [isOver30Days, customerInfo.email, selectedMenus, setPaymentInfo, totalAmount, userId]);

  // 決済完了時の処理
  const handlePaymentComplete = async (status: string, paymentIntent?: any) => {
    if (paymentIntent) {
      setPaymentInfo((prev) => ({
        ...prev!,
        method: "credit_card",
        status: paymentIntent.status,
        amount: paymentIntent.amount,
      }));
    }
    onPaymentComplete(status, paymentIntent);
  };

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto mt-8 space-y-4">
        <div className="flex flex-col items-center justify-center space-y-4">
          <CircularProgress size={60} style={{ color: "#F9802D" }} />
          <p className="text-lg font-semibold text-[#F9802D]">決済の準備中...</p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!clientSecret) {
    return null;
  }

  // Stripeエレメントのレンダリング
  return (
    <Elements
      stripe={getStripe(connectedAccountId ?? undefined)}
      options={{ clientSecret }}
    >
      <PaymentForm
        onBack={onBack}
        onPaymentComplete={handlePaymentComplete}
        clientSecret={clientSecret}
        isSetupIntent={isOver30Days}
        stripeCustomerId={stripeCustomerId!}
        userId={userId}
      />
    </Elements>
  );
};

export default Payment;