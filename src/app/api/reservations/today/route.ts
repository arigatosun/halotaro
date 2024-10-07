// app/api/reservations/today/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

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

    // 今日の日付範囲を設定
    const startOfDay = dayjs().startOf("day").toISOString();
    const endOfDay = dayjs().endOf("day").toISOString();

    // 本日の予約数を取得
    const { count, error } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("start_time", startOfDay)
      .lte("start_time", endOfDay);

    if (error) {
      throw error;
    }

    return NextResponse.json({ count }, { status: 200 });
  } catch (error: any) {
    console.error("本日の予約数取得エラー:", error);
    return NextResponse.json(
      { error: error.message || "予約数の取得に失敗しました" },
      { status: 500 }
    );
  }
}
