// app/api/sales-details/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

// Supabaseクライアントの作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // ユーザーの予約IDを取得
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('id')
      .eq('user_id', userId);

    if (reservationsError) {
      throw reservationsError;
    }

    const reservationIds = reservations.map((res) => res.id);

    // 該当する予約がない場合、空のデータを返す
    if (reservationIds.length === 0) {
      return NextResponse.json(
        {
          data: [],
          totalItems: 0,
        },
        { status: 200 }
      );
    }

    // クエリの構築
    let query = supabase
      .from("accounting_information")
      .select("customer_name, updated_at, items")
      .eq("is_temporary", false)
      .in("reservation_id", reservationIds);

    // 日付フィルターの適用
    if (startDate) {
      query = query.gte("updated_at", startDate);
    }
    if (endDate) {
      query = query.lte("updated_at", endDate);
    }

    // お客様名のフィルター
    if (customer) {
      query = query.ilike("customer_name", `%${customer}%`);
    }

    // データの取得
    const { data, error } = await query;
    if (error) {
      throw error;
    }

    let resultData = [];

    // データの整形とフィルタリング
    for (const row of data) {
      const { customer_name, updated_at, items } = row;
      for (const item of items) {
        const { category, name, staff: itemStaff, price, quantity } = item;
        const amount = price * quantity;

        // スタッフのフィルター
        if (staff && staff !== "all") {
          if (itemStaff !== staff) continue;
        }

        // メニューのフィルター
        if (menu && menu !== "all") {
          if (name !== menu) continue;
        }

        resultData.push({
          customer_name,
          updated_at,
          category,
          name,
          staff: itemStaff,
          price,
          quantity,
          amount,
        });
      }
    }

    // 合計件数
    const totalItems = resultData.length;

    // ページネーションの適用
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
