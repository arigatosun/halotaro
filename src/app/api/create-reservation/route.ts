import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { ReservationConfirmation } from "../../../emails/ReservationConfirmation";
import { NewReservationNotification } from "../../../emails/NewReservationNotification";
import { SynchronizationErrorNotification } from "../../../emails/SynchronizationErrorNotification";
import { generateCancelUrl } from "../../../utils/url";
import * as Sentry from "@sentry/nextjs";

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is not set in the environment variables");
}
const resend = new Resend(resendApiKey);

// キャンセルポリシーの最長日数を取得する関数
async function getMaxCancelPolicyDays(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("cancel_policies")
    .select("policies")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // 'PGRST116' は行が見つからないエラー
      console.log(
        "No cancel policies found for user, using default of 7 days."
      );
      return 7; // デフォルトで7日
    } else {
      throw new Error("キャンセルポリシーの取得に失敗しました");
    }
  }

  // policies は JSON 配列として保存されていると仮定
  const policies = data.policies as Array<{ days: number }>;
  const maxDays = Math.max(...policies.map((policy) => policy.days));

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
      paymentMethodId,
      customerEmail,
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

    // 受信者メールアドレスのセットを初期化
    let recipientEmailSet = new Set<string>();

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
    } else if (
      staffNotificationEmails &&
      staffNotificationEmails.email_addresses
    ) {
      for (const email of staffNotificationEmails.email_addresses) {
        recipientEmailSet.add(email);
      }
    }

    // サロン運営者のメールアドレスの取得
    const { data: userData, error: userError } = await supabase
      .from("user_view")
      .select("email")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Error fetching user email:", userError);
      throw userError;
    } else if (userData && userData.email) {
      recipientEmailSet.add(userData.email);
    } else {
      console.error("Salon owner email not found");
      throw new Error("サロン運営者のメールアドレスが見つかりません");
    }

    const recipientEmails = Array.from(recipientEmailSet);

    // **キャンセルポリシーの最長日数を取得**
    const maxCancelPolicyDays = await getMaxCancelPolicyDays(userId);

    // **キャプチャ日時を計算**
    const captureDate = new Date(startTime);
    captureDate.setDate(captureDate.getDate() - maxCancelPolicyDays);

    // **予約作成処理**
    // 必要なパラメーターを設定
    const rpcParams = {
      p_user_id: userId,
      p_start_time: startTime,
      p_end_time: endTime,
      p_total_price: totalPrice,
      p_customer_name: customerFullName,
      p_customer_name_kana: customerFullNameKana,
      p_customer_email: customerInfo.email,
      p_customer_phone: customerInfo.phone,
      p_menu_id: p_menu_id ?? null,
      p_coupon_id: p_coupon_id ?? null,
      p_staff_id: staffId ?? null,
      p_payment_method: paymentInfo?.method ?? null,
      p_payment_status: paymentInfo?.status ?? null,
      p_payment_amount: paymentInfo?.amount ?? totalPrice,
      p_stripe_payment_intent_id: paymentInfo?.stripePaymentIntentId ?? null,
    };

    // RPC 関数の呼び出し
    const { data, error: reservationError } = await supabase.rpc(
      "create_reservation",
      rpcParams
    );

    if (reservationError) {
      console.error("Reservation creation error:", reservationError);

      if (reservationError.code === "23505") {
        // 一意制約違反のエラーコード
        const reservationErrorMessage = reservationError.message as string;
        console.error(
          "Unique constraint violation message:",
          reservationErrorMessage
        );

        // 制約の名前を取得（例: 'unique_reservation_non_cancelled'）
        const constraintNameMatch =
          reservationErrorMessage.match(/constraint "(.+?)"/);
        const constraintName = constraintNameMatch
          ? constraintNameMatch[1]
          : "不明な制約";

        return NextResponse.json(
          {
            error: "この予約は既に存在します",
            details: {
              constraintName: constraintName,
              constraintViolation: reservationErrorMessage,
            },
          },
          { status: 409 }
        );
      }
      throw reservationError;
    }

    // 予約IDとreservation_customer_idの存在を確認
    if (
      !data ||
      data.length === 0 ||
      !data[0].reservation_id ||
      !data[0].reservation_customer_id
    ) {
      console.error(
        "Reservation created but reservation_id or reservation_customer_id is missing",
        data
      );
      throw new Error("予約IDまたは予約顧客IDの取得に失敗しました");
    }

    const reservationId = data[0].reservation_id;
    const reservationCustomerId = data[0].reservation_customer_id;

    console.log("Created reservation ID:", reservationId);
    console.log("Created reservation customer ID:", reservationCustomerId);

    // *** payment_intents テーブルを更新して reservation_id と capture_date を設定 ***
    if (paymentInfo?.stripePaymentIntentId) {
      const { data: paymentIntentData, error: paymentIntentError } =
        await supabase
          .from("payment_intents")
          .update({
            reservation_id: reservationId,
            capture_date: captureDate.toISOString(),
            status: paymentInfo.status, // ステータスを更新
          })
          .eq("payment_intent_id", paymentInfo.stripePaymentIntentId);

      if (paymentIntentError) {
        console.error(
          "Error updating payment_intents with reservation_id and capture_date:",
          paymentIntentError
        );
        throw new Error(
          "Failed to update payment_intents with reservation_id and capture_date"
        );
      } else {
        console.log(
          "Updated payment_intents with reservation_id and capture_date:",
          paymentIntentData
        );
      }
    } else if (paymentInfo?.isOver30Days) {
      // 30日以上先の予約の場合、新しいレコードを作成
      const { data: newPaymentIntentData, error: newPaymentIntentError } =
        await supabase.from("payment_intents").insert({
          payment_intent_id: `setup_${reservationId}`, // 一意のIDを生成
          user_id: userId,
          status: "requires_payment_method",
          amount: totalPrice,
          reservation_id: reservationId,
          capture_date: captureDate.toISOString(),
        });

      if (newPaymentIntentError) {
        console.error(
          "Error creating new payment_intent record:",
          newPaymentIntentError
        );
        throw new Error("Failed to create new payment_intent record");
      } else {
        console.log("Created new payment_intent record:", newPaymentIntentData);
      }
    } else {
      console.warn(
        "No stripePaymentIntentId provided in paymentInfo and not over 30 days."
      );
    }

    // 新しく追加: stripe_customers テーブルを更新
    if (reservationId && paymentMethodId) {
      const { error: updateError } = await supabase
        .from("stripe_customers")
        .update({
          reservation_id: reservationId,
        })
        .eq("payment_method_id", paymentMethodId);

      if (updateError) {
        console.error("Error updating stripe_customers:", updateError);
        throw new Error(
          "Failed to update stripe_customers with reservation_customer_id"
        );
      } else {
        console.log("Successfully updated stripe_customers table");
      }
    } else {
      console.warn(
        "Missing reservationCustomerId or paymentMethodId, skipping stripe_customers update"
      );
    }

    // メール送信処理
    try {
      console.log("Attempting to send emails...");

      if (!resend) {
        throw new Error("Resend client is not initialized");
      }

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

      // サロン運営者とスタッフへのメール送信
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
            staffName: staffName,
            serviceName: serviceName,
            totalPrice: totalPrice,
          }),
        });

        console.log("Notification email result:", notificationEmailResult);
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

    // *** ここで変更を加えました：sendReservationToAutomation を await します ***
    // 予約情報の保存が成功したので、内部APIにリクエストを送信（同期的に待機）
    const automationResponse = await sendReservationToAutomation({
      userId,
      reservationId,
      startTime,
      endTime,
      staffName,
      customerInfo,
      rsvTermHour,
      rsvTermMinute,
    });

    if (!automationResponse.success) {
      console.error("Automation sync failed:", automationResponse.error);

      // Sentryにエラーを送信
      Sentry.captureException(new Error(automationResponse.error), {
        contexts: {
          reservation: {
            userId: userId,
            reservationId: reservationId,
          },
        },
      });

      // エラーメールの送信
      if (recipientEmails.length > 0) {
        try {
          await resend.emails.send({
            from: "Harotalo運営 <noreply@harotalo.com>",
            to: recipientEmails,
            subject: "【重要】予約同期エラーのお知らせ",
            react: SynchronizationErrorNotification({
              adminName: "管理者",
              errorMessage: automationResponse.error,
              reservationData: {
                customerName: customerFullName,
                startTime: startTime,
                endTime: endTime,
                staffName: staffName,
              },
            }),
          });
          console.log(
            `Error notification sent to ${recipientEmails.join(", ")}`
          );
        } catch (error) {
          console.error("Failed to send error notification:", error);
        }
      }
    }

    // クライアントへのレスポンスを返す
    return NextResponse.json({
      success: true,
      reservationId: reservationId,
      stripeCustomerUpdated: !!(reservationId && paymentMethodId),
    });
  } catch (error: any) {
    console.error("Error saving reservation:", error);
    return NextResponse.json(
      {
        error: error.message,
        details: {
          errorCode: error.code,
          errorDetails: error.details,
        },
      },
      { status: 400 }
    );
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
    // 開始日時のDateオブジェクトを作成
    const startDateTime = new Date(reservationData.startTime);

    // ベースURLの設定
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // 内部APIに渡すデータを作成
    const automationData = {
      user_id: reservationData.userId,
      date: formatDate(reservationData.startTime),
      rsv_hour: startDateTime.getHours().toString(),
      rsv_minute: String(startDateTime.getMinutes()).padStart(2, "0"),
      staff_name: reservationData.staffName,
      nm_sei_kana: reservationData.customerInfo.lastNameKana,
      nm_mei_kana: reservationData.customerInfo.firstNameKana,
      nm_sei: reservationData.customerInfo.lastNameKanji,
      nm_mei: reservationData.customerInfo.firstNameKanji,
      rsv_term_hour: reservationData.rsvTermHour,
      rsv_term_minute: reservationData.rsvTermMinute,
    };

    // 完全なURLを使用してリクエストを送信
    const response = await fetch(`${baseUrl}/api/salonboard-automation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(automationData),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.detail || data.error || "Automation failed";
      return { success: false, error: errorMessage };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in sendReservationToAutomation:", error);
    return { success: false, error: error.message };
  }
}
