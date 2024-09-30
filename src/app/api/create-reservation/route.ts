import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { ReservationConfirmation } from "../../../emails/ReservationConfirmation";
import { NewReservationNotification } from "../../../emails/NewReservationNotification";
import { generateCancelUrl } from "../../../utils/url";

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Resend クライアントの初期化（メール送信用）
const resend = new Resend(process.env.RESEND_API_KEY!);

// キャンセルポリシーの最長日数を取得する関数
async function getMaxCancelPolicyDays(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('cancel_policies')
    .select('policies')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // 'PGRST116' は行が見つからないエラー
      console.log('No cancel policies found for user, using default of 7 days.');
      return 7; // デフォルトで7日
    } else {
      throw new Error('キャンセルポリシーの取得に失敗しました');
    }
  }

  // policies は JSON 配列として保存されていると仮定
  const policies = data.policies as Array<{ days: number }>;
  const maxDays = Math.max(...policies.map(policy => policy.days));

  return maxDays;
}

export async function POST(request: Request) {
  try {
    // リクエストボディからデータを取得
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

    if (checkError && checkError.code !== "PGRST116") { // 'PGRST116' は行が見つからないエラー
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

    // メニューの所要時間とサービス名の取得
    let duration = 0;
    let serviceName = "";

    if (p_menu_id) {
      // メニュー情報の取得
      const { data: menuData, error: menuError } = await supabase
        .from("menu_items")
        .select("duration, name")
        .eq("id", p_menu_id)
        .single();

      if (menuError || !menuData) {
        throw new Error("メニュー情報の取得に失敗しました");
      }

      duration = menuData.duration; // 単位は分と仮定
      serviceName = menuData.name;
    } else if (p_coupon_id) {
      // クーポン情報の取得
      const { data: couponData, error: couponError } = await supabase
        .from("coupons")
        .select("name")
        .eq("id", p_coupon_id)
        .single();

      if (couponError || !couponData) {
        throw new Error("クーポン情報の取得に失敗しました");
      }

      serviceName = couponData.name;
    }

    // 予約時間の計算
    const rsvTermHour = Math.floor(duration / 60).toString();
    const rsvTermMinute = (duration % 60).toString();

    // スタッフ用通知メールアドレスの取得
    const { data: staffNotificationEmails, error: staffEmailsError } =
      await supabase
        .from("staff_notification_emails")
        .select("email_addresses")
        .eq("user_id", userId)
        .single();

    if (staffEmailsError) {
      console.error(
        "Error fetching staff notification emails:",
        staffEmailsError
      );
    }

    // **キャンセルポリシーの最長日数を取得**
    const maxCancelPolicyDays = await getMaxCancelPolicyDays(userId);

    // **キャプチャ日時を計算**
    const captureDate = new Date(startTime);
    captureDate.setDate(captureDate.getDate() - maxCancelPolicyDays);

    // **予約作成処理**
    const { data, error: reservationError } = await supabase.rpc(
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

    if (!data || data.length === 0 || !data[0].id) {
      console.error("Reservation created but ID is missing", data);
      throw new Error("予約IDの取得に失敗しました");
    }

    const reservationId = data[0].id;
    console.log("Created reservation ID:", reservationId);

    // *** payment_intents テーブルを更新して reservation_id と capture_date を設定 ***
    if (paymentInfo?.stripePaymentIntentId) {
      const { data: paymentIntentData, error: paymentIntentError } = await supabase
        .from('payment_intents')
        .update({
          reservation_id: reservationId,
          capture_date: captureDate.toISOString(), // capture_date を追加
        })
        .eq('payment_intent_id', paymentInfo.stripePaymentIntentId);

      if (paymentIntentError) {
        console.error('Error updating payment_intents with reservation_id and capture_date:', paymentIntentError);
        // エラー処理を行う（必要に応じてレスポンスを返すか、エラーを投げる）
        throw new Error('Failed to update payment_intents with reservation_id and capture_date');
      } else {
        console.log('Updated payment_intents with reservation_id and capture_date:', paymentIntentData);
      }
    } else {
      console.warn('No stripePaymentIntentId provided in paymentInfo.');
    }

    // メール送信処理
    try {
      console.log("Attempting to send emails...");

      // ベースURLの設定
      const baseUrl =
        process.env.NODE_ENV === "development"
          ? "http://localhost:3000"
          : process.env.NEXT_PUBLIC_BASE_URL || "https://www.harotalo.com";

      const cancelUrl = generateCancelUrl(baseUrl, reservationId);

      // 顧客へのメール送信
      const customerEmailResult = await resend.emails.send({
        from: "Harotalo運営 <noreply@harotalo.com>",
        to: customerInfo.email,
        subject: "予約完了のお知らせ",
        react: ReservationConfirmation({
          customerName: customerFullName,
          dateTime: new Date(startTime).toLocaleString("ja-JP"),
          endTime: new Date(endTime).toLocaleString("ja-JP"),
          staffName: staffName,
          serviceName: serviceName,
          totalPrice: totalPrice,
          reservationId: reservationId,
          cancelUrl: cancelUrl,
        }),
      });

      console.log("Customer email result:", customerEmailResult);

      // サロン運営者へのメール送信
      const { data: userData, error: userError } = await supabase
        .from("user_view")
        .select("email")
        .eq("id", userId)
        .single();

      if (userError) {
        console.error("Error fetching user email:", userError);
        throw userError;
      }

      if (!userData || !userData.email) {
        console.error("Salon owner email not found");
        throw new Error("サロン運営者のメールアドレスが見つかりません");
      }

      const ownerEmailResult = await resend.emails.send({
        from: "Harotalo運営 <noreply@harotalo.com>",
        to: userData.email,
        subject: "新規予約のお知らせ",
        react: NewReservationNotification({
          customerName: customerFullName,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
          dateTime: new Date(startTime).toLocaleString("ja-JP"),
          endTime: new Date(endTime).toLocaleString("ja-JP"),
          staffName: staffName,
          serviceName: serviceName,
          totalPrice: totalPrice,
        }),
      });

      console.log("Salon owner email result:", ownerEmailResult);

      // スタッフへのメール送信
      if (staffNotificationEmails && staffNotificationEmails.email_addresses) {
        for (const staffEmail of staffNotificationEmails.email_addresses) {
          const staffEmailResult = await resend.emails.send({
            from: "Harotalo運営 <noreply@harotalo.com>",
            to: staffEmail,
            subject: "新規予約のお知らせ",
            react: NewReservationNotification({
              customerName: customerFullName,
              customerEmail: customerInfo.email,
              customerPhone: customerInfo.phone,
              dateTime: new Date(startTime).toLocaleString("ja-JP"),
              endTime: new Date(endTime).toLocaleString("ja-JP"),
              staffName: staffName,
              serviceName: serviceName,
              totalPrice: totalPrice,
            }),
          });

          console.log(
            `Staff email result for ${staffEmail}:`,
            staffEmailResult
          );
        }
      }

      console.log("Emails sent successfully");
    } catch (emailError) {
      console.error("Error sending emails:", emailError);
      if (emailError instanceof Error) {
        console.error("Error message:", emailError.message);
        console.error("Error stack:", emailError.stack);
      }
      // メール送信エラーはログに記録するが、予約プロセス自体は中断しない
    }

    // 予約情報の保存が成功したので、内部APIにリクエストを送信（非同期）
    sendReservationToAutomation({
      userId,
      reservationId: reservationId,
      startTime,
      endTime,
      staffName,
      customerInfo,
      rsvTermHour,
      rsvTermMinute,
    })
      .then((automationResponse) => {
        if (!automationResponse.success) {
          console.error("Automation sync failed:", automationResponse.error);
          // TODO: 必要に応じてエラー内容をサロンオーナーに通知
        }
      })
      .catch((error) => {
        console.error("Error in sendReservationToAutomation:", error);
        // TODO: 必要に応じてエラー内容をサロンオーナーに通知
      });

    // クライアントへのレスポンスを即座に返す
    return NextResponse.json({ success: true, reservationId: reservationId });
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
