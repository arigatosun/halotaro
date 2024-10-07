// app/api/register-closings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("ja");

// 日本時間に設定
dayjs.tz.setDefault("Asia/Tokyo");

// Supabaseクライアントの作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ---------------------------
// 既存の POST ハンドラー
// ---------------------------
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

    // closing_dateを日本時間で調整
    const adjustedClosingDate = dayjs.tz(closing_date, "Asia/Tokyo").toISOString();

    // レジ締めデータを挿入
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

    const registerClosingId = registerClosingData[0].id;

    // accounting_information の is_closed と register_closing_id を更新
    const { error: updateError } = await supabase
      .from('accounting_information')
      .update({ is_closed: true, register_closing_id: registerClosingId })
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

// ---------------------------
// 新規追加の GET ハンドラー
// ---------------------------
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

    // クエリパラメータの取得
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const isPrinted = searchParams.get('isPrinted'); // 追加: 印刷済みフィルタ
    const isNotPrinted = searchParams.get('isNotPrinted'); // 追加: 未印刷フィルタ

    // クエリの構築
    let query = supabase
      .from('register_closings')
      .select(`
        id,
        closing_date,
        cash_difference,
        closing_staff:staff ( id, name ),
        closing_memo
      `)
      .eq('user_id', userId);

    // 日付フィルタの適用
    if (startDate) {
      const adjustedStartDate = dayjs.tz(startDate, "Asia/Tokyo").startOf('day').toISOString();
      query = query.gte('closing_date', adjustedStartDate);
    }
    if (endDate) {
      // 終了日の翌日の0時0分までを含めるために1日を追加
      const adjustedEndDate = dayjs.tz(endDate, "Asia/Tokyo").endOf('day').toISOString();
      query = query.lte('closing_date', adjustedEndDate);
    }

    // ジャーナル印刷フィルタの適用
    if (isPrinted === 'true') {
      query = query.eq('is_printed', true);
    }
    if (isNotPrinted === 'true') {
      query = query.eq('is_printed', false);
    }

    // 結果を締め日で降順にソート
    const { data, error } = await query.order('closing_date', { ascending: false });

    if (error) {
      throw error;
    }

    // 成功レスポンスを返す
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('レジ締めデータの取得エラー:', error.message || error);
    return NextResponse.json(
      { error: 'レジ締めデータの取得に失敗しました。' },
      { status: 500 }
    );
  }
}