// app/api/menu-items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const { data, error: authError } = await supabase.auth.getUser(token);

    if (authError || !data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = data.user.id; // 正しく user.id を取得

    // user_idに基づいてmenu_itemsを取得
    const { data: menuItems, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return NextResponse.json(menuItems, { status: 200 });
  } catch (error: any) {
    console.error("メニュー項目の取得エラー:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
