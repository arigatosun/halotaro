"use client";

import React, { useEffect, useState } from "react";
import { useReservation } from "@/contexts/reservationcontext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

interface ReservationCompleteProps {
  userId: string;
}

const ReservationComplete: React.FC<ReservationCompleteProps> = ({
  userId,
}) => {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const {
    selectedMenus,
    selectedDateTime,
    selectedStaff,
    customerInfo,
    paymentInfo,
  } = useReservation();

  useEffect(() => {
    console.log("Component mounted"); // マウント回数を確認するためのログ

    let ignore = false;

    const saveReservation = async () => {
      const isReservationSaved = localStorage.getItem("isReservationSaved");
      if (isReservationSaved === "true") {
        if (!ignore) {
          setStatus("予約が既に完了しています");
          setLoading(false);
        }
        return;
      }

      try {
        const reservationData = {
          userId,
          menuId: selectedMenus[0].id,
          staffId: selectedStaff?.id,
          startTime: selectedDateTime?.start.toISOString(),
          endTime: selectedDateTime?.end.toISOString(),
          totalPrice: selectedMenus.reduce(
            (total, menu) => total + menu.price,
            0
          ),
          customerInfo,
          paymentInfo,
        };

        const response = await fetch("/api/create-reservation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reservationData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "予約の保存中にエラーが発生しました"
          );
        }

        const result = await response.json();
        if (!ignore) {
          setStatus("予約が完了しました");
          toast({
            title: "予約が保存されました",
            description: `予約ID: ${result.reservationId}`,
          });
          localStorage.setItem("isReservationSaved", "true");
        }
      } catch (error) {
        if (!ignore) {
          console.error("予約の保存中にエラーが発生しました:", error);
          setStatus("予約の保存中にエラーが発生しました");
          toast({
            title: "エラー",
            description:
              error instanceof Error
                ? error.message
                : "予約情報の保存中にエラーが発生しました。",
            variant: "destructive",
          });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    saveReservation();

    return () => {
      ignore = true;
      localStorage.removeItem("isReservationSaved");
    };
  }, []); // 依存配列を空に

  if (loading) {
    return <Skeleton className="w-[100px] h-[20px] rounded-full" />;
  }

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "long",
    });
  };

  return (
    <Card className="w-[350px] mx-auto">
      <CardHeader>
        <CardTitle>{status}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          ご予約ありがとうございます。以下の内容で予約を承りました。
        </p>
        <div className="space-y-2">
          <p className="text-sm">
            予約日時:{" "}
            {selectedDateTime
              ? `${formatDateTime(selectedDateTime.start)} - ${selectedDateTime.end.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`
              : "Not selected"}
          </p>
          <p className="text-sm">
            担当スタッフ: {selectedStaff ? selectedStaff.name : "Not selected"}
          </p>
          <p className="text-sm">お客様名: {customerInfo.name}</p>
          <p className="text-sm">
            選択したメニュー:{" "}
            {selectedMenus.map((menu) => menu.name).join(", ")}
          </p>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          予約の詳細は、ご登録いただいたメールアドレス ({customerInfo.email})
          に送信されます。
        </p>
        <Button className="mt-4 w-full" onClick={() => router.push("/")}>
          トップページに戻る
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReservationComplete;