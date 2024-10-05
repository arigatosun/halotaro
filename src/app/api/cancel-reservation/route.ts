import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  // リクエストボディのパース
  const { reservationId, cancellationType } = await request.json();

  // Supabaseクライアントの初期化
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // 予約のステータス更新
    const { error } = await supabase
      .from('reservations')
      .update({
        status: cancellationType === 'same_day_cancellation' ? 'same_day_cancelled' : 'cancelled',
        updated_at: new Date().toISOString(), // updated_at列を更新
      })
      .eq('id', reservationId);

    if (error) throw error;

    // TODO: ここでキャンセル確認メールを送信するロジックを追加します

    // 成功レスポンスの返却
    return NextResponse.json({ message: '予約が正常にキャンセルされました' }, { status: 200 });
  } catch (error) {
    // エラーログの出力
    console.error('予約キャンセル中のエラー:', error);
    
    // エラーレスポンスの返却
    return NextResponse.json({ error: '予約のキャンセルに失敗しました' }, { status: 500 });
  }
}