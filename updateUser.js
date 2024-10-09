// updateUser.ts
import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

// Supabase の URL と サービスロールキーを設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase クライアントを初期化
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function updateUser() {
  const userId = '422f1a9d-83be-468e-ad6a-bf9b524128f8'; // ユーザーIDを指定
  const updates = {
    email: 'test@harotalo.com', // 新しいメールアドレス
    password: 'harotalo12',    // 新しいパスワード
  };

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);

  if (error) {
    console.error('ユーザー情報の更新中にエラーが発生しました:', error);
  } else {
    console.log('ユーザー情報が正常に更新されました:', data.user);
  }
}

updateUser();
