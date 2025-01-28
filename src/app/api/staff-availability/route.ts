import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import moment from "moment";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  console.group("Staff Availability API Call");
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staffId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const menuId = searchParams.get("menuId");
  const salonId = searchParams.get("salonId");

  console.log("Request Parameters:", {
    staffId,
    startDate,
    endDate,
    menuId,
    salonId,
  });

  if (!startDate || !endDate || !salonId) {
    console.log("Missing Required Parameters");
    console.groupEnd();
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    // メニューに対応できないスタッフのIDを取得
    let unavailableStaffIds: string[] = [];
    let menuIdNumber = parseInt(menuId ?? "", 10);

    // menuId が存在し、かつ数値変換できる場合のみ menu_item_unavailable_staff を参照する
    if (menuId && !isNaN(menuIdNumber)) {
      const { data: unavailableStaffData, error: unavailableStaffError } =
        await supabase
          .from("menu_item_unavailable_staff")
          .select("staff_id")
          .eq("menu_item_id", menuIdNumber);

      console.log("Unavailable Staff Query Result:", {
        data: unavailableStaffData,
        error: unavailableStaffError,
      });

      if (unavailableStaffError) {
        throw unavailableStaffError;
      }

      unavailableStaffIds = unavailableStaffData.map((item) => item.staff_id);
    }

    // サロンの全スタッフIDを取得
    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select("id, name") // nameも取得して確認
      .eq("user_id", salonId);

    console.log("Salon Staff Query Result:", {
      data: staffData,
      error: staffError,
      salonId,
    });

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

    console.log("Staff Availability Check:", {
      totalStaff: staffData.length,
      unavailableStaffCount: unavailableStaffIds.length,
      availableStaffCount: availableStaffIds.length,
      selectedStaffId: staffId,
      isSelectedStaffAvailable: staffId
        ? availableStaffIds.includes(staffId)
        : "No staff selected",
    });

    // 選択されたスタッフが対応可能かチェック
    if (staffId) {
      if (!availableStaffIds.includes(staffId)) {
        console.log("Selected Staff is not available for this menu");
        console.groupEnd();
        return NextResponse.json({});
      }
      availableStaffIds = [staffId];
    }

    if (availableStaffIds.length === 0) {
      console.log("No available staff found");
      console.groupEnd();
      return NextResponse.json({});
    }

    // ストアドプロシージャの呼び出し
    const { data, error } = await supabase.rpc("get_staff_availability", {
      start_date: startDate,
      end_date: endDate,
      staff_ids: availableStaffIds,
    });

    console.log("Stored Procedure Call:", {
      parameters: {
        start_date: startDate,
        end_date: endDate,
        staff_ids: availableStaffIds,
      },
      resultCount: data?.length || 0,
      error: error,
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

    // レスポンスデータの確認
    console.log("Response Data Summary:", {
      totalDates: Object.keys(availabilityByDate).length,
      sampleDate: Object.keys(availabilityByDate)[0],
      totalTimeSlots: Object.keys(
        availabilityByDate[Object.keys(availabilityByDate)[0]] || {}
      ).length,
      staffAvailabilityCount: availableStaffIds.length,
    });

    console.groupEnd();
    return NextResponse.json(availabilityByDate);
  } catch (error) {
    console.error("Error fetching staff availability:", error);
    console.groupEnd();
    return NextResponse.json(
      { error: "Failed to fetch staff availability" },
      { status: 500 }
    );
  }
}
