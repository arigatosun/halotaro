import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// サービスロールキーを使用するクライアント（管理者操作用）
const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// anon キーを使用するクライアント（トークン検証用）
const supabase = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('Error listing users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: data.users });
  } catch (err) {
    console.error('Unexpected error in GET /api/users:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 認証ヘッダーからトークンを取得
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      console.error('Authorization header is missing');
      return NextResponse.json({ error: 'Authorization token is missing' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.error('Authorization token is missing after splitting');
      return NextResponse.json({ error: 'Authorization token is missing' }, { status: 401 });
    }

    // anon キーを使用するクライアントでトークンを検証
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      console.error('Error fetching user with token:', userError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 管理者ロールの確認
    const user = userData.user;
    console.log('Authenticated user:', user);
    if (user.user_metadata?.role !== 'admin') {
      console.error('User is not an admin:', user.user_metadata);
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // リクエストボディの取得
    const { userId, email, password } = await request.json();
    console.log('Request body:', { userId, email, password });

    if (!userId) {
      console.error('userId is missing in request body');
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const updates: { email?: string; password?: string } = {};
    if (email) updates.email = email;
    if (password) updates.password = password;

    console.log('Updates to apply:', updates);

    // サービスロールキーを使用するクライアントでユーザー情報を更新
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);

    if (error) {
      console.error('Error updating user:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('User updated successfully:', data.user);

    return NextResponse.json({ user: data.user });
  } catch (err) {
    console.error('Unexpected error in PUT /api/users:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
