"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle } from "lucide-react";

interface Reservation {
  id: string;
  start_time: string;
  scraped_menu: string;
  total_price: number;
}

const CancelConfirmationContent = ({
  reservationId,
}: {
  reservationId: string;
}) => {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchReservation = async () => {
      if (!reservationId) {
        setError("予約IDが見つかりません。");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("reservations")
          .select("*")
          .eq("id", reservationId)
          .single();

        if (error) throw error;
        setReservation(data);
      } catch (error) {
        console.error("Error fetching reservation:", error);
        setError("予約情報の取得に失敗しました。");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservation();
  }, [reservationId, supabase]);

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
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>エラー</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-center">キャンセル完了</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center">以下の予約がキャンセルされました：</p>
          <div className="text-center">
            <p>
              予約日時:{" "}
              {new Date(reservation!.start_time).toLocaleString("ja-JP")}
            </p>
            <p>サービス: {reservation!.scraped_menu}</p>
            <p>料金: ¥{reservation!.total_price.toLocaleString()}</p>
          </div>
          <p className="text-center text-sm text-gray-500">
            キャンセルに関するお問い合わせは、サポートまでご連絡ください。
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const CancelConfirmationPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReservationIdWrapper />
    </Suspense>
  );
};

const ReservationIdWrapper = () => {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("id") || "";
  return <CancelConfirmationContent reservationId={reservationId} />;
};

export default CancelConfirmationPage;
