'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Reservation {
  id: string;
  start_time: string;
  scraped_menu: string;
  total_price: number;
  user_id: string;
}

interface CancelPolicy {
  id: string;
  days: number;
  feePercentage: number;
  message?: string;
}

const CancelReservationPage = () => {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [cancelPolicy, setCancelPolicy] = useState<CancelPolicy[]>([]);
  const [cancellationFee, setCancellationFee] = useState(0);
  const [appliedPolicy, setAppliedPolicy] = useState<CancelPolicy | null>(null);
  const [daysUntilReservation, setDaysUntilReservation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const reservationId = searchParams.get('id');

  const supabase = createClientComponentClient();

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
        
        // Fetch reservation
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

        // Fetch cancel policy
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

         // Calculate cancellation fee
         const now = new Date();
         const reservationDate = new Date(reservationData.start_time);
         const daysDiff = Math.max(0, Math.ceil((reservationDate.getTime() - now.getTime()) / (1000 * 3600 * 24)));
         setDaysUntilReservation(daysDiff);
         
         console.log('Days until reservation:', daysDiff);
 
         // Sort policies by days in ascending order
         const sortedPolicies = policyData.policies.sort((a: CancelPolicy, b: CancelPolicy) => a.days - b.days);
 
         // Find the applicable policy
         const applicablePolicy = sortedPolicies.reduce((prev: CancelPolicy, curr: CancelPolicy) => {
           if (daysDiff <= curr.days) {
             return curr;
           }
           return prev;
         }, sortedPolicies[0]);
         
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
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservationId);

      if (error) throw error;

      // ここで予約キャンセル完了のメールを送信するロジックを追加

      alert('予約がキャンセルされました。');
    } catch (error) {
      console.error('Error in handleCancelReservation:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('予約のキャンセル中に不明なエラーが発生しました。');
      }
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <Alert><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!reservation) return <Alert><AlertTitle>Error</AlertTitle><AlertDescription>予約が見つかりません。</AlertDescription></Alert>;

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold">予約キャンセル</h1>
        </CardHeader>
        <CardContent>
          <p>予約日時: {new Date(reservation.start_time).toLocaleString('ja-JP')}</p>
          <p>サービス: {reservation.scraped_menu}</p>
          <p>料金: ¥{reservation.total_price.toLocaleString()}</p>
          <p>予約までの日数: {daysUntilReservation}日</p>
          {appliedPolicy && (
            <p>適用されたポリシー: {appliedPolicy.days}日前までのキャンセル料 {appliedPolicy.feePercentage}%</p>
          )}
          <p>キャンセル料: ¥{cancellationFee.toLocaleString()} ({(cancellationFee / reservation.total_price * 100).toFixed(1)}%)</p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleCancelReservation}>予約をキャンセルする</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CancelReservationPage;