// /app/api/menu-items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Supabaseクライアント
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];

    const { data: authData, error: authError } = await supabase.auth.getUser(
      token
    );
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authData.user.id;

    // category_id と categories.id を紐づけて JOIN
    // 「categories」というオブジェクトで { id, name, ... } が取れる
    const { data: menuItems, error } = await supabase
      .from("menu_items")
      .select(
        `
        *,
        categories:categories(
          id,
          name
        )
      `
      )
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
