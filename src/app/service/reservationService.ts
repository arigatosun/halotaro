// services/reservationService.ts

import { supabase } from "@/lib/supabaseClient";
import { resend } from "@/lib/resendClient";
import { CreateReservationBody } from "@/lib/types";
import { generateCancelUrl } from "@/utils/url";

// もし、以下のような React コンポーネントのメールテンプレートを使う場合:
import { ReservationConfirmation } from "@/emails/ReservationConfirmation";
import { NewReservationNotification } from "@/emails/NewReservationNotification";

// -----------------------------
// Validation
// -----------------------------
export function validateRequestBody(body: CreateReservationBody) {
  const {
    userId,
    menuId,
    staffId,
    startTime,
    endTime,
    totalPrice,
    customerInfo,
  } = body;

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
}

// -----------------------------
// DB Query Helpers
// -----------------------------

/**
 * スタッフIDに対応するスタッフ名を返す
 */
export async function fetchStaffName(staffId: string): Promise<string> {
  const { data, error } = await supabase
    .from("staff")
    .select("name")
    .eq("id", staffId)
    .single();

  if (error || !data) {
    throw new Error("スタッフ情報の取得に失敗しました");
  }
  return data.name as string;
}

/**
 * menuId が 数値文字列なら menu_items テーブルを、UUIDなら coupons テーブルを参照し
 * duration と serviceName を返す。どちらか片方だけ取得。
 */
export async function fetchMenuOrCouponInfo(menuId: string) {
  const isMenuIdInteger = /^\d+$/.test(menuId);

  if (isMenuIdInteger) {
    const numericId = Number(menuId);
    const { data, error } = await supabase
      .from("menu_items")
      .select("duration, name")
      .eq("id", numericId)
      .single();

    if (error || !data) {
      throw new Error("メニュー情報の取得に失敗しました");
    }
    return {
      duration: data.duration as number, // 分単位を想定
      serviceName: data.name as string,
      menuId: numericId,
      couponId: null,
    };
  } else {
    // coupons テーブルを参照
    const { data, error } = await supabase
      .from("coupons")
      .select("name")
      .eq("id", menuId)
      .single();

    if (error || !data) {
      throw new Error("クーポン情報の取得に失敗しました");
    }
    return {
      duration: 0, // couponsにはdurationがない想定
      serviceName: data.name as string,
      menuId: null,
      couponId: menuId,
    };
  }
}

/**
 * スタッフ・サロン運営者への通知用メールアドレスを全取得
 */
export async function fetchRecipientEmails(userId: string): Promise<string[]> {
  const emailSet = new Set<string>();

  // スタッフ用通知メール
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
  } else if (staffNotificationEmails?.email_addresses) {
    for (const email of staffNotificationEmails.email_addresses) {
      emailSet.add(email);
    }
  }

  // サロン運営者メール
  const { data: userData, error: userError } = await supabase
    .from("user_view")
    .select("email")
    .eq("id", userId)
    .single();

  if (userError) {
    console.error("Error fetching user email:", userError);
    throw userError;
  } else if (userData?.email) {
    emailSet.add(userData.email);
  } else {
    throw new Error("サロン運営者のメールアドレスが見つかりません");
  }

  return Array.from(emailSet);
}

/**
 * キャンセルポリシーの最長日数を返す
 * cancel_policies テーブル: { policies: [{ days: number }...], customText: ... }
 */
export async function getMaxCancelPolicyDays(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("cancel_policies")
    .select("policies")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      console.log(
        "No cancel policies found for user, using default of 7 days."
      );
      return 7;
    }
    throw new Error("キャンセルポリシーの取得に失敗しました");
  }

  // 例: { policies: [{ days: 1, feePercentage: 100 }], customText: "..." }
  const cancelPolicy = data?.policies;
  if (!cancelPolicy || !Array.isArray(cancelPolicy.policies)) {
    console.log("No valid cancelPolicy found, using default of 7 days.");
    return 7;
  }

  const policiesArray = cancelPolicy.policies;
  const maxDays = Math.max(
    ...policiesArray.map((p: { days: number }) => p.days)
  );
  return maxDays;
}

/**
 * create_reservation RPC を呼び出し予約を作成し、
 * reservation_id と reservation_customer_id を返す
 */
export async function createReservation(
  body: CreateReservationBody
): Promise<{ reservationId: string; reservationCustomerId: string }> {
  const { userId, startTime, endTime, totalPrice, customerInfo, paymentInfo } =
    body;

  // メニュー or クーポンの判定
  const { menuId: p_menu_id, couponId: p_coupon_id } =
    await fetchMenuOrCouponInfo(body.menuId);

  // ★ 名前を姓・名に分ける
  const p_customer_last_name = customerInfo.lastNameKanji; // 例: "山田"
  const p_customer_first_name = customerInfo.firstNameKanji; // 例: "太郎"
  const p_customer_last_name_kana = customerInfo.lastNameKana; // 例: "ヤマダ"
  const p_customer_first_name_kana = customerInfo.firstNameKana; // 例: "タロウ"

  const p_customer_id = body.customerId ?? null;

  const rpcParams = {
    p_user_id: userId,
    p_start_time: startTime,
    p_end_time: endTime,
    p_total_price: totalPrice,
    p_customer_last_name,
    p_customer_first_name,
    p_customer_last_name_kana,
    p_customer_first_name_kana,
    p_customer_id,
    p_customer_email: customerInfo.email,
    p_customer_phone: customerInfo.phone,
    p_menu_id: p_menu_id ?? null,
    p_coupon_id: p_coupon_id ?? null,
    p_staff_id: body.staffId ?? null,
    p_payment_method: paymentInfo?.method ?? null,
    p_payment_status: paymentInfo?.status ?? null,
    p_payment_amount: paymentInfo?.amount ?? totalPrice,
    p_stripe_payment_intent_id: paymentInfo?.stripePaymentIntentId ?? null,
  };

  const { data, error: reservationError } = await supabase.rpc(
    "create_reservation",
    rpcParams
  );

  if (reservationError) {
    console.error("Reservation creation error:", reservationError);
    if (reservationError.code === "23505") {
      // 一意制約違反
      const message = reservationError.message as string;
      const constraintNameMatch = message.match(/constraint "(.+?)"/);
      const constraintName = constraintNameMatch
        ? constraintNameMatch[1]
        : "不明な制約";

      // ステータス409相当のエラー情報を投げる
      throw {
        code: 409,
        error: "この予約は既に存在します",
        details: {
          constraintName,
          constraintViolation: message,
        },
      };
    }
    throw reservationError;
  }

  if (
    !data ||
    data.length === 0 ||
    !data[0].reservation_id ||
    !data[0].reservation_customer_id
  ) {
    console.error(
      "Reservation created but missing reservation_id/customer_id:",
      data
    );
    throw new Error("予約IDまたは予約顧客IDの取得に失敗しました");
  }

  return {
    reservationId: data[0].reservation_id as string,
    reservationCustomerId: data[0].reservation_customer_id as string,
  };
}

/**
 * payment_intents を更新または新規作成し、captureDateを設定
 */
export async function handlePaymentIntents(
  reservationId: string,
  startTime: string,
  maxCancelPolicyDays: number,
  paymentInfo: CreateReservationBody["paymentInfo"],
  userId: string,
  totalPrice: number
) {
  const captureDate = new Date(startTime);
  captureDate.setDate(captureDate.getDate() - maxCancelPolicyDays);

  if (paymentInfo?.stripePaymentIntentId) {
    // 既存payment_intentを更新
    const { data, error } = await supabase
      .from("payment_intents")
      .update({
        reservation_id: reservationId,
        capture_date: captureDate.toISOString(),
        status: paymentInfo.status,
      })
      .eq("payment_intent_id", paymentInfo.stripePaymentIntentId);

    if (error) {
      console.error("Error updating payment_intents:", error);
      throw new Error(
        "Failed to update payment_intents with reservation_id/capture_date"
      );
    }
    console.log("Updated payment_intents:", data);
  } else if (paymentInfo?.isOver30Days) {
    // 30日以上先の予約の場合、新規レコード
    const { data, error } = await supabase.from("payment_intents").insert({
      payment_intent_id: `setup_${reservationId}`, // 一意にする例
      user_id: userId,
      status: "requires_payment_method",
      amount: totalPrice,
      reservation_id: reservationId,
      capture_date: captureDate.toISOString(),
    });

    if (error) {
      console.error("Error creating new payment_intent record:", error);
      throw new Error("Failed to create new payment_intent record");
    }
    console.log("Created new payment_intent record:", data);
  } else {
    console.warn(
      "No stripePaymentIntentId & not over 30 days -> skip payment_intents update."
    );
  }
}

/**
 * stripe_customers テーブルを更新し、reservation_id を関連付け
 */
export async function updateStripeCustomers(
  reservationId: string,
  paymentMethodId: string
) {
  const { error } = await supabase
    .from("stripe_customers")
    .update({ reservation_id: reservationId })
    .eq("payment_method_id", paymentMethodId);

  if (error) {
    console.error("Error updating stripe_customers:", error);
    throw new Error("Failed to update stripe_customers with reservation_id");
  }
  console.log("Successfully updated stripe_customers table");
}

/**
 * 予約に関するメール送信処理
 */
export async function sendReservationEmails(params: {
  reservationId: string;
  customerInfo: CreateReservationBody["customerInfo"];
  startTime: string;
  endTime: string;
  staffName: string;
  serviceName: string;
  totalPrice: number;
  recipientEmails: string[];
}) {
  const {
    reservationId,
    customerInfo,
    startTime,
    endTime,
    staffName,
    serviceName,
    totalPrice,
    recipientEmails,
  } = params;

  // ベースURLの決定（開発・本番で切り替え）
  const baseUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : process.env.NEXT_PUBLIC_BASE_URL || "https://www.harotalo.com";

  // キャンセルURL
  const cancelUrl = generateCancelUrl(baseUrl, reservationId);
  const customerFullName = `${customerInfo.lastNameKanji} ${customerInfo.firstNameKanji}`;

  // 顧客へのメール
  const customerEmailResult = await resend.emails.send({
    from: "Harotalo運営 <noreply@harotalo.com>",
    to: customerInfo.email,
    subject: "予約完了のお知らせ",
    react: ReservationConfirmation({
      customerName: customerFullName,
      dateTime: new Date(startTime).toLocaleString("ja-JP"),
      endTime: new Date(endTime).toLocaleString("ja-JP"),
      staffName,
      serviceName,
      totalPrice,
      reservationId,
      cancelUrl,
    }),
  });
  console.log("Customer email result:", customerEmailResult);

  // サロン運営者 & スタッフ への通知
  if (recipientEmails.length > 0) {
    const notificationEmailResult = await resend.emails.send({
      from: "Harotalo運営 <noreply@harotalo.com>",
      to: recipientEmails,
      subject: "新規予約のお知らせ",
      react: NewReservationNotification({
        customerName: customerFullName,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        dateTime: new Date(startTime).toLocaleString("ja-JP"),
        endTime: new Date(endTime).toLocaleString("ja-JP"),
        staffName,
        serviceName,
        totalPrice,
      }),
    });
    console.log("Notification email result:", notificationEmailResult);
  }
}
