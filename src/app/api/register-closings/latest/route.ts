// app/api/register-closings/latest/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

export const dynamic = 'force-dynamic';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("ja");

// 日本時間に設定
dayjs.tz.setDefault("Asia/Tokyo");

// Supabaseクライアントの作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
  try {
    // AuthorizationヘッダーからBearerトークンを取得
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];

    // トークンからユーザー情報を取得
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userData.user.id;

    // 最新のclosing_dateを取得
    const { data, error } = await supabase
      .from('register_closings')
      .select('closing_date')
      .eq('user_id', userId)
      .order('closing_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      throw error;
    }

    // closing_dateを日本時間に変換して返す
    const adjustedClosingDate = dayjs(data.closing_date).tz("Asia/Tokyo").format('YYYY-MM-DD HH:mm:ss');

    return NextResponse.json({ closing_date: adjustedClosingDate }, { status: 200 });
  } catch (error: any) {
    console.error('最新レジ締め日時の取得エラー:', error);
    return NextResponse.json(
      { error: error.message || '最新レジ締め日時の取得に失敗しました' },
      { status: 500 }
    );
  }
}
