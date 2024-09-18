import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ShiftData {
  date: string;
  start_time: string;
  end_time: string;
}

interface AvailabilityByDate {
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
      .from("staff_shifts")
      .select("date, start_time, end_time")
      .eq("staff_id", staffId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) {
      throw error;
    }

    // シフトデータを日付ごとにグループ化
    const availabilityByDate = (data as ShiftData[]).reduce((acc: AvailabilityByDate, shift) => {
      const date = shift.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push({
        startTime: shift.start_time,
        endTime: shift.end_time
      });
      return acc;
    }, {});

    return NextResponse.json(availabilityByDate);
  } catch (error) {
    console.error("Error fetching staff availability:", error);
    return NextResponse.json({ error: "Failed to fetch staff availability" }, { status: 500 });
  }
}