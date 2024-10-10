// reservationActions.ts
import { SupabaseClient } from "@supabase/supabase-js";

export interface Reservation {
  id: string;
  user_id: string;
  menu_id: string | null;
  staff_id: string | null;
  status: string;
  total_price: number;
  created_at: string;
  updated_at: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  staff_name: string | null;
  menu_name: string;
  scraped_menu: string | null;
  scraped_customer: string | null;
  coupon_id: string | null;
}

export async function getReservations(
  supabase: SupabaseClient,
  user_id: string,
  date?: string,
  staff?: string,
  menu?: string,
  statuses?: string[],
  page: number = 1,
  limit: number = 30
): Promise<{ data: Reservation[]; count: number }> {
  console.log("getReservations called with:", {
    date,
    staff,
    menu,
    statuses,
    page,
    limit,
  });

  // クエリの構築
  let query = supabase.from("reservations").select(
    `
      *,
      reservation_customers!fk_customer (name_kana),
      staff (name),
      menu_items (name),
      coupons (name)
    `,
    { count: "exact" }
  );

  console.log("user_id:", user_id);

  // user_idでフィルタリング
  query = query.eq("user_id", user_id);

  // その他のフィルタを適用
  if (date) {
    const dateStart = `${date}T00:00:00+09:00`;
    const dateEnd = `${date}T23:59:59+09:00`;

    query = query.gte("start_time", dateStart).lte("start_time", dateEnd);
  }

  if (staff && staff !== "all") {
    query = query.eq("staff_id", staff);
  }

  if (menu) {
    // メニュー名またはクーポン名でフィルタリング
    query = query.or(
      `menu_items.name.ilike.%${menu}%,coupons.name.ilike.%${menu}%,scraped_menu.ilike.%${menu}%`
    );
  }

  if (statuses && statuses.length > 0) {
    query = query.in("status", statuses);
  }

  // 'staff' ステータスの予約を除外
  query = query.neq("status", "staff");

  const { data, error, count } = await query
    .order("start_time", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  console.log("クエリ結果:", { data, error, count });

  if (error) {
    console.error("予約の取得エラー:", error);
    throw new Error("予約の取得に失敗しました");
  }

  let formattedData = data?.map((reservation) => ({
    ...reservation,
    customer_name:
      reservation.reservation_customers?.name_kana ||
      reservation.scraped_customer ||
      "Unknown",
    staff_name: reservation.staff?.name || null,
    menu_name:
      (reservation.menu_id && reservation.menu_items?.name) ||
      (reservation.coupon_id && reservation.coupons?.name) ||
      reservation.scraped_menu ||
      "Unknown",
  }));

  // メニュー検索時に `menu_name` が "Unknown" の予約を除外
  if (menu) {
    formattedData = formattedData.filter(
      (reservation) => reservation.menu_name !== "Unknown"
    );
  }

  console.log("フォーマット後のデータ:", formattedData);

  return {
    data: formattedData as Reservation[],
    count: count || 0,
  };
}
