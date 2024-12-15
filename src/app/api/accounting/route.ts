// app/api/accounting/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reservationId = searchParams.get("reservationId");

    if (!reservationId) {
      return NextResponse.json(
        { error: "reservationId is required" },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];

    const { data: userData, error: authError } = await supabase.auth.getUser(
      token
    );

    if (authError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    const { data: accountingData, error: fetchError } = await supabase
      .from("accounting_information")
      .select("*")
      .eq("reservation_id", reservationId)
      .eq("is_temporary", true)
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "No temporary accounting data found" },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    return NextResponse.json(accountingData, { status: 200 });
  } catch (error: any) {
    console.error("一時保存データの取得エラー:", error);
    return NextResponse.json(
      { error: error.message || "一時保存データの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const { data: userData, error: authError } = await supabase.auth.getUser(
      token
    );

    if (authError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    const {
      reservationId,
      customer_name,
      items,
      staff_name,
      cashier_name,
      payment_methods,
      total_price,
      isTemporary,
    } = await req.json();

    // バリデーション（必要に応じて追加可能）
    if (
      !reservationId ||
      !customer_name ||
      !staff_name ||
      !cashier_name ||
      !payment_methods ||
      typeof total_price !== "number" ||
      !Array.isArray(items)
    ) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }

    // 既存のfinal会計データ取得
    const { data: existingFinalData, error: fetchFinalError } = await supabase
      .from("accounting_information")
      .select("*")
      .eq("reservation_id", reservationId)
      .eq("is_temporary", false)
      .eq("user_id", userId)
      .single();

    if (fetchFinalError && fetchFinalError.code !== "PGRST116") {
      throw fetchFinalError;
    }

    // 既存の一時保存データ取得
    const { data: existingTempData, error: fetchTempError } = await supabase
      .from("accounting_information")
      .select("*")
      .eq("reservation_id", reservationId)
      .eq("is_temporary", true)
      .eq("user_id", userId)
      .single();

    if (fetchTempError && fetchTempError.code !== "PGRST116") {
      throw fetchTempError;
    }

    if (isTemporary) {
      // 一時保存の場合
      if (existingFinalData) {
        // 既にfinal会計が存在する場合は一時保存できない
        return NextResponse.json(
          { error: "Final accounting already exists. Cannot save temporary." },
          { status: 400 }
        );
      }

      if (existingTempData) {
        // 既存の一時保存データを更新
        const { error } = await supabase
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
          .eq("id", existingTempData.id)
          .eq("user_id", userId);

        if (error) throw error;

        return NextResponse.json(
          { message: "一時保存が更新されました" },
          { status: 200 }
        );
      } else {
        // 新規に一時保存データを作成
        const { error } = await supabase.from("accounting_information").insert([
          {
            reservation_id: reservationId,
            customer_name,
            staff_name,
            cashier_name,
            payment_methods,
            items,
            total_price,
            is_temporary: true,
            user_id: userId,
          },
        ]);

        if (error) throw error;

        return NextResponse.json(
          { message: "一時保存が完了しました" },
          { status: 200 }
        );
      }
    } else {
      // 最終会計の場合
      if (existingFinalData) {
        // final会計が既に存在するので更新
        const { error } = await supabase
          .from("accounting_information")
          .update({
            customer_name,
            staff_name,
            cashier_name,
            payment_methods,
            items,
            total_price,
            is_temporary: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingFinalData.id)
          .eq("user_id", userId);

        if (error) throw error;

        return NextResponse.json(
          { message: "会計情報が更新されました" },
          { status: 200 }
        );
      } else if (existingTempData) {
        // 一時保存データがある場合はそれをfinalに更新
        const { error } = await supabase
          .from("accounting_information")
          .update({
            customer_name,
            staff_name,
            cashier_name,
            payment_methods,
            items,
            total_price,
            is_temporary: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingTempData.id)
          .eq("user_id", userId);

        if (error) throw error;

        return NextResponse.json(
          { message: "会計情報が更新されました" },
          { status: 200 }
        );
      } else {
        // finalもtempも無い場合はfinal会計を新規作成
        const { error } = await supabase.from("accounting_information").insert([
          {
            reservation_id: reservationId,
            customer_name,
            staff_name,
            cashier_name,
            payment_methods,
            items,
            total_price,
            is_temporary: false,
            user_id: userId,
          },
        ]);

        if (error) {
          console.error("会計情報の保存エラー:", error);
          return NextResponse.json(
            { error: "会計情報の保存に失敗しました" },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { message: "会計情報が保存されました" },
          { status: 200 }
        );
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
