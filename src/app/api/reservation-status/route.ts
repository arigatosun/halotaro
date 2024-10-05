// src/app/api/reservation-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reservationId = searchParams.get('reservationId');

  if (!reservationId) {
    return NextResponse.json({ error: 'reservationId is required' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { data: reservation, error } = await supabase
      .from('reservations')
      .select('status')
      .eq('id', reservationId)
      .single();

    if (error || !reservation) {
      throw error || new Error('予約が見つかりません');
    }

    return NextResponse.json({ status: reservation.status }, { status: 200 });
  } catch (error) {
    console.error('Error fetching reservation status:', error);
    return NextResponse.json({ error: '予約ステータスの取得に失敗しました' }, { status: 500 });
  }
}
