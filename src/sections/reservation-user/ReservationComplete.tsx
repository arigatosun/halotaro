"use client";

import React, { useEffect, useState } from "react";
import { Typography, Button, CircularProgress } from "@mui/material";
import { useReservation } from "@/contexts/reservationcontext";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const ReservationComplete: React.FC = () => {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const {
    selectedMenus,
    selectedDate,
    selectedTime,
    selectedStaff,
    customerInfo,
  } = useReservation();

  useEffect(() => {
    const clientSecret = searchParams.get("payment_intent_client_secret");

    if (clientSecret) {
      stripePromise.then((stripe) => {
        if (stripe) {
          stripe
            .retrievePaymentIntent(clientSecret)
            .then(({ paymentIntent }) => {
              if (paymentIntent) {
                switch (paymentIntent.status) {
                  case "succeeded":
                    setStatus("支払いが完了し、予約が確定しました。");
                    break;
                  case "processing":
                    setStatus("支払いを処理中です。しばらくお待ちください。");
                    break;
                  case "requires_payment_method":
                    setStatus(
                      "支払いに失敗しました。別の支払い方法をお試しください。"
                    );
                    break;
                  default:
                    setStatus("予期せぬエラーが発生しました。");
                    break;
                }
              }
              setLoading(false);
            });
        }
      });
    } else {
      setStatus("予約が完了しました");
      setLoading(false);
    }
  }, [searchParams]);

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        {status}
      </Typography>
      <Typography variant="body1" paragraph>
        ご予約ありがとうございます。以下の内容で予約を承りました。
      </Typography>
      <Typography variant="body1">
        予約日時: {selectedDate?.toLocaleDateString()} {selectedTime}
      </Typography>
      <Typography variant="body1">担当スタッフ: {selectedStaff}</Typography>
      <Typography variant="body1">お客様名: {customerInfo.name}</Typography>
      <Typography variant="body1" paragraph>
        選択したメニュー: {selectedMenus.join(", ")}
      </Typography>
      <Typography variant="body1" paragraph>
        予約の詳細は、ご登録いただいたメールアドレス ({customerInfo.email})
        に送信されます。
      </Typography>
      <Button variant="contained" color="primary" href="/">
        トップページに戻る
      </Button>
    </div>
  );
};

export default ReservationComplete;
