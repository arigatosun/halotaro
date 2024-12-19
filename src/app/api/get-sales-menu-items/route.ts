// /api/get-sales-menu-items/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// 本番環境でもRLS制御されたテーブルにアクセスし、認証情報を元にユーザー判定をするために、サービスロールキーを使用
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVICE_ROLE_KEYに変更
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
        { message: "認証に失敗しました" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("sales_menu_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("店販メニューの取得エラー:", error);
    return NextResponse.json(
      { message: "店販メニューの取得に失敗しました" },
      { status: 500 }
    );
  }
}
