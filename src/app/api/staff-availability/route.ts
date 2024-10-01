//src/app/api/staff-availability/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import moment from 'moment';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ShiftData {
  date: string;
  start_time: string;
  end_time: string;
}

interface ScheduleData {
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
    // 1. スタッフのシフトデータを取得
    const { data: shiftData, error: shiftError } = await supabase
      .from("staff_shifts")
      .select("date, start_time, end_time")
      .eq("staff_id", staffId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (shiftError) {
      throw shiftError;
    }

    // 2. スタッフスケジュールを取得（is_staff_schedule が true の予約）
    const { data: scheduleData, error: scheduleError } = await supabase
      .from("reservations")
      .select("start_time, end_time")
      .eq("staff_id", staffId)
      .eq("is_staff_schedule", true)
      .gte("start_time", startDate)
      .lte("end_time", endDate);

    if (scheduleError) {
      throw scheduleError;
    }

    // 3. シフトからスタッフスケジュールを差し引いて空き時間を計算
    const availabilityByDate: AvailabilityByDate = {};

    // 日付ごとにシフトを処理
    for (const shift of shiftData as ShiftData[]) {
      const date = shift.date;
      const shiftStart = moment(`${date} ${shift.start_time}`, 'YYYY-MM-DD HH:mm:ss');
      const shiftEnd = moment(`${date} ${shift.end_time}`, 'YYYY-MM-DD HH:mm:ss');

      // シフトの時間帯からスタッフスケジュールの時間帯を差し引く
      let availableTimes = [{ start: shiftStart, end: shiftEnd }];

      for (const schedule of scheduleData as ScheduleData[]) {
        const scheduleStart = moment(schedule.start_time);
        const scheduleEnd = moment(schedule.end_time);

        // シフト内にスタッフスケジュールが含まれる場合、空き時間を調整
        availableTimes = availableTimes.flatMap(time => {
          if (scheduleEnd <= time.start || scheduleStart >= time.end) {
            // スケジュールが現在の時間帯と重ならない場合、そのまま返す
            return [time];
          } else {
            const times = [];
            if (scheduleStart > time.start) {
              times.push({ start: time.start, end: scheduleStart });
            }
            if (scheduleEnd < time.end) {
              times.push({ start: scheduleEnd, end: time.end });
            }
            return times;
          }
        });
      }

      // 結果を availabilityByDate に追加
      availabilityByDate[date] = availableTimes.map(time => ({
        startTime: time.start.format('HH:mm'),
        endTime: time.end.format('HH:mm'),
      }));
    }

    return NextResponse.json(availabilityByDate);
  } catch (error) {
    console.error("Error fetching staff availability:", error);
    return NextResponse.json({ error: "Failed to fetch staff availability" }, { status: 500 });
  }
}
