import { NextResponse } from 'next/server';
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import moment from 'moment';

export async function GET() {
  console.log('GET request received for calendar-data');
  const supabase = createServerComponentClient({ cookies });

  // スタッフリストの取得
  const { data: staffList, error: staffError } = await supabase
    .from('staff')
    .select('id, name')
    .order('name', { ascending: true });

  if (staffError) {
    console.error('Error fetching staff list:', staffError);
    return NextResponse.json({ error: staffError.message }, { status: 500 });
  }

  // メニューリストの取得
  const { data: menuList, error: menuError } = await supabase
    .from('menu_items')
    .select('id, name, duration, price')
    .order('name', { ascending: true });

  if (menuError) {
    console.error('Error fetching menu list:', menuError);
    return NextResponse.json({ error: menuError.message }, { status: 500 });
  }

  // 予約データの取得
  const { data: reservations, error: reservationError } = await supabase
    .from('reservations')
    .select(`
      *,
      reservation_customers (name, email, phone, name_kana),
      menu_items (name, duration, price),
      staff (name)
    `)
    .order('start_time', { ascending: true });

  if (reservationError) {
    console.error('Error fetching reservations:', reservationError);
    return NextResponse.json({ error: reservationError.message }, { status: 500 });
  }

  const formattedReservations = reservations.map(reservation => ({
    ...reservation,
    customer_name: reservation.scraped_customer || reservation.reservation_customers?.name || 'Unknown',
    menu_name: reservation.menu_items?.name || reservation.scraped_menu || 'Unknown',
    staff_name: reservation.staff?.name || 'Unknown',
    start_time: moment.utc(reservation.start_time).local().format(),
    end_time: moment.utc(reservation.end_time).local().format(),
  }));

  console.log('Formatted reservations:', formattedReservations);

  return NextResponse.json({
    staffList,
    menuList,
    reservations: formattedReservations
  });
}

export async function POST(request: Request) {
  console.log('POST request received for calendar-data');
  const supabase = createServerComponentClient({ cookies });
  const data = await request.json();
  console.log('Received data:', data);

  const { start_time, end_time, ...otherData } = data;

  const { data: newReservation, error } = await supabase
    .from('reservations')
    .insert({
      ...otherData,
      start_time: moment(start_time).utc().format(),
      end_time: moment(end_time).utc().format(),
    })
    .single();

  if (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log('New reservation created:', newReservation);
  return NextResponse.json(newReservation);
}

export async function PUT(request: Request) {
    console.log('PUT request received for calendar-data');
    const supabase = createServerComponentClient({ cookies });
    const data = await request.json();
    console.log('Received data for update:', data);

    // 更新に必要なデータのみを抽出
    const { id, start_time, end_time, staff_id, status, total_price, scraped_customer, scraped_menu } = data;

    try {
        // reservations テーブルの更新
        const { data: updatedReservation, error: updateError } = await supabase
            .from('reservations')
            .update({
                start_time: moment(start_time).utc().format(),
                end_time: moment(end_time).utc().format(),
                staff_id,
                status,
                total_price,
                scraped_customer,
                scraped_menu
            })
            .eq('id', id)
            .single();

        if (updateError) {
            console.error('Error updating reservation:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // 更新後のデータを取得（関連テーブルの情報も含む）
        const { data: fullReservation, error: fetchError } = await supabase
            .from('reservations')
            .select(`
                *,
                reservation_customers (name, email, phone, name_kana),
                menu_items (name, duration, price),
                staff (name)
            `)
            .eq('id', id)
            .single();

        if (fetchError) {
            console.error('Error fetching updated reservation:', fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        console.log('Reservation updated:', fullReservation);
        return NextResponse.json(fullReservation);
    } catch (error) {
        console.error('Unexpected error during reservation update:', error);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
  console.log('DELETE request received for calendar-data');
  const supabase = createServerComponentClient({ cookies });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    console.error('DELETE request received without ID');
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log('Reservation deleted successfully');
  return NextResponse.json({ success: true });
}