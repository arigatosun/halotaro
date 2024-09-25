import { NextResponse } from 'next/server';
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET() {
  const supabase = createServerComponentClient({ cookies });

  // スタッフリストの取得
  const { data: staffList, error: staffError } = await supabase
    .from('staff')
    .select('id, name')
    .order('name', { ascending: true });

  if (staffError) {
    return NextResponse.json({ error: staffError.message }, { status: 500 });
  }

  // メニューリストの取得
  const { data: menuList, error: menuError } = await supabase
    .from('menu_items')
    .select('id, name, duration, price')
    .order('name', { ascending: true });

  if (menuError) {
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
    return NextResponse.json({ error: reservationError.message }, { status: 500 });
  }

  const formattedReservations = reservations.map(reservation => ({
    ...reservation,
    customer_name: reservation.scraped_customer || reservation.reservation_customers?.name || 'Unknown',
    menu_name: reservation.menu_items?.name || reservation.scraped_menu || 'Unknown',
    staff_name: reservation.staff?.name || 'Unknown'
  }));

  return NextResponse.json({
    staffList,
    menuList,
    reservations: formattedReservations
  });
}