// app/api/register-closings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';

// Supabaseクライアントの作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
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

    // リクエストボディからデータを取得
    const {
      closing_date,
      prepared_cash,
      prepared_cash_details,
      actual_cash,
      cash_difference,
      closing_memo,
      closing_staff_id,
      cash_in,
      cash_out,
      accounting_ids,
    } = await req.json();

    // 必須フィールドのバリデーション
    if (!closing_date || !closing_staff_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!Array.isArray(accounting_ids) || accounting_ids.length === 0) {
      return NextResponse.json({ error: 'No accounting IDs provided' }, { status: 400 });
    }

    // closing_dateを6時間減算して保存
    const adjustedClosingDate = dayjs(closing_date).subtract(15, 'hour').toISOString();

    // データベースに保存
    const { data: registerClosingData, error: registerClosingError } = await supabase
      .from('register_closings')
      .insert([
        {
          closing_date: adjustedClosingDate,
          prepared_cash,
          prepared_cash_details,
          actual_cash,
          cash_difference,
          closing_memo,
          closing_staff_id,
          cash_in,
          cash_out,
          user_id: userId,
        },
      ])
      .select();

    if (registerClosingError) {
      throw registerClosingError;
    }

    // accounting_information の is_closed を更新
    const { error: updateError } = await supabase
      .from('accounting_information')
      .update({ is_closed: true })
      .in('id', accounting_ids)
      .eq('user_id', userId); // ユーザーIDでフィルタリング

    if (updateError) {
      throw updateError;
    }

    // 成功レスポンスを返す
    return NextResponse.json({ data: registerClosingData }, { status: 201 });
  } catch (error: any) {
    console.error('レジ締めの保存エラー:', error);
    return NextResponse.json(
      { error: error.message || 'レジ締めの保存に失敗しました' },
      { status: 500 }
    );
  }
}
