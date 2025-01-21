"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  XCircle,
  AlertTriangle,
  Calendar,
  CreditCard,
  Clock,
  Loader2,
} from "lucide-react";

// 予約情報の型定義
interface Reservation {
  id: string;
  start_time: string;
  scraped_menu: string;
  total_price: number;
  user_id: string;
}

// キャンセルポリシー1件の型
interface CancelPolicyItem {
  id: string;
  days: number;
  feePercentage: number;
  message?: string;
}

// DBのcancel_policies.policies カラムが { policies: [...], customText: string } という構造を想定
interface CancelPoliciesFromDB {
  policies: CancelPolicyItem[];
  customText?: string;
}

const CancelReservationContent = ({
  reservationId,
}: {
  reservationId: string;
}) => {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [cancelPolicies, setCancelPolicies] = useState<CancelPolicyItem[]>([]);
  const [cancellationFee, setCancellationFee] = useState(0);
  const [appliedPolicy, setAppliedPolicy] = useState<CancelPolicyItem | null>(
    null
  );
  const [daysUntilReservation, setDaysUntilReservation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasPaymentIntent, setHasPaymentIntent] = useState(false); // 支払い情報の有無

  // 追加: キャンセル処理中かどうか
  const [isCancelling, setIsCancelling] = useState(false);

  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const fetchReservationAndPolicy = async () => {
      setIsLoading(true);
      setError(null);

      if (!reservationId) {
        setError("予約IDが見つかりません。");
        setIsLoading(false);
        return;
      }

      try {
        // 予約情報の取得
        console.log("Fetching reservation with ID:", reservationId);
        const { data: reservationData, error: reservationError } =
          await supabase
            .from("reservations")
            .select("*")
            .eq("id", reservationId)
            .single();

        if (reservationError) {
          console.error("Reservation fetch error:", reservationError);
          throw reservationError;
        }
        if (!reservationData) {
          throw new Error("予約が見つかりません。");
        }
        console.log("Fetched reservation:", reservationData);
        setReservation(reservationData);

        // 支払い情報の有無を確認
        const { data: paymentIntentData, error: paymentIntentError } =
          await supabase
            .from("payment_intents")
            .select("*")
            .eq("reservation_id", reservationId)
            .single();

        if (!paymentIntentError && paymentIntentData) {
          setHasPaymentIntent(true);
          console.log("Payment intent found:", paymentIntentData);
        } else {
          console.log("No payment intent found for this reservation.");
        }

        // キャンセルポリシーの取得
        const { data: policyData, error: policyError } = await supabase
          .from("cancel_policies")
          .select("policies") // { policies: [...], customText: "..." } のみ取得
          .eq("user_id", reservationData.user_id)
          .single();

        if (policyError) {
          console.error("Cancel policy fetch error:", policyError);
          throw policyError;
        }
        if (!policyData || !policyData.policies) {
          throw new Error("キャンセルポリシーが見つかりません。");
        }

        // policyData.policies は { policies: [...], customText: '...' } という構造と想定
        const policyObject: CancelPoliciesFromDB = policyData.policies;
        if (!policyObject.policies || !Array.isArray(policyObject.policies)) {
          throw new Error(
            "キャンセルポリシーが配列として正しく取得できません。"
          );
        }
        console.log("Fetched cancel policy:", policyObject);

        setCancelPolicies(policyObject.policies);

        // 予約までの日数を計算
        const now = new Date();
        const reservationDate = new Date(reservationData.start_time);
        const timeDiff = reservationDate.getTime() - now.getTime();
        const daysDiff = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
        setDaysUntilReservation(daysDiff);

        // 支払い情報がある場合のみキャンセル料を計算
        if (hasPaymentIntent) {
          // ポリシーを日数で昇順にソート
          const sortedPolicies = [...policyObject.policies].sort(
            (a, b) => a.days - b.days
          );

          // 適用可能なポリシーを見つける
          let applicable: CancelPolicyItem | null = null;
          for (let policy of sortedPolicies) {
            if (daysDiff <= policy.days) {
              applicable = policy;
              break;
            }
          }
          setAppliedPolicy(applicable);

          const feePercentage = applicable ? applicable.feePercentage : 0;
          const calculatedFee =
            (reservationData.total_price * feePercentage) / 100;
          setCancellationFee(calculatedFee);
          console.log("Calculated cancellation fee:", calculatedFee);
        } else {
          // 支払い情報がない場合
          setAppliedPolicy(null);
          setCancellationFee(0);
        }
      } catch (error) {
        console.error("Error in fetchReservationAndPolicy:", error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("不明なエラーが発生しました。");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservationAndPolicy();
  }, [reservationId, supabase, hasPaymentIntent]);

  const handleCancelReservation = async () => {
    try {
      if (!reservation) throw new Error("予約情報がありません。");

      setIsCancelling(true); // ローディング開始

      const now = new Date();
      const reservationDate = new Date(reservation.start_time);
      const isSameDay = now.toDateString() === reservationDate.toDateString();
      const cancellationType = isSameDay
        ? "same_day_cancellation"
        : "advance_cancellation";

      const response = await fetch("/api/customer-cancel-reservation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationId,
          cancellationType,
        }),
      });

      if (!response.ok) {
        throw new Error("予約のキャンセルに失敗しました。");
      }

      // キャンセル完了ページに遷移
      router.push(`/cancel-confirmation?id=${reservationId}`);
    } catch (error) {
      console.error("Error in handleCancelReservation:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("予約のキャンセル中に不明なエラーが発生しました。");
      }
    } finally {
      setShowConfirmDialog(false);
      setIsCancelling(false); // ローディング終了
    }
  };

  // --- ローディング中 ---
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- エラー表示 ---
  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>エラー</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // --- 予約情報なし ---
  if (!reservation) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>エラー</AlertTitle>
        <AlertDescription>予約が見つかりません。</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <h1 className="text-2xl font-bold">予約キャンセル</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center">
            <Calendar className="mr-2" />
            <p>
              予約日時:{" "}
              {new Date(reservation.start_time).toLocaleString("ja-JP")}
            </p>
          </div>
          <div className="flex items-center">
            <CreditCard className="mr-2" />
            <p>サービス: {reservation.scraped_menu}</p>
          </div>
          <div className="flex items-center">
            <CreditCard className="mr-2" />
            <p>料金: ¥{reservation.total_price.toLocaleString()}</p>
          </div>
          <div className="flex items-center">
            <Clock className="mr-2" />
            <p>予約までの日数: {daysUntilReservation}日</p>
          </div>

          {hasPaymentIntent ? (
            appliedPolicy ? (
              <>
                <div className="flex items-center">
                  <AlertTriangle className="mr-2" />
                  <p>
                    適用されたポリシー: {appliedPolicy.days}
                    日前までのキャンセル料 {appliedPolicy.feePercentage}%
                  </p>
                </div>
                <div className="flex items-center font-bold">
                  <AlertTriangle className="mr-2" />
                  <p>
                    キャンセル料: ¥{cancellationFee.toLocaleString()} (
                    {(
                      (cancellationFee / reservation.total_price) *
                      100
                    ).toFixed(1)}
                    %)
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center">
                <AlertTriangle className="mr-2" />
                <p>キャンセル料は発生しません。</p>
              </div>
            )
          ) : (
            <div className="flex items-center">
              <AlertTriangle className="mr-2" />
              <p>（支払い未済のためキャンセル料はかかりません）</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={() => setShowConfirmDialog(true)} className="w-full">
            予約をキャンセルする
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約キャンセルの確認</DialogTitle>
            <DialogDescription>
              本当に予約をキャンセルしますか？
              <br />
              {hasPaymentIntent ? (
                appliedPolicy ? (
                  <>キャンセル料: ¥{cancellationFee.toLocaleString()}</>
                ) : (
                  <>キャンセル料は発生しません。</>
                )
              ) : (
                <>支払い情報がないためキャンセル料はかかりません。</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              戻る
            </Button>
            {/**
             * キャンセル確定ボタンをローディング化
             * ボタンを押すと isCancelling = true になり
             * クリック不可＋スピナー表示に
             */}
            <Button
              onClick={handleCancelReservation}
              variant="destructive"
              disabled={isCancelling}
            >
              {isCancelling ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  キャンセル処理中...
                </div>
              ) : (
                "キャンセルを確定する"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CancelReservationPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReservationIdWrapper />
    </Suspense>
  );
};

const ReservationIdWrapper = () => {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("id") || "";
  return <CancelReservationContent reservationId={reservationId} />;
};

export default CancelReservationPage;
