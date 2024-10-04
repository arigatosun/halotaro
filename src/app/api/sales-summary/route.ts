// app/api/sales-summary/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

// Supabaseクライアントの作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// レコードの型定義
interface AccountingInformationRecord {
  total_price: number;
  reservation_id: string;
}

interface ReservationRecord {
  id: string;
  end_time: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!year || !month) {
      return NextResponse.json(
        { error: "year and month query parameters are required" },
        { status: 400 }
      );
    }

    const selectedDate = dayjs(`${year}-${month}-01`);
    const startOfMonth = selectedDate.startOf('month').toISOString();
    const endOfMonth = selectedDate.endOf('month').toISOString();

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

    // 1. end_timeでフィルタリングしてユーザーの予約を取得
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('id, end_time')
      .eq('user_id', userId)
      .gte('end_time', startOfMonth)
      .lte('end_time', endOfMonth);

    if (reservationsError) {
      throw reservationsError;
    }

    const reservationRecords: ReservationRecord[] = reservations as ReservationRecord[];

    const reservationIds = reservationRecords.map((res) => res.id);

    // 該当する予約がない場合、空のデータを返す
    if (reservationIds.length === 0) {
      return NextResponse.json(
        {
          salesSummary: {
            totalSales: 0,
            averageSalesPerDay: 0,
          },
          dailySales: [],
        },
        { status: 200 }
      );
    }

    // 2. accounting_informationを取得
    const { data: accountingData, error: accountingError } = await supabase
      .from('accounting_information')
      .select('total_price, reservation_id')
      .eq('is_temporary', false)
      .in('reservation_id', reservationIds);

    if (accountingError) {
      throw accountingError;
    }

    const accountingRecords: AccountingInformationRecord[] = accountingData as AccountingInformationRecord[];

    // Map reservation_id to end_time
    const reservationMap: Record<string, string> = {};
    reservationRecords.forEach((res) => {
      reservationMap[res.id] = res.end_time;
    });

    // 日ごとの売上を集計
    const dailySalesMap: { [key: string]: number } = {};

    accountingRecords.forEach((record) => {
      const endTime = reservationMap[record.reservation_id];
      if (!endTime) return; // end_timeがない場合はスキップ
      const date = dayjs(endTime).format("YYYY-MM-DD");
      if (dailySalesMap[date]) {
        dailySalesMap[date] += record.total_price;
      } else {
        dailySalesMap[date] = record.total_price;
      }
    });

    // データを配列に変換
    const dailySales = Object.keys(dailySalesMap).map((date) => ({
      date,
      total: dailySalesMap[date],
    }));

    // 総売上の計算
    const totalSales = dailySales.reduce((sum, day) => sum + day.total, 0);

    // 日数の計算（データが存在する日数）
    const daysCount = dailySales.length || 1; // ゼロ除算防止

    // 平均売上/日
    const averageSalesPerDay = Math.floor(totalSales / daysCount);

    return NextResponse.json(
      {
        salesSummary: {
          totalSales,
          averageSalesPerDay,
        },
        dailySales,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("月間売上の取得エラー:", error);
    return NextResponse.json(
      { error: error.message || "月間売上の取得に失敗しました" },
      { status: 500 }
    );
  }
}
