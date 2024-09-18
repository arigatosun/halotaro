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

    // トランザクションを使用して競合状態を回避
    const { data: reservation, error: reservationError } = await supabase.rpc(
      "create_reservation",
      {
        p_user_id: userId,
        p_menu_id: menuId,
        p_staff_id: staffId,
        p_start_time: startTime,
        p_end_time: endTime,
        p_total_price: totalPrice,
        p_customer_name: customerInfo.name,
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
