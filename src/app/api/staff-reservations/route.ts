import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ReservationData {
  start_time: string;
  end_time: string;
}

interface ReservationsByDate {
  [date: string]: { startTime: string; endTime: string }[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staffId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!staffId || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("reservations")
      .select("start_time, end_time")
      .eq("staff_id", staffId)
      .gte("start_time", startDate)
      .lt("end_time", endDate)
      .order("start_time", { ascending: true });

    if (error) {
      throw error;
    }

    // 予約データを日付ごとにグループ化
    const reservationsByDate = (data as ReservationData[]).reduce((acc: ReservationsByDate, reservation) => {
      const date = new Date(reservation.start_time).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push({
        startTime: new Date(reservation.start_time).toISOString(),
        endTime: new Date(reservation.end_time).toISOString()
      });
      return acc;
    }, {});

    return NextResponse.json(reservationsByDate);
  } catch (error) {
    console.error("Error fetching staff reservations:", error);
    return NextResponse.json({ error: "Failed to fetch staff reservations" }, { status: 500 });
  }
}