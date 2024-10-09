// src/app/api/staff-availability/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import moment from "moment";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ShiftData {
  staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface ReservationData {
  staff_id: string;
  start_time: string;
  end_time: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staffId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const menuId = searchParams.get("menuId");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    // シフトの取得
    let shiftQuery = supabase
      .from("staff_shifts")
      .select("staff_id, date, start_time, end_time")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (staffId) {
      shiftQuery = shiftQuery.eq("staff_id", staffId);
    }

    const { data: shiftData, error: shiftError } = await shiftQuery;

    if (shiftError) {
      throw shiftError;
    }

    // 予約の取得
    let reservationQuery = supabase
      .from("reservations")
      .select("staff_id, start_time, end_time")
      .gte("start_time", startDate)
      .lte("end_time", endDate);

    if (staffId) {
      reservationQuery = reservationQuery.eq("staff_id", staffId);
    }

    const { data: reservationData, error: reservationError } =
      await reservationQuery;

    if (reservationError) {
      throw reservationError;
    }

    // 利用可能枠の計算
    const availabilityByDate: Record<string, Record<string, string[]>> = {};

    // 区切り文字を変更（例えば "|" を使用）
    const separator = "|";

    // シフトと予約をスタッフと日付でグループ化
    const shiftsByStaffDate = shiftData.reduce((acc, shift: ShiftData) => {
      const key = `${shift.staff_id}${separator}${shift.date}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(shift);
      return acc;
    }, {} as Record<string, ShiftData[]>);

    const reservationsByStaffDate = reservationData.reduce(
      (acc, res: ReservationData) => {
        const date = moment(res.start_time).format("YYYY-MM-DD");
        const key = `${res.staff_id}${separator}${date}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(res);
        return acc;
      },
      {} as Record<string, ReservationData[]>
    );

    // 時間スロットの定義
    const slotInterval = 30; // 分単位
    const slots = Array.from({ length: 28 }, (_, i) =>
      moment("09:00", "HH:mm")
        .add(i * slotInterval, "minutes")
        .format("HH:mm")
    );

    // 利用可能枠の計算
    for (const shiftKey in shiftsByStaffDate) {
      const [staffId, date] = shiftKey.split(separator);
      const shifts = shiftsByStaffDate[shiftKey];
      const reservations = reservationsByStaffDate[shiftKey] || [];
      console.log("shiftKey:", shiftKey);
      console.log("staffId:", staffId);
      console.log("date:", date);

      // シフトから利用可能な時間スロットを計算
      slots.forEach((time) => {
        const slotStart = moment(`${date} ${time}`);
        const slotEnd = moment(slotStart).add(slotInterval, "minutes");

        // シフト内にあるか確認
        const isInShift = shifts.some((shift) => {
          const shiftStart = moment(`${shift.date} ${shift.start_time}`);
          const shiftEnd = moment(`${shift.date} ${shift.end_time}`);
          return slotStart.isBetween(shiftStart, shiftEnd, null, "[)");
        });

        if (isInShift) {
          // 予約があるか確認
          const isReserved = reservations.some((res) => {
            const resStart = moment(res.start_time);
            const resEnd = moment(res.end_time);
            return slotStart.isBetween(resStart, resEnd, null, "[)");
          });

          if (!isReserved) {
            if (!availabilityByDate[date]) {
              availabilityByDate[date] = {};
            }
            if (!availabilityByDate[date][time]) {
              availabilityByDate[date][time] = [];
            }
            availabilityByDate[date][time].push(staffId);
          }
        }
      });
    }

    return NextResponse.json(availabilityByDate);
  } catch (error) {
    console.error("Error fetching staff availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff availability" },
      { status: 500 }
    );
  }
}
