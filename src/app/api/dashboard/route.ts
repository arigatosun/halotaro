// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// 環境変数の取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// インターフェースの定義
interface AccountingInformationRecord {
  total_price: number;
  reservation_id: string;
}

interface ReservationRecord {
  id: string;
  end_time: string;
  status: string;
}

interface Appointment {
  time: string;
  client: string;
  service: string;
  staff: string;
}

export async function GET(req: NextRequest) {
  try {
    // 認証処理
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    const { data: userData, error: authError } = await supabase.auth.getUser(
      token
    );
    if (authError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = userData.user.id;

    // 日付の設定
    const today = dayjs();
    const yesterday = today.subtract(1, "day");
    const year = today.format("YYYY");
    const month = today.format("MM");
    const selectedDate = dayjs(`${year}-${month}-01`);
    const startOfMonth = selectedDate.startOf("month").toISOString();
    const endOfMonth = selectedDate.endOf("month").toISOString();
    const startOfToday = today.startOf("day").toISOString();
    const endOfToday = today.endOf("day").toISOString();
    const startOfYesterday = yesterday.startOf("day").toISOString();
    const endOfYesterday = yesterday.endOf("day").toISOString();

    // 今日と昨日の予約数を取得（is_staff_schedule = false を追加）
    const [todayReservations, yesterdayReservations] = await Promise.all([
      supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_staff_schedule", false)
        .gte("start_time", startOfToday)
        .lte("start_time", endOfToday),
      supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_staff_schedule", false)
        .gte("start_time", startOfYesterday)
        .lte("start_time", endOfYesterday),
    ]);

    if (todayReservations.error) throw todayReservations.error;
    if (yesterdayReservations.error) throw yesterdayReservations.error;

    const todayReservationsCount = todayReservations.count || 0;
    const yesterdayReservationsCount = yesterdayReservations.count || 0;

    // 売上データの取得（is_staff_schedule = false を追加）
    const { data: reservations, error: reservationsError } = await supabase
      .from("reservations")
      .select("id, end_time, status")
      .eq("user_id", userId)
      .neq("status", "confirmed")
      .eq("is_staff_schedule", false)
      .gte("end_time", startOfMonth)
      .lte("end_time", endOfMonth);

    if (reservationsError) throw reservationsError;

    const reservationIds = reservations.map((res: ReservationRecord) => res.id);

    // accountingRecords の型注釈を追加
    let accountingRecords: AccountingInformationRecord[] = [];
    if (reservationIds.length > 0) {
      const { data: accountingData, error: accountingError } = await supabase
        .from("accounting_information")
        .select("total_price, reservation_id")
        .eq("is_temporary", false)
        .in("reservation_id", reservationIds);

      if (accountingError) throw accountingError;
      accountingRecords = accountingData as AccountingInformationRecord[];
    }

    // reservationMap の作成
    const reservationMap: Record<string, string> = {};
    reservations.forEach((res: ReservationRecord) => {
      reservationMap[res.id] = res.end_time;
    });

    // 日ごとの売上を集計
    const dailySalesMap: { [key: string]: number } = {};
    accountingRecords.forEach((record: AccountingInformationRecord) => {
      const endTime = reservationMap[record.reservation_id];
      if (!endTime) return;
      const date = dayjs(endTime).format("YYYY-MM-DD");
      if (dailySalesMap[date]) {
        dailySalesMap[date] += record.total_price;
      } else {
        dailySalesMap[date] = record.total_price;
      }
    });

    const todayDateStr = today.format("YYYY-MM-DD");
    const yesterdayDateStr = yesterday.format("YYYY-MM-DD");
    const todaySales = dailySalesMap[todayDateStr] || 0;
    const yesterdaySales = dailySalesMap[yesterdayDateStr] || 0;

    // 次の予約一覧を取得（is_staff_schedule = false を追加）
    const now = dayjs();
    const endOfTodayStr = now.endOf("day").toISOString();

    const { data: upcomingReservations, error: upcomingError } = await supabase
      .from("reservations")
      .select(
        `
        start_time,
        scraped_customer,
        scraped_menu,
        reservation_customers!fk_customer(name),
    menu_items!left(name),
        staff!left(name)
      `
      )
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .eq("is_staff_schedule", false)
      .gte("start_time", now.toISOString())
      .lte("start_time", endOfTodayStr)
      .order("start_time", { ascending: true })
      .limit(3);

    if (upcomingError) throw upcomingError;

    const appointments: Appointment[] = upcomingReservations.map(
      (reservation: any) => {
        // クライアント名の取得
        let clientName = reservation.reservation_customers?.name;
        if (!clientName) {
          clientName = reservation.scraped_customer || "顧客名未設定";
        }

        // メニュー名の取得
        let serviceName = reservation.menu_items?.name;
        if (!serviceName) {
          serviceName = reservation.scraped_menu || "サービス未設定";
        }

        // スタッフ名の取得
        const staffName = reservation.staff?.name || "スタッフ未設定";

        return {
          time: dayjs(reservation.start_time).tz("Asia/Tokyo").format("HH:mm"),
          client: clientName,
          service: serviceName,
          staff: staffName,
        };
      }
    );

    // 取得したデータをまとめて返す
    return NextResponse.json(
      {
        todayReservations: todayReservationsCount,
        yesterdayReservations: yesterdayReservationsCount,
        todaySales,
        yesterdaySales,
        upcomingAppointments: appointments,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("ダッシュボードデータ取得エラー:", error);
    return NextResponse.json(
      { error: error.message || "ダッシュボードデータの取得に失敗しました" },
      { status: 500 }
    );
  }
}
