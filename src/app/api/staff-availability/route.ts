// src/app/api/staff-availability/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import moment from "moment";

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

    // ストアドプロシージャの呼び出し
    const { data, error } = await supabase.rpc("get_staff_availability", {
      start_date: startDate,
      end_date: endDate,
      staff_ids: availableStaffIds,
    });

    if (error) {
      throw error;
    }

    // データの整形
    const availabilityByDate: Record<string, Record<string, string[]>> = {};

    data.forEach(
      (row: { staff_id: string; date: string; time_slot: string }) => {
        const dateStr = row.date;
        const timeStr = moment(row.time_slot, "HH:mm:ss").format("HH:mm");
        if (!availabilityByDate[dateStr]) {
          availabilityByDate[dateStr] = {};
        }
        if (!availabilityByDate[dateStr][timeStr]) {
          availabilityByDate[dateStr][timeStr] = [];
        }
        availabilityByDate[dateStr][timeStr].push(row.staff_id);
      }
    );

    return NextResponse.json(availabilityByDate);
  } catch (error) {
    console.error("Error fetching staff availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff availability" },
      { status: 500 }
    );
  }
}
