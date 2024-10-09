// src/app/api/staff-reservations/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staffId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    let query = supabase
      .from("reservations")
      .select("staff_id, start_time, end_time")
      .gte("start_time", `${startDate}T00:00:00`)
      .lte("end_time", `${endDate}T23:59:59`);

    if (staffId) {
      query = query.eq("staff_id", staffId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // 予約を日付ごとにグループ化
    const reservationsByDate = data.reduce((acc, reservation) => {
      const date = reservation.start_time.split("T")[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push({
        startTime: reservation.start_time,
        endTime: reservation.end_time,
        staffId: reservation.staff_id,
      });
      return acc;
    }, {} as Record<string, { startTime: string; endTime: string; staffId: string }[]>);

    return NextResponse.json(reservationsByDate);
  } catch (error) {
    console.error("Error fetching staff reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff reservations" },
      { status: 500 }
    );
  }
}
