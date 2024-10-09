// app/api/cancellations/monthly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// キャンセルステータス
const CANCELLATION_STATUSES = [
  "salon_cancelled",
  "same_day_cancelled",
  "no_show",
  "cancelled",
];

// 分母となる有効なステータス
const VALID_STATUSES = [
  "confirmed",
  "cancelled",
  "paid",
  "salon_cancelled",
  "same_day_cancelled",
  "no_show",
];

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

    // 過去6ヶ月の月別範囲を設定
    const today = dayjs().startOf("month");
    const months = Array.from({ length: 6 }, (_, i) => today.subtract(i, "month"));

    const monthlyData = await Promise.all(
      months.map(async (month) => {
        const start = month.startOf("month").toISOString();
        const end = month.endOf("month").toISOString();

        // キャンセル数
        const { count: cancelCount, error: cancelError } = await supabase
          .from("reservations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("status", CANCELLATION_STATUSES)
          .gte("start_time", start)
          .lte("start_time", end);

        if (cancelError) {
          throw cancelError;
        }

        // 総予約数（有効なステータスのみ）
        const { count: totalCount, error: totalError } = await supabase
          .from("reservations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("status", VALID_STATUSES) // 分母のフィルタリング
          .gte("start_time", start)
          .lte("start_time", end);

        if (totalError) {
          throw totalError;
        }

        const rate = totalCount && totalCount > 0 ? (cancelCount! / totalCount) * 100 : 0;

        return {
          date: month.format("M月"),
          count: cancelCount || 0,
          totalCount: totalCount || 0, // 総予約数を追加
          rate: parseFloat(rate.toFixed(1)),
        };
      })
    );

    // 月の新しい順にソート
    const sortedMonthlyData = monthlyData.sort((a, b) => {
      const dateA = dayjs(a.date, "M月");
      const dateB = dayjs(b.date, "M月");
      return dateA.isAfter(dateB) ? 1 : -1;
    });

    return NextResponse.json(sortedMonthlyData, { status: 200 });
  } catch (error: any) {
    console.error("月別キャンセルデータ取得エラー:", error);
    return NextResponse.json(
      { error: error.message || "キャンセルデータの取得に失敗しました" },
      { status: 500 }
    );
  }
}
