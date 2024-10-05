// src/app/api/staff-reservations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('staffId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!staffId || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('staff_id', staffId)
      .in('status', ['confirmed', 'pending']) // ここでキャンセルされた予約を除外
      .gte('start_time', startDate)
      .lte('end_time', endDate);

    if (error) throw error;

    const reservationsByDate = data.reduce((acc: any, reservation: any) => {
      const date = reservation.start_time.split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push({
        startTime: reservation.start_time,
        endTime: reservation.end_time,
      });
      return acc;
    }, {});

    return NextResponse.json(reservationsByDate);
  } catch (error) {
    console.error('Error fetching staff reservations:', error);
    return NextResponse.json({ error: 'Failed to fetch staff reservations' }, { status: 500 });
  }
}
