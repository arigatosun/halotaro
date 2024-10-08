// app/api/customer-details/create/route.ts

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// 認証チェック関数
async function checkAuth(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('Authentication error:', error);
    return { error: 'User not authenticated', status: 401 };
  }

  return { user };
}

export async function POST(request: Request) {
  const authResult = await checkAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const userId = authResult.user.id;

  const body = await request.json();
  const { name, kana, phone, email } = body;

  if (!name || !kana || !phone || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // トランザクションを開始
    const { data: customerData, error: customerError } = await supabase
      .from('reservation_customers')
      .insert({
        name,
        name_kana: kana,
        phone,
        email,
      })
      .select();

    if (customerError || !customerData || customerData.length === 0) {
      console.error('Error inserting into reservation_customers:', customerError);
      return NextResponse.json({ error: customerError?.message || 'Failed to create customer' }, { status: 500 });
    }

    const customerId = customerData[0].id;

    // 必要に応じてcustomer_detailsにレコードを作成
    const { error: detailError } = await supabase
      .from('customer_details')
      .insert({
        customer_id: customerId,
        // 他の詳細情報を追加する場合はここに記載
      });

    if (detailError) {
      console.error('Error inserting into customer_details:', detailError);
      return NextResponse.json({ error: detailError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Customer created successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
