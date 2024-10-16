// app/api/delete-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// サーバーサイドでのみ使用するSupabaseクライアントを作成
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // サービスロールキーを使用
);

export async function POST(request: NextRequest) {
  // リクエストボディからユーザーIDを取得
  const { userId } = await request.json();

  // 認証チェック（必要に応じて追加）
  // ここで、適切な認証と認可のロジックを実装する必要があります

  if (!userId) {
    return NextResponse.json(
      { error: "ユーザーIDが提供されていません" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error("ユーザー削除エラー:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "ユーザーが正常に削除されました" });
  } catch (error) {
    console.error("予期せぬエラー:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 }
    );
  }
}
