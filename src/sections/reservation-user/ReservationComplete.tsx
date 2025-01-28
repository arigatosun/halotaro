// ReservationComplete.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useReservation } from "@/contexts/reservationcontext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ScissorsIcon,
  MailIcon,
  CheckCircleIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { CircularProgress } from "@mui/material";

interface ReservationCompleteProps {
  userId: string;
}

export default function ReservationComplete({
  userId,
}: ReservationCompleteProps) {
  // ------------------------------
  // Reservation context
  // ------------------------------
  const {
    selectedMenus,
    selectedDateTime,
    selectedStaff,
    customerInfo,
    paymentInfo,
    isNoAppointment,
  } = useReservation();

  // ------------------------------
  // Local states
  // ------------------------------
  const hasSaved = useRef(false);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // サロンボードのサービス種別 (hair/spa) を読み込むための state
  // デフォルトは "spa"
  const [serviceType, setServiceType] = useState<string>("spa");
  const [serviceTypeLoaded, setServiceTypeLoaded] = useState<boolean>(false);

  // Router, Toast
  const router = useRouter();
  const { toast } = useToast();

  // ------------------------------
  // Fetch serviceType from server
  // ------------------------------
  useEffect(() => {
    if (!userId) return;

    const fetchServiceType = async () => {
      try {
        const res = await fetch(
          `/api/salonboard-get-credentials?userId=${userId}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.serviceType) {
            setServiceType(data.serviceType); // hair or spa
            console.log("serviceType fetched:", data.serviceType);
          }
        }
      } catch (error) {
        console.error("Failed to fetch service type:", error);
        // 失敗時はデフォルト"spa"のまま進める
      } finally {
        // フェッチが終わったらフラグを立てる（成功/失敗問わず）
        setServiceTypeLoaded(true);
      }
    };

    fetchServiceType();
  }, [userId]);

  // ------------------------------
  // 予約後にサロンボードへ連携する関数
  // ------------------------------
  const sendReservationToAutomation = useCallback(async () => {
    try {
      if (!selectedDateTime) {
        throw new Error("予約日時が選択されていません");
      }

      const startTime = new Date(selectedDateTime.start);
      const endTime = new Date(selectedDateTime.end);

      const duration = selectedMenus.reduce(
        (total, menu) => total + menu.duration,
        0
      ); // 合計施術時間 (分)

      // サロンボード向けフォーマット例
      const automationData = {
        service_type: serviceType,
        user_id: userId,
        date: formatDate(startTime),
        rsv_hour: startTime.getHours().toString(),
        rsv_minute: String(startTime.getMinutes()).padStart(2, "0"),
        staff_name: selectedStaff ? selectedStaff.name : "",
        nm_sei_kana: customerInfo.lastNameKana,
        nm_mei_kana: customerInfo.firstNameKana,
        nm_sei: customerInfo.lastNameKanji,
        nm_mei: customerInfo.firstNameKanji,
        is_no_appointment: isNoAppointment,
        spa_duration: serviceType === "hair" ? null : duration.toString(), // hairの場合はnull
        time_value: serviceType === "hair" ? duration.toString() : "", // hairの場合は施術時間
      };

      console.log("Sending automation data:", automationData);

      const FASTAPI_ENDPOINT =
        "https://eb46-2400-4150-78a0-5300-10dd-e8d0-1c5-cc64.ngrok-free.app/run-automation";
      const automationResponse = await fetch(FASTAPI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(automationData),
      });

      const automationResponseData = await automationResponse.json();

      if (!automationResponse.ok) {
        const errorMessage =
          automationResponseData.detail ||
          automationResponseData.error ||
          "Automation failed";
        console.error("Automation sync failed:", errorMessage);
      } else {
        console.log("Automation sync successful:", automationResponseData);
      }
    } catch (error) {
      console.error("Error in sendReservationToAutomation:", error);
    }
  }, [
    userId,
    selectedMenus,
    selectedStaff,
    serviceType,
    selectedDateTime,
    customerInfo,
    isNoAppointment,
  ]);

  // ------------------------------
  // 予約をDBに保存 -> 成功後に automation
  // ------------------------------
  const saveReservation = useCallback(async () => {
    if (hasSaved.current) return;
    hasSaved.current = true; // 二重呼び出し防止

    try {
      if (!selectedDateTime) {
        throw new Error("予約日時が選択されていません");
      }

      const reservationData = {
        userId,
        menuId: selectedMenus[0]?.id,
        staffId: selectedStaff?.id,
        startTime: selectedDateTime.start.toISOString(),
        endTime: selectedDateTime.end.toISOString(),
        totalPrice: selectedMenus.reduce(
          (total, menu) => total + menu.price,
          0
        ),
        customerInfo,
        paymentInfo,
        paymentMethodId: paymentInfo?.paymentMethodId,
        customerEmail: customerInfo.email,
        customerId: customerInfo.customerId,
      };

      console.log("予約情報です:", reservationData);

      const response = await fetch("/api/create-reservation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reservationData),
      });

      const responseData = await response.json();
      if (!response.ok) {
        console.error("Server responded with an error:", responseData);
        if (response.status === 409) {
          // 一意制約違反
          console.error(
            "Unique constraint violation details:",
            responseData.details
          );
          const constraintName =
            responseData.details?.constraintName || "不明な制約";
          throw new Error(`この予約は既に存在します。制約: ${constraintName}`);
        }
        throw new Error(
          responseData.error || "予約の保存中にエラーが発生しました"
        );
      }

      const { reservationId } = responseData;
      console.log("Reservation saved. ID:", reservationId);

      setStatus("予約が完了しました");
      toast({
        title: "予約が保存されました",
        description: `予約ID: ${reservationId}`,
      });

      // 予約保存成功 -> automation送信
      setLoading(false);
      sendReservationToAutomation(); // awaitしない
    } catch (error: any) {
      hasSaved.current = false;
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
      setLoading(false);
    }
  }, [
    userId,
    selectedMenus,
    selectedDateTime,
    selectedStaff,
    customerInfo,
    paymentInfo,
    toast,
    sendReservationToAutomation,
  ]);

  // ------------------------------
  // serviceType フェッチ後に予約開始
  // ------------------------------
  useEffect(() => {
    // serviceTypeLoaded がまだ false なら待機
    if (!serviceTypeLoaded) return;
    // serviceTypeLoaded === true になったら予約保存開始
    saveReservation();
  }, [serviceTypeLoaded, saveReservation]);

  // ------------------------------
  // UI ヘルパー関数
  // ------------------------------
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

  // ------------------------------
  // 表示
  // ------------------------------
  // もし serviceType がまだ未ロード なら簡易ローディング表示
  if (!serviceTypeLoaded) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-8 space-y-4">
        <div className="flex flex-col items-center justify-center space-y-4">
          <CircularProgress size={60} style={{ color: "#F9802D" }} />
          <p className="text-lg font-semibold text-[#F9802D]">
            サービス種別を読み込んでいます...
          </p>
        </div>
      </div>
    );
  }

  // reservation保存 or 自動化の処理がまだ進行中の場合のローディング表示
  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-8 space-y-4">
        <div className="flex flex-col items-center justify-center space-y-4">
          <CircularProgress size={60} style={{ color: "#F9802D" }} />
          <p className="text-lg font-semibold text-[#F9802D]">
            予約を作成中...
          </p>
        </div>
      </div>
    );
  }

  const fullName = `${customerInfo.lastNameKanji} ${customerInfo.firstNameKanji}`;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center flex items-center justify-center">
          <CheckCircleIcon className="mr-2 text-[#F9802D]" />
          {status}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-center text-muted-foreground">
          ご予約ありがとうございます。以下の内容で予約を承りました。
        </p>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <CalendarIcon className="w-5 h-5 mt-1 text-[#F9802D]" />
            <div>
              <h3 className="font-semibold">予約日時</h3>
              <p className="text-sm text-muted-foreground">
                {selectedDateTime
                  ? `${formatDateTime(selectedDateTime.start)}`
                  : "未選択"}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <ClockIcon className="w-5 h-5 mt-1 text-[#F9802D]" />
            <div>
              <h3 className="font-semibold">予約時間</h3>
              <p className="text-sm text-muted-foreground">
                {selectedDateTime
                  ? `${selectedDateTime.start.toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} - ${selectedDateTime.end.toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "未選択"}
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-start space-x-3">
            <UserIcon className="w-5 h-5 mt-1 text-[#F9802D]" />
            <div>
              <h3 className="font-semibold">担当スタッフ</h3>
              <p className="text-sm text-muted-foreground">
                {selectedStaff ? selectedStaff.name : "指定なし"}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <UserIcon className="w-5 h-5 mt-1 text-[#F9802D]" />
            <div>
              <h3 className="font-semibold">お客様名</h3>
              <p className="text-sm text-muted-foreground">{fullName}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-start space-x-3">
            <ScissorsIcon className="w-5 h-5 mt-1 text-[#F9802D]" />
            <div>
              <h3 className="font-semibold">選択したメニュー</h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                {selectedMenus.map((menu, index) => (
                  <li key={index}>{menu.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground flex items-center justify-center">
          <MailIcon className="w-4 h-4 mr-2 text-[#F9802D]" />
          予約の詳細は、{customerInfo.email} に送信されます。
        </p>
      </CardContent>
      <CardFooter className="flex justify-center pt-6">
        <Button
          onClick={() => router.push("/")}
          className="w-full sm:w-auto bg-[#F9802D] hover:bg-[#E67321] text-white"
        >
          トップページに戻る
        </Button>
      </CardFooter>
    </Card>
  );
}

// ------------------------------
// ヘルパー: 日付フォーマット
// ------------------------------
function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
