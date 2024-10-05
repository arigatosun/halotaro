// src/app/api/salon-cancel-reservation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import moment from 'moment';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  // リクエストボディのパース
  const { reservationId, cancellationType } = await request.json();

  // Supabaseクライアントの初期化
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // 予約情報を取得
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('start_time')
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservation) {
      throw reservationError || new Error('予約が見つかりません');
    }

    const now = moment();
    const startTime = moment(reservation.start_time);

    let status = '';

    if (cancellationType === 'salon_cancellation') {
      status = 'salon_cancelled';
    } else if (cancellationType === 'no_show') {
      if (now.isAfter(startTime)) {
        status = 'no_show';
      } else {
        throw new Error('予約時間前に無断キャンセルはできません');
      }
    } else {
      throw new Error('無効なキャンセルタイプです');
    }

    // 予約のステータス更新
    const { error } = await supabase
      .from('reservations')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId);

    if (error) throw error;

    // TODO: キャンセル確認メールの送信ロジックを追加

    // 成功レスポンスの返却
    return NextResponse.json({ message: '予約が正常にキャンセルされました' }, { status: 200 });
  } catch (error) {
    console.error('予約キャンセル中のエラー:', error);
    return NextResponse.json({ error: '予約のキャンセルに失敗しました' }, { status: 500 });
  }
}
