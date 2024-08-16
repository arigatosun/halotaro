import React, { useState, useEffect } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useReservation } from "@/contexts/reservationcontext";
import getStripe from "@/lib/stripe";

interface PaymentFormProps {
  onBack: () => void;
  onPaymentComplete: (status: string) => void;
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
      } else {
        // Payment succeeded
        onPaymentComplete("succeeded");
      }
    } catch (err: any) {
      console.error("Error fetching PaymentIntent:", err);
      setError(
        `決済の準備中にエラーが発生しました: ${err.message}. もう一度お試しください。`
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="button" onClick={onBack}>
        戻る
      </button>
      <button type="submit" disabled={!stripe || processing}>
        支払う
      </button>
      {error && <div>{error}</div>}
    </form>
  );
};

interface PaymentProps {
  onBack: () => void;
  onPaymentComplete: (status: string) => void;
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
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(
    null
  );
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { selectedMenus, calculateTotalAmount } = useReservation();

  useEffect(() => {
    const fetchPaymentIntent = async () => {
      try {
        const response = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, selectedMenuIds: [selectedMenuId] }),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Received PaymentIntent data:", data);
        setClientSecret(data.clientSecret);
        setConnectedAccountId(data.connectedAccountId); // サーバーから Connected Account ID を受け取る
      } catch (err) {
        console.error("Error fetching PaymentIntent:", err);
        setError(
          "決済の準備中にエラーが発生しました。もう一度お試しください。"
        );
      }
    };

    fetchPaymentIntent();
  }, [userId, selectedMenuId]);

  const handlePaymentComplete = (status: string) => {
    setPaymentStatus(status);
    onPaymentComplete(status); // 親コンポーネントに状態を伝達
  };

  if (!clientSecret) {
    return <div>Loading...</div>;
  }

  if (paymentStatus) {
    return (
      <div>
        {paymentStatus === "succeeded" ? (
          <div>
            <h2>支払いが完了しました</h2>
            <p>予約が確定しました。</p>
          </div>
        ) : (
          <div>
            <h2>支払いに失敗しました</h2>
            <p>もう一度お試しください。</p>
            <button onClick={() => setPaymentStatus(null)}>再試行</button>
          </div>
        )}
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
