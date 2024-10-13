// /api/get-sales-menu-items/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // またはサービスキー
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return NextResponse.json(
        { message: "認証情報が提供されていません" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { message: "ユーザーの認証に失敗しました" },
        { status: 401 }
      );
    }

    const userId = user.id;

    const { data, error } = await supabase
      .from("sales_menu_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("店販メニューの取得エラー:", error);
    return NextResponse.json(
      { message: "店販メニューの取得に失敗しました" },
      { status: 500 }
    );
  }
}
