// app/api/cancellations/all/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CANCELLATION_STATUSES = [
  "salon_cancelled",
  "same_day_cancelled",
  "no_show",
  "cancelled",
];

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
    // 認証処理
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = userData.user.id;

    const today = dayjs();

    // 日別データ
    const dates = Array.from({ length: 14 }, (_, i) => today.subtract(i, "day"));
    const dailyDataPromises = dates.map(async (date) => {
      const start = date.startOf("day").toISOString();
      const end = date.endOf("day").toISOString();

      // キャンセル数と総予約数を取得
      const [{ count: cancelCount }, { count: totalCount }] = await Promise.all([
        supabase
          .from("reservations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("status", CANCELLATION_STATUSES)
          .gte("start_time", start)
          .lte("start_time", end),
        supabase
          .from("reservations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("status", VALID_STATUSES)
          .gte("start_time", start)
          .lte("start_time", end),
      ]);

      const rate = totalCount && totalCount > 0 ? (cancelCount! / totalCount) * 100 : 0;

      return {
        date: date.format("M/D"),
        count: cancelCount || 0,
        totalCount: totalCount || 0,
        rate: parseFloat(rate.toFixed(1)),
      };
    });

    const dailyData = await Promise.all(dailyDataPromises);

    // 週別データ
    const weeks = Array.from({ length: 4 }, (_, i) => today.startOf("week").subtract(i, "week"));
    const weeklyDataPromises = weeks.map(async (week) => {
      const start = week.startOf("week").toISOString();
      const end = week.endOf("week").toISOString();

      const [{ count: cancelCount }, { count: totalCount }] = await Promise.all([
        supabase
          .from("reservations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("status", CANCELLATION_STATUSES)
          .gte("start_time", start)
          .lte("start_time", end),
        supabase
          .from("reservations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("status", VALID_STATUSES)
          .gte("start_time", start)
          .lte("start_time", end),
      ]);

      const rate = totalCount && totalCount > 0 ? (cancelCount! / totalCount) * 100 : 0;

      return {
        date: `${week.format("M/D")} - ${week.add(6, "day").format("M/D")}`,
        count: cancelCount || 0,
        totalCount: totalCount || 0,
        rate: parseFloat(rate.toFixed(1)),
      };
    });

    const weeklyData = await Promise.all(weeklyDataPromises);

    // 月別データ
    const months = Array.from({ length: 6 }, (_, i) => today.startOf("month").subtract(i, "month"));
    const monthlyDataPromises = months.map(async (month) => {
      const start = month.startOf("month").toISOString();
      const end = month.endOf("month").toISOString();

      const [{ count: cancelCount }, { count: totalCount }] = await Promise.all([
        supabase
          .from("reservations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("status", CANCELLATION_STATUSES)
          .gte("start_time", start)
          .lte("start_time", end),
        supabase
          .from("reservations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("status", VALID_STATUSES)
          .gte("start_time", start)
          .lte("start_time", end),
      ]);

      const rate = totalCount && totalCount > 0 ? (cancelCount! / totalCount) * 100 : 0;

      return {
        date: month.format("M月"),
        count: cancelCount || 0,
        totalCount: totalCount || 0,
        rate: parseFloat(rate.toFixed(1)),
      };
    });

    const monthlyData = await Promise.all(monthlyDataPromises);

    // データをまとめて返す
    return NextResponse.json({
      dailyData,
      weeklyData,
      monthlyData,
    }, { status: 200 });

  } catch (error: any) {
    console.error("キャンセルデータ取得エラー:", error);
    return NextResponse.json(
      { error: error.message || "キャンセルデータの取得に失敗しました" },
      { status: 500 }
    );
  }
}
