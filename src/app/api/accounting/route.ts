// app/api/accounting/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 環境変数からSupabaseのURLとサービスキーを取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Supabaseクライアントをサーバーサイドで作成
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
  try {
    // クエリパラメータからreservationIdを取得
    const { searchParams } = new URL(req.url);
    const reservationId = searchParams.get("reservationId");

    if (!reservationId) {
      return NextResponse.json({ error: "reservationId is required" }, { status: 400 });
    }

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

    // 一時保存データを取得
    const { data: accountingData, error: fetchError } = await supabase
      .from("accounting_information")
      .select("*")
      .eq("reservation_id", reservationId)
      .eq("is_temporary", true)
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") { // データが見つからない場合
        return NextResponse.json({ error: "No temporary accounting data found" }, { status: 404 });
      }
      throw fetchError;
    }

    return NextResponse.json(accountingData, { status: 200 });
  } catch (error: any) {
    console.error("一時保存データの取得エラー:", error);
    return NextResponse.json({ error: error.message || "一時保存データの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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

    // リクエストボディからデータを取得
    const {
      reservationId,
      customer_name,
      items,
      staff_name,
      cashier_name,
      payment_methods,
      total_price,
      isTemporary, // 一時保存フラグを取得
    } = await req.json();

    // データのバリデーション（必要に応じて追加）
    if (
      !reservationId ||
      !customer_name ||
      !staff_name ||
      !cashier_name ||
      !payment_methods ||
      typeof total_price !== "number" ||
      !Array.isArray(items)
    ) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    if (isTemporary) {
      // 一時保存の場合、既存の一時保存データを更新または新規作成
      // 既存の一時保存データがあるか確認
      const { data: existingData, error: fetchError } = await supabase
        .from("accounting_information")
        .select("*")
        .eq("reservation_id", reservationId)
        .eq("is_temporary", true)
        .eq("user_id", userId) // user_idでフィルタリング
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (existingData) {
        // 既存の一時保存データを更新
        const { data, error } = await supabase
          .from("accounting_information")
          .update({
            customer_name,
            staff_name,
            cashier_name,
            payment_methods,
            items,
            total_price,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingData.id)
          .eq("user_id", userId); // セキュリティのためにuser_idでフィルタリング

        if (error) {
          throw error;
        }

        return NextResponse.json({ message: "一時保存が更新されました" }, { status: 200 });
      } else {
        // 新規に一時保存データを挿入
        const { data, error } = await supabase
          .from("accounting_information")
          .insert([
            {
              reservation_id: reservationId,
              customer_name,
              staff_name,
              cashier_name,
              payment_methods,
              items,
              total_price,
              is_temporary: true,
              user_id: userId, // 追加
            },
          ]);

        if (error) {
          throw error;
        }

        return NextResponse.json({ message: "一時保存が完了しました" }, { status: 200 });
      }
    } else {
      // 最終会計の場合
      // 一時保存データが存在する場合は更新し、存在しない場合は新規挿入
      const { data: existingTempData, error: fetchTempError } = await supabase
        .from("accounting_information")
        .select("*")
        .eq("reservation_id", reservationId)
        .eq("is_temporary", true)
        .eq("user_id", userId) // user_idでフィルタリング
        .single();

      if (fetchTempError && fetchTempError.code !== "PGRST116") {
        throw fetchTempError;
      }

      if (existingTempData) {
        // 一時保存データを最終保存に更新
        const { data, error } = await supabase
          .from("accounting_information")
          .update({
            customer_name,
            staff_name,
            cashier_name,
            payment_methods,
            items,
            total_price,
            is_temporary: false, // 最終保存
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingTempData.id)
          .eq("user_id", userId); // セキュリティのためにuser_idでフィルタリング

        if (error) {
          throw error;
        }

        return NextResponse.json({ message: "会計情報が更新されました" }, { status: 200 });
      } else {
        // 一時保存データが存在しない場合は新規に最終保存データを挿入
        const { data, error } = await supabase
          .from("accounting_information")
          .insert([
            {
              reservation_id: reservationId,
              customer_name,
              staff_name,
              cashier_name,
              payment_methods,
              items,
              total_price,
              is_temporary: false,
              user_id: userId, // 追加
            },
          ]);

        if (error) {
          console.error("会計情報の保存エラー:", error);
          return NextResponse.json(
            { error: "会計情報の保存に失敗しました" },
            { status: 500 }
          );
        }

        return NextResponse.json({ message: "会計情報が保存されました" }, { status: 200 });
      }
    }
  } catch (error: any) {
    console.error("会計情報の保存エラー:", error);
    return NextResponse.json(
      { error: error.message || "会計情報の保存に失敗しました" },
      { status: 500 }
    );
  }
}
