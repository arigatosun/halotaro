// app/api/accounting-information/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabaseクライアントの作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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

    // accounting_information テーブルからデータを取得
    const { data: accountingData, error: accountingError } = await supabase
      .from("accounting_information")
      .select(
        `
        id,
        reservation_id,
        customer_name,
        staff_name,
        cashier_name,
        payment_methods,
        items,
        total_price,
        created_at,
        updated_at,
        is_temporary,
        is_closed
      `
      )
      .eq("is_temporary", false)
      .eq("is_closed", false) // レジ締めが完了していないものを取得
      .eq("user_id", userId) // ユーザーIDでフィルタリング
      .order("created_at", { ascending: false });

    if (accountingError) {
      throw accountingError;
    }

    return NextResponse.json({ data: accountingData }, { status: 200 });
  } catch (error: any) {
    console.error("会計情報の取得エラー:", error);
    return NextResponse.json(
      { error: error.message || "会計情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
