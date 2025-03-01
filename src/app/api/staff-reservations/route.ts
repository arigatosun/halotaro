// src/app/api/staff-reservations/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import moment from "moment-timezone";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staffId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const menuId = searchParams.get("menuId");
  const salonId = searchParams.get("salonId"); // salonIdを取得
  const excludeStatuses = searchParams.get("excludeStatuses"); // 除外するステータスを取得

  if (!startDate || !endDate || !salonId) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    // メニューに対応できないスタッフのIDを取得
    let unavailableStaffIds: string[] = [];
    if (menuId) {
      const { data: unavailableStaffData, error: unavailableStaffError } =
        await supabase
          .from("menu_item_unavailable_staff")
          .select("staff_id")
          .eq("menu_item_id", menuId);

      if (unavailableStaffError) {
        throw unavailableStaffError;
      }

      unavailableStaffIds = unavailableStaffData.map((item) => item.staff_id);
    }

    // サロンの全スタッフIDを取得
    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select("id")
      .eq("user_id", salonId); // サロンのスタッフに限定

    if (staffError) {
      throw staffError;
    }

    let availableStaffIds = staffData.map((staff) => staff.id);

    // 対応不可スタッフを除外
    if (unavailableStaffIds.length > 0) {
      availableStaffIds = availableStaffIds.filter(
        (id) => !unavailableStaffIds.includes(id)
      );
    }

    // 選択されたスタッフが対応可能かチェック（スタッフを指名している場合）
    if (staffId) {
      if (!availableStaffIds.includes(staffId)) {
        // 対応不可の場合、空の結果を返す
        return NextResponse.json({});
      }
      // 指定されたスタッフのみを対象にする
      availableStaffIds = [staffId];
    }

    if (availableStaffIds.length === 0) {
      // 利用可能なスタッフがいない場合、空の結果を返す
      return NextResponse.json({});
    }

    // 除外するステータスを処理
    let excludeStatusArray: string[] = [];
    if (excludeStatuses) {
      excludeStatusArray = excludeStatuses.split(",");
    }

    // 除外するステータスを括弧付きの文字列に変換（シングルクォートなし）
    const excludeStatusesString =
      excludeStatusArray.length > 0 ? `(${excludeStatusArray.join(",")})` : "";

    // 予約の取得（対応可能なスタッフのみ）
    let query = supabase
      .from("reservations")
      .select("staff_id, start_time, end_time, is_staff_schedule, status")
      .in("staff_id", availableStaffIds)
      .gte("start_time", `${startDate}T00:00:00`)
      .lte("end_time", `${endDate}T23:59:59`);

    // 除外するステータスがある場合、クエリに追加
    if (excludeStatusesString) {
      query = query.not("status", "in", excludeStatusesString);
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
        is_staff_schedule: reservation.is_staff_schedule,
        status: reservation.status,
      });
      return acc;
    }, {} as Record<string, { startTime: string; endTime: string; staffId: string; is_staff_schedule: boolean; status: string }[]>);

    return NextResponse.json(reservationsByDate);
  } catch (error) {
    console.error("Error fetching staff reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff reservations" },
      { status: 500 }
    );
  }
}
