// app/api/unaccounted-reservations/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';

// 環境変数から Supabase の URL と API キーを取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Supabase クライアントを作成
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  // 認証トークンの取得
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];

  // ユーザー情報の取得
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = userData.user.id;

  try {
    // accounting_information テーブルから reservation_id のリストを取得
    const { data: accountedReservations, error: accountedError } = await supabase
      .from('accounting_information')
      .select('reservation_id')
      .eq('user_id', userId); // ユーザーIDでフィルタリング

    if (accountedError) {
      throw accountedError;
    }

    // reservation_id の配列を作成
    const accountedReservationIds: string[] = accountedReservations.map(r => r.reservation_id);

    // 未会計かつ status が 'confirmed' の予約を取得
    let query = supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        menu_id,
        staff_id,
        status,
        total_price,
        created_at,
        updated_at,
        start_time,
        end_time,
        scraped_customer,
        scraped_menu,
        menu_item:menu_items!menu_id(id, name),
        staff (
          id,
          name
        ),
        customer:reservation_customers!customer_id(id, name, name_kana)
      `)
      .lt('start_time', dayjs().toISOString())
      .eq('status', 'confirmed')
      .eq('user_id', userId); // ユーザーIDでフィルタリング

    // accountedReservationIds が存在する場合のみフィルタを追加
    if (accountedReservationIds.length > 0) {
      query = query.not('id', 'in', `(${accountedReservationIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('未会計予約の取得エラー:', error.message || error);
    return NextResponse.json(
      { error: '未会計予約の取得に失敗しました。' },
      { status: 500 }
    );
  }
}
