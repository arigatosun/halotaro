// app/api/reservation-list-view/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface Reservation {
  id: string;
  user_id: string;
  menu_id: string | null;
  staff_id: string | null;
  status: string;
  total_price: number;
  created_at: string;
  updated_at: string;
  start_time: string;
  end_time: string;
  coupon_id?: string;
  scraped_customer: string | null;
  scraped_menu: string | null;
  customer_name?: string;
  staff_name?: string | null;
  menu_name?: string;
  reservation_customers?: {
    name_kana: string;
  } | null;
  staff?: {
    id: string;
    name: string;
    user_id: string;
  } | null;
  menu_items?: {
    name: string;
  } | null;
  coupons?: {
    name: string;
  } | null;
  // 必要に応じて他のプロパティを追加
}

export async function GET(request: NextRequest) {
  const supabase = createServerComponentClient({ cookies });

  // ユーザーのセッションを取得
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user_id = session.user.id;

  // クエリパラメータからフィルタリング条件を取得
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const date = searchParams.get('date');
  const staff = searchParams.get('staff');
  const menu = searchParams.get('menu');
  const statusesParam = searchParams.get('statuses');
  const statuses = statusesParam ? statusesParam.split(',') : [];
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '30', 10);

  // Supabaseクエリを構築
  let query = supabase
    .from('reservations')
    .select(
      `
        *,
        reservation_customers!inner(name_kana),
        staff!inner(id, name, user_id),
        menu_items (name),
        coupons (name)
      `,
      { count: 'exact' }
    )
    .eq('staff.user_id', user_id); // スタッフのuser_idでフィルタリング

  // その他のフィルタを適用
  if (date) {
    const dateStart = `${date}T00:00:00+09:00`;
    const dateEnd = `${date}T23:59:59+09:00`;
    query = query.gte('start_time', dateStart).lte('start_time', dateEnd);
  }

  if (staff && staff !== 'all') {
    query = query.eq('staff_id', staff);
  }

  if (menu) {
    query = query.or(
      `menu_items.name.ilike.%${menu}%,coupons.name.ilike.%${menu}%,scraped_menu.ilike.%${menu}%`
    );
  }

  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses);
  }

  // 'staff' ステータスの予約を除外
  query = query.neq('status', 'staff');

  // ページネーションを適用
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .order('start_time', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('予約の取得エラー:', error);
    return NextResponse.json({ error: '予約の取得に失敗しました' }, { status: 500 });
  }

  // データの整形
  const formattedData = data?.map((reservation: Reservation) => ({
    ...reservation,
    customer_name:
      reservation.reservation_customers?.name_kana ||
      reservation.scraped_customer ||
      'Unknown',
    staff_name: reservation.staff?.name || null,
    menu_name:
      (reservation.menu_id && reservation.menu_items?.name) ||
      (reservation.coupon_id && reservation.coupons?.name) ||
      reservation.scraped_menu ||
      'Unknown',
  }));

  return NextResponse.json({ data: formattedData, count });
}
