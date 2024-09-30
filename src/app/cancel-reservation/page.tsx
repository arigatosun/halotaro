'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { XCircle, AlertTriangle, Calendar, CreditCard, Clock } from 'lucide-react';

// 予約情報の型定義
interface Reservation {
  id: string;
  start_time: string;
  scraped_menu: string;
  total_price: number;
  user_id: string;
}

// キャンセルポリシーの型定義
interface CancelPolicy {
  id: string;
  days: number;
  feePercentage: number;
  message?: string;
}

const CancelReservationContent = ({ reservationId }: { reservationId: string }) => {
  // 状態変数の定義
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [cancelPolicy, setCancelPolicy] = useState<CancelPolicy[]>([]);
  const [cancellationFee, setCancellationFee] = useState(0);
  const [appliedPolicy, setAppliedPolicy] = useState<CancelPolicy | null>(null);
  const [daysUntilReservation, setDaysUntilReservation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const fetchReservationAndPolicy = async () => {
      setIsLoading(true);
      setError(null);
      
      if (!reservationId) {
        setError('予約IDが見つかりません。');
        setIsLoading(false);
        return;
      }
  
      try {
        console.log('Fetching reservation with ID:', reservationId);
        
        // 予約情報の取得
        const { data: reservationData, error: reservationError } = await supabase
          .from('reservations')
          .select('*')
          .eq('id', reservationId)
          .single();
  
        if (reservationError) {
          console.error('Reservation fetch error:', reservationError);
          throw reservationError;
        }
  
        if (!reservationData) {
          throw new Error('予約が見つかりません。');
        }
  
        console.log('Fetched reservation:', reservationData);
        setReservation(reservationData);
  
        // キャンセルポリシーの取得
        const { data: policyData, error: policyError } = await supabase
          .from('cancel_policies')
          .select('policies')
          .eq('user_id', reservationData.user_id)
          .single();
  
        if (policyError) {
          console.error('Cancel policy fetch error:', policyError);
          throw policyError;
        }
  
        if (!policyData || !policyData.policies) {
          throw new Error('キャンセルポリシーが見つかりません。');
        }
  
        console.log('Fetched cancel policy:', policyData.policies);
        setCancelPolicy(policyData.policies);
  
        // キャンセル料の計算
        const now = new Date();
        const reservationDate = new Date(reservationData.start_time);
        const timeDiff = reservationDate.getTime() - now.getTime();
        const daysDiff = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
        setDaysUntilReservation(daysDiff);
        
        console.log('Days until reservation:', daysDiff);
  
        // ポリシーを日数で降順にソート
        const sortedPolicies = policyData.policies.sort((a: CancelPolicy, b: CancelPolicy) => b.days - a.days);
  
        // 適用可能なポリシーを見つける
        let applicablePolicy = sortedPolicies.find((policy: CancelPolicy) => daysDiff >= policy.days);
        
        // 適用可能なポリシーが見つからない場合、最も小さい `days` のポリシーを適用
        if (!applicablePolicy) {
          applicablePolicy = sortedPolicies[sortedPolicies.length - 1];
        }
        
        console.log('Applicable policy:', applicablePolicy);
        setAppliedPolicy(applicablePolicy || null);
  
        const feePercentage = applicablePolicy ? applicablePolicy.feePercentage : 0;
        const calculatedFee = (reservationData.total_price * feePercentage) / 100;
        
        console.log('Calculated cancellation fee:', calculatedFee);
        setCancellationFee(calculatedFee);
        
      } catch (error) {
        console.error('Error in fetchReservationAndPolicy:', error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('不明なエラーが発生しました。');
        }
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchReservationAndPolicy();
  }, [reservationId, supabase]);

  const handleCancelReservation = async () => {
    try {
      const now = new Date();
      const reservationDate = new Date(reservation!.start_time);
      const isSameDay = now.toDateString() === reservationDate.toDateString();
      const cancellationType = isSameDay ? 'same_day_cancellation' : 'advance_cancellation';
  
      const response = await fetch('/api/cancel-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId,
          cancellationType,
        }),
      });
  
      if (!response.ok) {
        throw new Error('予約のキャンセルに失敗しました。');
      }
  
      // キャンセル完了ページに遷移
      router.push(`/cancel-confirmation?id=${reservationId}`);
    } catch (error) {
      console.error('Error in handleCancelReservation:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('予約のキャンセル中に不明なエラーが発生しました。');
      }
      setShowConfirmDialog(false);
    }
  };

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

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>エラー</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

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
            <p>予約日時: {new Date(reservation.start_time).toLocaleString('ja-JP')}</p>
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
          {appliedPolicy && (
            <div className="flex items-center">
              <AlertTriangle className="mr-2" />
              <p>適用されたポリシー: {appliedPolicy.days}日前までのキャンセル料 {appliedPolicy.feePercentage}%</p>
            </div>
          )}
          <div className="flex items-center font-bold">
            <AlertTriangle className="mr-2" />
            <p>キャンセル料: ¥{cancellationFee.toLocaleString()} ({(cancellationFee / reservation.total_price * 100).toFixed(1)}%)</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={() => setShowConfirmDialog(true)} className="w-full">予約をキャンセルする</Button>
        </CardFooter>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約キャンセルの確認</DialogTitle>
            <DialogDescription>
              本当に予約をキャンセルしますか？<br />
              キャンセル料: ¥{cancellationFee.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>戻る</Button>
            <Button onClick={handleCancelReservation} variant="destructive">キャンセルを確定する</Button>
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
  const reservationId = searchParams.get('id') || '';
  return <CancelReservationContent reservationId={reservationId} />;
};

export default CancelReservationPage;