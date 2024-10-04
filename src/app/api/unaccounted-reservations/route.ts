// app/api/unaccounted-reservations/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    // **修正ポイント**: まず、accounting_information テーブルから reservation_id のリストを取得
    const { data: accountedReservations, error: accountedError } = await supabase
      .from('accounting_information')
      .select('reservation_id');

    if (accountedError) {
      throw accountedError;
    }

    // reservation_id の配列を作成
    const accountedReservationIds = accountedReservations.map(r => r.reservation_id);

   // 除外するステータスのリスト
   const excludedStatuses = ['salon_cancelled', 'cancelled', 'same_day_cancelled', 'no_show'];

   // フィルタリングのために、ステータスをクオートしてカンマで結合
   const statusList = excludedStatuses.map(status => `'${status}'`).join(',');

   // 未会計かつ特定のステータスを除外した予約を取得
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
       menu_items (
         id,
         name
       ),
       staff (
         id,
         name
       ),
       reservation_customers (
         id,
         reservation_id,
         name
       )
     `)
     .not('status', 'in', `(${statusList})`)
     .lt('start_time', new Date().toISOString());

   // accountedReservationIds が存在する場合のみフィルタを追加
   if (accountedReservationIds.length > 0) {
     const idList = accountedReservationIds.map(id => `"${id}"`).join(',');
     const filterValue = `(${idList})`;
     query = query.filter('id', 'not.in', filterValue);
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
