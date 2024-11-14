import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

export const dynamic = 'force-dynamic';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Tokyo");

// Supabaseクライアントの作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AccountingInformation {
  customer_name: string;
  updated_at: string;
  items: any[];
  reservations: {
    user_id: string;
    start_time: string;
  } | {
    user_id: string;
    start_time: string;
  }[];
  register_closings: {
    closing_date: string;
  } | {
    closing_date: string;
  }[];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const searchTarget = searchParams.get("searchTarget") || "visitDate";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const staff = searchParams.get("staff");
    const customer = searchParams.get("customer");
    const menu = searchParams.get("menu");
    const page = parseInt(searchParams.get("page") || "1");
    const itemsPerPage = parseInt(searchParams.get("itemsPerPage") || "10");
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Authorization check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    // Base query construction
    let query = supabase
      .from("accounting_information")
      .select(`
        customer_name,
        updated_at,
        items,
        register_closing_id,
        reservations!inner (
          user_id,
          start_time
        ),
        register_closings!fk_register_closing_id (
          closing_date
        )
      `, { count: 'exact' })
      .eq("is_temporary", false)
      .eq("reservations.user_id", userId);

    // 日付フィルタリングの適用
    if (startDate || endDate) {
      if (searchTarget === "visitDate") {
        if (startDate) {
          query = query.gte('reservations.start_time', startDate);
        }
        if (endDate) {
          query = query.lte('reservations.start_time', endDate);
        }
      } else {
        if (startDate) {
          query = query.gte('register_closings.closing_date', startDate);
        }
        if (endDate) {
          query = query.lte('register_closings.closing_date', endDate);
        }
      }
    }

    // お客様名のフィルター
    if (customer) {
      query = query.ilike("customer_name", `%${customer}%`);
    }

    // データの取得
    const { data: accountingData, error: accountingError, count } = await query;

    if (accountingError) {
      console.error("Accounting data fetch error:", accountingError);
      throw new Error(`Failed to fetch accounting data: ${accountingError.message}`);
    }

    let resultData: any[] = [];

    // データの整形とフィルタリング
    for (const row of accountingData || []) {
      const { customer_name, items, reservations, register_closings } = row;

      const reservation = Array.isArray(reservations) ? reservations[0] : reservations;
      const register_closing = Array.isArray(register_closings) ? register_closings[0] : register_closings;

      // 日付の処理を改善
      const start_time = reservation?.start_time 
        ? dayjs(reservation.start_time).tz("Asia/Tokyo")
        : null;
      const closing_date = register_closing?.closing_date 
        ? dayjs(register_closing.closing_date).tz("Asia/Tokyo")
        : null;

      for (const item of items) {
        const { category, name, staff: itemStaff, price, quantity } = item;
        const amount = price * quantity;

        // スタッフとメニューのフィルタリング
        if (staff && staff !== "all" && itemStaff !== staff) continue;
        if (menu && menu !== "all" && name !== menu) continue;

        resultData.push({
          customer_name,
          start_time: start_time ? start_time.format("YYYY/MM/DD HH:mm:ss") : null,
          closing_date: closing_date ? closing_date.format("YYYY/MM/DD HH:mm:ss") : null,
          category,
          name,
          staff: itemStaff,
          price,
          quantity,
          amount,
        });
      }
    }

    // ソート
    const sortKey = searchTarget === "visitDate" ? "start_time" : "closing_date";
    resultData.sort((a, b) => {
      if (!a[sortKey]) return 1;
      if (!b[sortKey]) return -1;
      return sortOrder === "desc"
        ? dayjs(b[sortKey]).valueOf() - dayjs(a[sortKey]).valueOf()
        : dayjs(a[sortKey]).valueOf() - dayjs(b[sortKey]).valueOf();
    });

    // ページネーション
    const totalItems = resultData.length;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = resultData.slice(startIndex, endIndex);

    return NextResponse.json(
      {
        data: paginatedData,
        totalItems,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("売上明細の取得エラー:", error);
    return NextResponse.json(
      { error: error.message || "売上明細の取得に失敗しました" },
      { status: 500 }
    );
  }
}