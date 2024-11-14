import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

export const dynamic = 'force-dynamic';

dayjs.extend(utc);
dayjs.extend(timezone);

// Supabaseクライアントの作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AccountingInformation {
  customer_name: string;
  updated_at: string;
  items: any[]; // itemsの正確な型を後で定義することをお勧めします
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

    // AuthorizationヘッダーからBearerトークンを取得
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];

    // トークンからユーザー情報を取得
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    // クエリの構築
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
      `)
      .eq("is_temporary", false)
      .eq("reservations.user_id", userId);

    // 検索対象に応じてフィルタリング
    if (searchTarget === "visitDate") {
      if (startDate) {
        query = query.gte("reservations.start_time", startDate);
      }
      if (endDate) {
        query = query.lt("reservations.start_time", endDate);
      }
    } else if (searchTarget === "registrationDate") {
      if (startDate) {
        query = query.gte("register_closings.closing_date", startDate);
      }
      if (endDate) {
        query = query.lt("register_closings.closing_date", endDate);
      }
    }

    // お客様名のフィルター
    if (customer) {
      query = query.ilike("customer_name", `%${customer}%`);
    }

    // データの取得
    const { data: accountingData, error: accountingError } = await query as { data: AccountingInformation[], error: any };

    if (accountingError) {
      console.error("Accounting data fetch error:", accountingError);
      throw new Error(`Failed to fetch accounting data: ${accountingError.message}`);
    }

    let resultData: any[] = [];

    // データの整形とフラット化
    for (const row of accountingData) {
      const { customer_name, updated_at, items, reservations, register_closings } = row;

      const reservation = Array.isArray(reservations) ? reservations[0] : reservations;
      const start_time = reservation?.start_time;

      const closing_date = register_closings && (Array.isArray(register_closings) ? register_closings[0]?.closing_date : register_closings.closing_date) || null;

      for (const item of items) {
        const { category, name, staff: itemStaff, price, quantity } = item;
        const amount = price * quantity;

        // スタッフのフィルターをここで適用
        if (staff && staff !== "all" && itemStaff !== staff) {
          continue; // このアイテムをスキップ
        }

        // メニューのフィルターをここで適用
        if (menu && menu !== "all" && name !== menu) {
          continue; // このアイテムをスキップ
        }

       // 時差調整を省いてそのまま格納
resultData.push({
  customer_name,
  start_time: start_time ? dayjs(start_time).format('YYYY/MM/DD HH:mm') : null,
  closing_date: closing_date ? dayjs(closing_date).format('YYYY/MM/DD HH:mm') : null,
  category,
  name,
  staff: itemStaff,
  price,
  quantity,
  amount,
});
      }
    }

    // ソートキーの動的設定
    const sortKey = searchTarget === "visitDate" ? "start_time" : "closing_date";

    // ソート（新しいものを上に）
    resultData.sort((a, b) => {
      const timeA = new Date(a[sortKey]).getTime();
      const timeB = new Date(b[sortKey]).getTime();
      return timeB - timeA; // 降順（新しいものを上に）
    });

    // ページネーションを適用
    const totalItems = resultData.length;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = page * itemsPerPage;
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