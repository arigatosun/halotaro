// app/api/register-closings/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントの作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    const closingId = params.id;

    // レジ締めデータを取得
    const { data: closingData, error: closingError } = await supabase
      .from('register_closings')
      .select(`
        id,
        closing_date,
        prepared_cash,
        prepared_cash_details,
        actual_cash,
        cash_difference,
        closing_memo,
        cash_in,
        cash_out,
        created_at,
        updated_at,
        closing_staff:staff ( id, name ),
        accounting_information (
          id,
          reservation_id,
          customer_name,
          staff_name,
          payment_methods,
          items,
          total_price,
          created_at
        )
      `)
      .eq('id', closingId)
      .eq('user_id', userId)
      .single();

    if (closingError) {
      console.error('レジ締めデータの取得エラー:', closingError);
      return NextResponse.json(
        { error: 'レジ締めデータの取得に失敗しました。' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: closingData });
  } catch (error: any) {
    console.error('エラー:', error.message || error);
    return NextResponse.json(
      { error: 'データの取得に失敗しました。' },
      { status: 500 }
    );
  }
}
