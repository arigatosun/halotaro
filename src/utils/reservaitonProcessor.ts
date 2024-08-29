import { ProcessedReservation, RawReservation } from "@/types/reservations";
import { createClient } from "@supabase/supabase-js";
import { parseISO, addMinutes, formatISO, parse, format } from "date-fns";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function parseDateTime(dateTimeString: string): Date {
  // "2024-08-03 05:00:00+00" 形式を解析
  return parse(dateTimeString, "yyyy-MM-dd HH:mm:ssX", new Date());
}

export async function processReservation(
  raw: RawReservation,
  userId: string
): Promise<ProcessedReservation> {
  const [datePart, timePart] = raw.date.split(/(?<=^\S+)\s/);
  const startTime = parseDateTime(raw.date);
  const endTime = addMinutes(startTime, 90); // 仮に90分としています

  const menuId = await getMenuId(raw.menu);
  const staffId = await getStaffId(raw.staff);

  return {
    user_id: userId,
    menu_id: menuId,
    staff_id: staffId,
    status: mapStatus(raw.status),
    total_price: parseFloat(raw.amount.replace(/[^\d.-]/g, "")) || 0,
    start_time: format(startTime, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    end_time: format(endTime, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    created_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
    updated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
  };
}

async function getMenuId(menuName: string): Promise<number> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id")
    .ilike("name", `%${menuName}%`)
    .single();

  if (error) {
    console.error("Error fetching menu ID:", error);
    return 0;
  }

  return data?.id || 0;
}

async function getStaffId(staffName: string): Promise<string | null> {
  // "(指)" を削除
  const cleanedStaffName = staffName.replace(/（指）|\(指\)/g, "").trim();

  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .ilike("name", `%${cleanedStaffName}%`)
    .single();

  if (error) {
    console.error("Error fetching staff ID:", error);
    return null;
  }

  return data?.id || null;
}

function mapStatus(status: string): string {
  // ステータスのマッピングを実装
  const statusMap: { [key: string]: string } = {
    受付待ち: "pending",
    済み: "completed",
    お断り: "rejected",
    お客様キャンセル: "cancelled",
    サロンキャンセル: "cancelled_by_salon",
    無断キャンセル: "no_show",
    自動キャンセル: "auto_cancelled",
  };

  return statusMap[status] || "unknown";
}
