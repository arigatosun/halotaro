"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export interface Reservation {
  id: string;
  user_id: string;
  menu_id: string;
  staff_id: string;
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
}

export async function getReservations(
  date?: string,
  staff?: string,
  page: number = 1,
  limit: number = 30
): Promise<{ data: Reservation[]; count: number }> {
  console.log("getReservations called with:", { date, staff, page, limit });

  const supabase = createServerComponentClient({ cookies });

  let query = supabase.from("reservations").select(
    `
      *,
      reservation_customers (name),
      staff (name),
      menu_items (name),
      scraped_menu,
      scraped_customer
    `,
    { count: "exact" }
  );

  if (date) {
    query = query
      .gte("start_time", `${date}T00:00:00`)
      .lt("start_time", `${date}T23:59:59`);
  }

  if (staff && staff !== "all") {
    query = query.eq("staff_id", staff);
  }

  const { data, error, count } = await query
    .order("start_time", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  console.log("Query result:", { data, error, count });

  if (error) {
    console.error("Error fetching reservations:", error);
    throw new Error("予約の取得に失敗しました");
  }

  const formattedData = data?.map((reservation) => ({
    ...reservation,
    customer_name:
      reservation.reservation_customers?.[0]?.name ||
      reservation.scraped_customer ||
      "Unknown",
    staff_name: reservation.staff?.name || null,
    menu_name:
      (reservation.menu_id !== 0 && reservation.menu_items?.name) ||
      reservation.scraped_menu ||
      "Unknown",
  }));
  console.log("Formatted data:", formattedData);

  return {
    data: formattedData as Reservation[],
    count: count || 0,
  };
}
