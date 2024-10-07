// app/api/reservations/upcoming/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

// 環境変数の設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Reservation {
  start_time: string;
  reservation_customers: {
    name: string;
  };
  menu_items: {
    name: string;
  };
  staff: {
    name: string;
  };
}

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

    // 現在時刻と本日の終了時刻を取得
    const now = dayjs();
    const startOfToday = now.startOf("day").toISOString();
    const endOfToday = now.endOf("day").toISOString();

    const { data: reservations, error } = await supabase
      .from("reservations")
      .select(`
        start_time,
        reservation_customers!fk_customer(name),
        menu_items(name),
        staff(name)
      `)
      .eq("user_id", userId)
      .gte("start_time", now.toISOString())
      .lte("start_time", endOfToday)
      .order("start_time", { ascending: true })
      .limit(3);

    if (error) {
      throw error;
    }

    // 必要な情報を整形
    const appointments = reservations.map((reservation: any) => ({
      time: dayjs(reservation.start_time).format("HH:mm"),
      client: reservation.reservation_customers.name,
      service: reservation.menu_items?.name || "サービス未設定",
      staff: reservation.staff?.name || "スタッフ未設定",
    }));

    return NextResponse.json(appointments, { status: 200 });
  } catch (error: any) {
    console.error("次の予約一覧取得エラー:", error);
    return NextResponse.json(
      { error: error.message || "予約一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
