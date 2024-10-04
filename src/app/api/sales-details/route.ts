// api/sales-details/route.ts

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
    const sortBy = searchParams.get("sortBy") || "start_time";
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
      .select(
        `
        customer_name,
        updated_at,
        items,
        reservation_id,
        reservations!inner (
          user_id,
          start_time
        )
      `
      )
      .eq("is_temporary", false)
      .eq("reservations.user_id", userId);

    // 検索対象に応じてフィルタリング
    if (searchTarget === "visitDate") {
      if (startDate) {
        query = query.filter("reservations.start_time", "gte", startDate);
      }
      if (endDate) {
        query = query.filter("reservations.start_time", "lte", endDate);
      }
    } else if (searchTarget === "registrationDate") {
      if (startDate) {
        query = query.gte("updated_at", startDate);
      }
      if (endDate) {
        query = query.lte("updated_at", endDate);
      }
    }

    // お客様名のフィルター
    if (customer) {
      query = query.ilike("customer_name", `%${customer}%`);
    }

    // スタッフとメニューのフィルタリングは後で行うため、ここでは除外します

    // データの取得（ページネーションとソートは後で適用）
    const { data: accountingData, error: accountingError } = await query;

    if (accountingError) {
      throw accountingError;
    }

    let resultData: any[] = [];

    // データの整形とフラット化
    for (const row of accountingData) {
      const { customer_name, updated_at, items, reservations } = row;

      const reservation = Array.isArray(reservations) ? reservations[0] : reservations;
      const start_time = reservation?.start_time;

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

        resultData.push({
          customer_name,
          start_time,
          category,
          name,
          staff: itemStaff,
          price,
          quantity,
          amount,
        });
      }
    }

    // 来店日時順にソート
    resultData.sort((a, b) => {
      const timeA = new Date(a.start_time).getTime();
      const timeB = new Date(b.start_time).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
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
