import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reservationId = searchParams.get('id');

  if (!reservationId) {
    return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 });
  }

  try {
    // reservationsテーブルからデータを取得
    const { data: reservationData, error: reservationError } = await supabase
      .from('reservations')
      .select(`
        *,
        menu_items(name),
        staff(name)
      `)
      .eq('id', reservationId)
      .single();

    if (reservationError) throw reservationError;

    // ユーザー名の取得ロジック
    let userName = reservationData.scraped_customer;
    if (!userName) {
      const { data: customerData, error: customerError } = await supabase
        .from('reservation_customers')
        .select('name')
        .eq('reservation_id', reservationId)
        .single();

      if (customerError) throw customerError;
      userName = customerData.name;
    }

    const reservationDetails = {
      id: reservationData.id,
      userName: userName,
      menuName: reservationData.menu_items?.name,
      staffName: reservationData.staff?.name,
      startTime: reservationData.start_time,
      endTime: reservationData.end_time,
    };

    return NextResponse.json(reservationDetails);
  } catch (error) {
    console.error('Error fetching reservation details:', error);
    return NextResponse.json({ error: 'Failed to fetch reservation details' }, { status: 500 });
  }
}