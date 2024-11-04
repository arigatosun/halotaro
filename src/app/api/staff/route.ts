// app/api/staff/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

// 環境変数からSupabaseのURLとサービスキーを取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Supabaseクライアントをサーバーサイドで作成
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
  try {
    // AuthorizationヘッダーからBearerトークンを取得
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];

    // トークンからユーザー情報を取得
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    // staffテーブルからユーザーIDに一致するスタッフ情報を取得
    const { data: staff, error } = await supabase
      .from("staff")
      .select("*")
      .eq("user_id", userId)
      .eq("is_published", true); // 公開されているスタッフのみ取得

    if (error) {
      throw error;
    }

    return NextResponse.json(staff, { status: 200 });
  } catch (error: any) {
    console.error("スタッフ情報の取得エラー:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
