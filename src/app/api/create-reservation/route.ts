import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const {
      userId,
      menuId,
      staffId,
      startTime,
      endTime,
      totalPrice,
      customerInfo,
      paymentInfo,
    } = await request.json();

    console.log("Received reservation data:", {
      userId,
      menuId,
      staffId,
      startTime,
      endTime,
      totalPrice,
      customerInfo,
      paymentInfo,
    });

    // 必須フィールドの検証
    if (
      !userId ||
      !menuId ||
      !staffId ||
      !startTime ||
      !endTime ||
      !totalPrice ||
      !customerInfo
    ) {
      throw new Error("必須フィールドが不足しています");
    }

    // 重複チェック
    const { data: existingReservation, error: checkError } = await supabase
      .from("reservations")
      .select()
      .eq("user_id", userId)
      .eq("staff_id", staffId)
      .eq("start_time", startTime)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (existingReservation) {
      return NextResponse.json(
        { error: "この予約は既に存在します" },
        { status: 409 }
      );
    }

    // メニューIDが整数かどうかを判定

    const isMenuIdInteger = /^\d+$/.test(menuId);
    const p_menu_id = isMenuIdInteger ? Number(menuId) : null;
    const p_coupon_id = isMenuIdInteger ? null : menuId; // UUID の場合

    // フルネームとフルネーム（カナ）を組み立てる
    const customerFullName = `${customerInfo.lastNameKanji} ${customerInfo.firstNameKanji}`;
    const customerFullNameKana = `${customerInfo.lastNameKana} ${customerInfo.firstNameKana}`;

    // RPC関数の呼び出し
    const { data: reservation, error: reservationError } = await supabase.rpc(
      "create_reservation",
      {
        p_user_id: userId,
        p_menu_id: p_menu_id,
        p_coupon_id: p_coupon_id,
        p_staff_id: staffId,
        p_start_time: startTime,
        p_end_time: endTime,
        p_total_price: totalPrice,
        p_customer_name: customerFullName,
        p_customer_name_kana: customerFullNameKana,
        p_customer_email: customerInfo.email,
        p_customer_phone: customerInfo.phone,
        p_payment_method: paymentInfo?.method,
        p_payment_status: paymentInfo?.status,
        p_payment_amount: paymentInfo?.amount,
        p_stripe_payment_intent_id: paymentInfo?.stripePaymentIntentId,
      }
    );

    if (reservationError) {
      console.error("Reservation creation error:", reservationError);
      throw reservationError;
    }

    return NextResponse.json({ success: true, reservationId: reservation.id });
  } catch (error: any) {
    console.error("Error saving reservation:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}