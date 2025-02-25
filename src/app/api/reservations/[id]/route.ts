// app/api/reservations/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 環境変数からSupabaseのURLとサービスキーを取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Supabaseクライアントをサーバーサイドで作成
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 有効なステータスのリスト
const validStatuses = [
  "confirmed",
  "cancelled",
  "paid", // 必要に応じて "paid" に変更
  "salon_cancelled",
  "same_day_cancelled",
  "no_show",
  "staff",
];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const reservationId = params.id;

  try {
    // AuthorizationヘッダーからBearerトークンを取得
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];

    // トークンからユーザー情報を取得
    const { data: userData, error: authError } = await supabase.auth.getUser(
      token
    );

    if (authError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    // reservationsテーブルから予約情報を取得し、menu_items、staff、reservation_customers、reservation_menu_itemsをリレーション
    const { data: reservation, error } = await supabase
      .from("reservations")
      .select(
        `
        id,
        user_id,
        menu_id,
        staff_id,
        status,
        total_price,
        created_at,
        updated_at,
        start_time,
        end_time,
        scraped_customer,
        scraped_menu,
        coupon_id,
        is_staff_schedule,
        event,
        menu_items (
          *
        ),
        staff!fk_staff(*),
        reservation_customers!fk_customer (
          id,
          name,
          name_kana
        ),
        reservation_menu_items (
          id,
          menu_id,
          coupon_id,
          name,
          price,
          duration
        )
      `
      )
      .eq("id", reservationId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // 予約が見つからない場合
        return NextResponse.json(
          { error: "Reservation not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    // 一時保存データの取得
    const { data: accountingData, error: fetchError } = await supabase
      .from("accounting_information")
      .select("*")
      .eq("reservation_id", reservationId)
      .eq("is_temporary", true)
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        // 一時保存データが見つからない場合
        return NextResponse.json({ reservation }, { status: 200 });
      }
      throw fetchError;
    }

    return NextResponse.json({ reservation, accountingData }, { status: 200 });
  } catch (error: any) {
    console.error("予約情報の取得エラー:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const reservationId = params.id;

  try {
    // AuthorizationヘッダーからBearerトークンを取得
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];

    // トークンからユーザー情報を取得
    const { data: userData, error: authError } = await supabase.auth.getUser(
      token
    );

    if (authError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    // リクエストボディから新しいステータスを取得
    const { status } = await req.json();

    // ステータスのバリデーション
    if (!status || typeof status !== "string") {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // reservationsテーブルのステータスを更新
    const { data, error } = await supabase
      .from("reservations")
      .update({ status })
      .eq("id", reservationId)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("ステータス更新エラー:", error);
      return NextResponse.json(
        { error: "Failed to update reservation status" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Reservation status updated successfully", reservation: data },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("ステータス更新エラー:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update reservation status" },
      { status: 500 }
    );
  }
}
