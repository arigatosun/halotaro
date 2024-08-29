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
    if (!userId || !menuId || !staffId || !startTime || !endTime || !totalPrice || !customerInfo) {
      throw new Error("必須フィールドが不足しています");
    }

    // 予約データの保存
    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .insert({
        user_id: userId,
        menu_id: menuId,
        staff_id: staffId,
        start_time: startTime,
        end_time: endTime,
        status: "confirmed",
        total_price: totalPrice,
      })
      .select()
      .single();

    if (reservationError) {
      console.error("Reservation insert error:", reservationError);
      throw reservationError;
    }

    // 顧客情報の保存
    const { error: customerError } = await supabase
      .from("reservation_customers")
      .insert({
        reservation_id: reservation.id,
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
      });

    if (customerError) {
      console.error("Customer info insert error:", customerError);
      throw customerError;
    }

    // 支払い情報の保存
    if (paymentInfo) {
      const { error: paymentError } = await supabase
        .from("reservation_payments")
        .insert({
          reservation_id: reservation.id,
          payment_method: paymentInfo.method,
          payment_status: paymentInfo.status,
          payment_amount: paymentInfo.amount,
          stripe_payment_intent_id: paymentInfo.stripePaymentIntentId,
        });

      if (paymentError) {
        console.error("Payment info insert error:", paymentError);
        throw paymentError;
      }
    }

    return NextResponse.json({ success: true, reservationId: reservation.id });
  } catch (error: any) {
    console.error("Error saving reservation:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}