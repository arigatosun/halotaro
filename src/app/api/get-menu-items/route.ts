import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// SERVICE_ROLE_KEYを使用
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Bearerトークンを取り出す
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    // tokenからユーザーを取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("user.id", user.id);

    // user.id に合致する menu_items を取得
    // JOINして categories の id, name も取得する
    const { data, error } = await supabase
      .from("menu_items")
      .select(
        `
        id,
        user_id,
        name,
        description,
        price,
        duration,
        image_url,
        is_reservable,
        created_at,
        category_id,
        categories ( id, name )
      `
      )
      .eq("user_id", user.id)
      // 第一ソートキー: created_at DESC
      .order("created_at", { ascending: false })
      // 第二ソートキー: id DESC（同一の created_at のとき順序が安定する）
      .order("id", { ascending: false });

    if (error) throw error;

    // Cache-Control ヘッダーを追加（キャッシュを無効化）
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("メニューの取得エラー:", error);
    return NextResponse.json(
      { error: "メニューの取得に失敗しました" },
      { status: 500 }
    );
  }
}
