// app/api/cancellations/daily/route.ts
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

    // 過去14日間の日付範囲を設定
    const today = dayjs().startOf("day");
    const dates = Array.from({ length: 14 }, (_, i) => today.subtract(i, "day"));

    const dailyData = await Promise.all(
      dates.map(async (date) => {
        const start = date.startOf("day").toISOString();
        const end = date.endOf("day").toISOString();

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

        // 総予約数
        const { count: totalCount, error: totalError } = await supabase
          .from("reservations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("start_time", start)
          .lte("start_time", end);

        if (totalError) {
          throw totalError;
        }

        const rate = totalCount && totalCount > 0 ? (cancelCount! / totalCount) * 100 : 0;

        return {
          date: date.format("M/D"),
          count: cancelCount || 0,
          rate: parseFloat(rate.toFixed(1)),
        };
      })
    );

    // 日付の新しい順にソート
    const sortedDailyData = dailyData.sort((a, b) => {
      const dateA = dayjs(a.date, "M/D");
      const dateB = dayjs(b.date, "M/D");
      return dateA.isAfter(dateB) ? 1 : -1;
    });

    return NextResponse.json(sortedDailyData, { status: 200 });
  } catch (error: any) {
    console.error("日別キャンセルデータ取得エラー:", error);
    return NextResponse.json(
      { error: error.message || "キャンセルデータの取得に失敗しました" },
      { status: 500 }
    );
  }
}
