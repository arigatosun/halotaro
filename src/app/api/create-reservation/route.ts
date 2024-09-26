// /api/create-reservation/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase クライアントの初期化
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

    // スタッフ名の取得
    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select("name")
      .eq("id", staffId)
      .single();

    if (staffError || !staffData) {
      throw new Error("スタッフ情報の取得に失敗しました");
    }

    const staffName = staffData.name;

    // メニューの所要時間の取得
    const { data: menuData, error: menuError } = await supabase
      .from("menu_items")
      .select("duration")
      .eq("id", menuId)
      .single();

    if (menuError || !menuData) {
      throw new Error("メニュー情報の取得に失敗しました");
    }

    const duration = menuData.duration; // 単位は分と仮定

    // 所要時間を時間と分に分割
    const rsvTermHour = Math.floor(duration / 60).toString();
    const rsvTermMinute = (duration % 60).toString();

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

    // 予約情報の保存が成功したので、内部APIにリクエストを送信
    const automationResponse = await sendReservationToAutomation({
      userId,
      reservationId: reservation.id,
      startTime,
      endTime,
      staffName,
      customerInfo,
      rsvTermHour,
      rsvTermMinute,
    });

    if (!automationResponse.success) {
      console.error("Automation sync failed:", automationResponse.error);
      // TODO: 必要に応じてエラー処理を追加
    }

    return NextResponse.json({ success: true, reservationId: reservation.id });
  } catch (error: any) {
    console.error("Error saving reservation:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// 日付形式を "YYYYMMDD" に変更
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

// 内部APIに予約情報を送信する関数
async function sendReservationToAutomation(reservationData: any) {
  try {
    // 内部APIのURL（環境変数から取得）
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    // 開始日時のDateオブジェクトを作成
    const startDateTime = new Date(reservationData.startTime);

    // 内部APIに渡すデータを作成
    const automationData = {
      user_id: reservationData.userId,
      date: formatDate(reservationData.startTime), // "YYYYMMDD" 形式に変更
      rsv_hour: startDateTime.getHours().toString(),
      rsv_minute: String(startDateTime.getMinutes()).padStart(2, "0"), // 常に2桁で、0分の場合は "00"
      staff_name: reservationData.staffName,
      nm_sei_kana: reservationData.customerInfo.lastNameKana,
      nm_mei_kana: reservationData.customerInfo.firstNameKana,
      nm_sei: reservationData.customerInfo.lastNameKanji,
      nm_mei: reservationData.customerInfo.firstNameKanji,
      rsv_term_hour: reservationData.rsvTermHour,
      rsv_term_minute: reservationData.rsvTermMinute,
    };

    // 内部APIにリクエストを送信
    const response = await fetch(`${apiUrl}/api/salonboard-automation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(automationData),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Automation failed" };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
