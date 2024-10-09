// customer-details/update/route.ts

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
  // 認証チェック
  const authResult = await checkAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const supabase = createRouteHandlerClient({ cookies });

  const body = await request.json();
  const { customerId, detailInfo, memo } = body;

  // customerId が存在するか確認
  if (!customerId) {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
  }

  // detailInfoがない場合は空オブジェクトを代入
  const processedDetailInfo = detailInfo ? {
    ...detailInfo,
    birth_date: detailInfo.birth_date === "" ? null : detailInfo.birth_date, // 修正
    wedding_anniversary: detailInfo.wedding_anniversary === "" ? null : detailInfo.wedding_anniversary, // 修正
    // キャメルケースのフィールドを削除
    birthDate: undefined,
    weddingAnniversary: undefined,
    // memoを含める
    memo: detailInfo.memo === "" ? null : detailInfo.memo,
  } : {};

  try {
    // 既存の詳細情報があるかチェック
    const { data: existingDetail, error } = await supabase
      .from('customer_details')
      .select('id')
      .eq('customer_id', customerId)
      .single();

    if (error && error.code !== 'PGRST116') { // 'PGRST116' はデータが見つからない場合のエラーコード
      console.error('Error checking existing detail:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (existingDetail) {
      // 更新データを動的に構築
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (processedDetailInfo.memo !== undefined) {
        updateData.memo = processedDetailInfo.memo;
      }

      if (detailInfo) {
        if (processedDetailInfo.gender !== undefined) updateData.gender = processedDetailInfo.gender;
        if (processedDetailInfo.birth_date !== undefined) updateData.birth_date = processedDetailInfo.birth_date; // 修正
        if (processedDetailInfo.address !== undefined) updateData.address = processedDetailInfo.address;
        if (processedDetailInfo.wedding_anniversary !== undefined) updateData.wedding_anniversary = processedDetailInfo.wedding_anniversary; // 修正
        if (processedDetailInfo.children !== undefined) updateData.children = processedDetailInfo.children;
      }

      // 更新
      const { error: updateError } = await supabase
        .from('customer_details')
        .update(updateData)
        .eq('customer_id', customerId);

      if (updateError) {
        console.error('Update Error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      // 挿入データを動的に構築
      const insertData: any = {
        customer_id: customerId,
        created_at: new Date().toISOString(),
      };

      if (processedDetailInfo.memo !== undefined) {
        insertData.memo = processedDetailInfo.memo;
      }

      if (detailInfo) {
        if (processedDetailInfo.gender !== undefined) insertData.gender = processedDetailInfo.gender;
        if (processedDetailInfo.birth_date !== undefined) insertData.birth_date = processedDetailInfo.birth_date; // 修正
        if (processedDetailInfo.address !== undefined) insertData.address = processedDetailInfo.address;
        if (processedDetailInfo.wedding_anniversary !== undefined) insertData.wedding_anniversary = processedDetailInfo.wedding_anniversary; // 修正
        if (processedDetailInfo.children !== undefined) insertData.children = processedDetailInfo.children;
      }

      // 挿入
      const { error: insertError } = await supabase
        .from('customer_details')
        .insert(insertData);

      if (insertError) {
        console.error('Insert Error:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ message: 'Detail information updated successfully' });
  } catch (error) {
    console.error('Error updating detail information:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
