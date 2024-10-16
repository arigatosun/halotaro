// app/api/admin/update-user-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

export async function POST(request: NextRequest) {
  try {
    const { userId, newEmail } = await request.json();

    if (!userId || !newEmail) {
      return NextResponse.json(
        { error: "ユーザーIDと新しいメールアドレスが必要です" },
        { status: 400 }
      );
    }

    // 認証やトークンなしでメールアドレスを直接更新
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email: newEmail,
      }
    );

    if (error) {
      console.error("メールアドレス更新エラー:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "メールアドレスが正常に更新されました",
      data,
    });
  } catch (error) {
    console.error("予期せぬエラー:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 }
    );
  }
}
