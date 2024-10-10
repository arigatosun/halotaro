// app/actions/reservationCalendarActions.ts
"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Reservation, Staff, MenuItem, BusinessHour } from "@/types/reservation";
import moment from "moment";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Supabase クライアントの初期化（サービスロールキーを使用）
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // サービスロールキーを使用
);

// 認証チェック関数
async function checkAuth() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session || !session.user) {
    throw new Error("ユーザーが認証されていません");
  }

  return session.user;
}

// 予約データの取得
export async function getCalendarData(startDateStr: string, endDateStr: string) {
  const user = await checkAuth();

  const supabase = createServerComponentClient({ cookies });
  const userId = user.id;

  const startDate = moment(startDateStr, "YYYY-MM-DD").startOf("day").toISOString();
  const endDate = moment(endDateStr, "YYYY-MM-DD").endOf("day").toISOString();

  // スタッフリストの取得
  const { data: staffList, error: staffError } = await supabase
    .from("staff")
    .select("id, name")
    .order("name", { ascending: true });

  if (staffError) {
    console.error("スタッフリストの取得エラー:", staffError);
    throw new Error(staffError.message);
  }

  // メニューリストの取得
  const { data: menuList, error: menuError } = await supabase
    .from("menu_items")
    .select("id, name, duration, price")
    .order("name", { ascending: true });

  if (menuError) {
    console.error("メニューリストの取得エラー:", menuError);
    throw new Error(menuError.message);
  }

  // 表示対象のステータスリスト
  const includedStatuses = ["confirmed", "paid", "staff"];

  // 予約データの取得
  const { data: reservations, error: reservationError } = await supabase
    .from("reservations")
    .select(`
      *,
      reservation_customers!fk_customer (
        id, name, email, phone, name_kana
      ),
      menu_items (id, name, duration, price),
      staff (id, name)
    `)
    .eq("user_id", userId)
    .gte("start_time", startDate)
    .lte("end_time", endDate)
    .in("status", includedStatuses)
    .order("start_time", { ascending: true });

  if (reservationError) {
    console.error("予約データ取得エラー:", reservationError);
    throw new Error(reservationError.message);
  }

  // 予約データのフォーマット
  const formattedReservations = reservations.map((reservation) => ({
    ...reservation,
    customer_name: reservation.scraped_customer || reservation.reservation_customers?.name || "Unknown",
    customer_email: reservation.reservation_customers?.email || "Unknown",
    customer_phone: reservation.reservation_customers?.phone || "Unknown",
    customer_name_kana: reservation.reservation_customers?.name_kana || "Unknown",
    menu_name: reservation.menu_items?.name || "Unknown",
    staff_name: reservation.staff?.name || "Unknown",
    start_time: moment.utc(reservation.start_time).local().format(),
    end_time: moment.utc(reservation.end_time).local().format(),
    is_staff_schedule: reservation.is_staff_schedule || false,
  }));

  // サロンIDの取得
  const { data: salonData, error: salonError } = await supabase
    .from("salons")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (salonError) {
    console.error("サロンデータ取得エラー:", salonError);
    throw new Error(salonError.message);
  }

  if (!salonData) {
    console.warn("ユーザーのサロンデータが見つかりません:", userId);

    // 休業日がない場合もレスポンスを返す
    return {
      staffList,
      menuList,
      reservations: formattedReservations,
      closedDays: [],
      businessHours: [],
    };
  }

  const salonId = salonData.id;

  // 指定された期間内の営業時間データの取得
  const { data: businessHoursData, error: businessHoursError } = await supabase
    .from("salon_business_hours")
    .select("*")
    .eq("salon_id", salonId)
    .gte("date", startDateStr)
    .lte("date", endDateStr);

  if (businessHoursError) {
    console.error("営業時間データ取得エラー:", businessHoursError);
    throw new Error(businessHoursError.message);
  }

  const businessHours = businessHoursData.map((bh) => ({
    date: bh.date,
    open_time: bh.open_time,
    close_time: bh.close_time,
    is_holiday: bh.is_holiday,
  }));

  // 各日付の営業時間を取得またはデフォルト値を設定
  const dateRange: BusinessHour[] = [];
  let currentDate = moment(startDateStr, "YYYY-MM-DD");
  const endMoment = moment(endDateStr, "YYYY-MM-DD");

  while (currentDate.isSameOrBefore(endMoment)) {
    const dateStr = currentDate.format("YYYY-MM-DD");
    const businessHourForDate = businessHours.find((bh) => bh.date === dateStr);

    if (!businessHourForDate) {
      const isWeekend = [6, 0].includes(currentDate.day());
      dateRange.push({
        date: dateStr,
        open_time: isWeekend ? salonData.weekend_open : salonData.weekday_open,
        close_time: isWeekend ? salonData.weekend_close : salonData.weekday_close,
        is_holiday: salonData.closed_days.includes(currentDate.format("dddd").toLowerCase()),
      });
    } else {
      dateRange.push(businessHourForDate);
    }

    currentDate.add(1, "day");
  }

  // 休業日の取得
  const closedDays = dateRange
    .filter((bh) => bh.open_time === "00:00:00" && bh.close_time === "00:00:00")
    .map((bh) => bh.date);

  return {
    staffList,
    menuList,
    reservations: formattedReservations,
    closedDays,
    businessHours: dateRange,
  };
}

// 予約の作成
export async function createReservation(data: any) {
  const user = await checkAuth();

  const supabase = createServerComponentClient({ cookies });
  console.log("Received data:", data);

  const {
    customer_name,
    customer_email,
    customer_phone,
    customer_name_kana,
    customer_last_name,
    customer_first_name,
    customer_last_name_kana,
    customer_first_name_kana,
    staff_id,
    menu_id,
    start_time,
    end_time,
    total_price,
    is_staff_schedule,
    event,
    payment_method,
    payment_status,
    payment_amount,
    stripe_payment_intent_id,
  } = data;

  if (is_staff_schedule) {
    // スタッフスケジュールの作成
    try {
      // バリデーション: end_time が必須
      if (!end_time) {
        throw new Error("end_time is required for staff schedule");
      }

      // バリデーション: end_time が start_time より後
      const startMoment = moment(start_time);
      const endMoment = moment(end_time);
      if (!endMoment.isAfter(startMoment)) {
        throw new Error("end_time must be after start_time");
      }

      // スタッフスケジュールの場合、顧客関連フィールドは除外
      const insertData: Partial<Reservation> = {
        user_id: user.id,
        staff_id: staff_id || undefined,
        start_time: start_time ? moment(start_time).utc().format("YYYY-MM-DD HH:mm:ss") : undefined,
        end_time: end_time ? moment(end_time).utc().format("YYYY-MM-DD HH:mm:ss") : undefined,
        status: "staff",
        total_price: 0,
        is_staff_schedule: true,
        event: event || "予定あり",
        // 顧客関連フィールドはスタッフスケジュールには不要
      };

      console.log("Inserting staff schedule:", insertData); // 挿入前のデータログ

      const { data: newSchedule, error: scheduleError } = await supabase
        .from("reservations")
        .insert(insertData)
        .select(`
          *,
          reservation_customers!fk_customer (
            id, name, email, phone, name_kana
          ),
          menu_items (id, name, duration, price),
          staff (id, name)
        `)
        .single();

      if (scheduleError) {
        console.error("スタッフスケジュール作成エラー:", scheduleError);
        throw new Error(scheduleError.message);
      }

      // 予約データのフォーマット
      const formattedSchedule = {
        ...newSchedule,
        customer_name: newSchedule.scraped_customer || newSchedule.reservation_customers?.name || "Unknown",
        customer_email: newSchedule.reservation_customers?.email || "Unknown",
        customer_phone: newSchedule.reservation_customers?.phone || "Unknown",
        customer_name_kana: newSchedule.reservation_customers?.name_kana || "Unknown",
        menu_name: newSchedule.menu_items?.name || "Unknown",
        staff_name: newSchedule.staff?.name || "Unknown",
        start_time: moment.utc(newSchedule.start_time).local().format(),
        end_time: moment.utc(newSchedule.end_time).local().format(),
        is_staff_schedule: newSchedule.is_staff_schedule || false,
      };

      return formattedSchedule;
    } catch (error: any) {
      console.error("スタッフスケジュール作成中の予期せぬエラー:", error);
      throw new Error(error.message || "An unexpected error occurred");
    }
  } else {
    // 通常の予約作成時に create_reservation を使用
    try {
      // create_reservation 関数を呼び出すためのパラメータを準備
      const rpcParams = {
        p_user_id: user.id,
        p_start_time: start_time ? moment(start_time).utc().format("YYYY-MM-DD HH:mm:ss") : null,
        p_end_time: end_time ? moment(end_time).utc().format("YYYY-MM-DD HH:mm:ss") : null,
        p_total_price: total_price || 0,
        p_customer_name: customer_name,
        p_customer_name_kana: customer_name_kana,
        p_customer_email: customer_email,
        p_customer_phone: customer_phone,
        p_menu_id: menu_id ? parseInt(menu_id, 10) : null,
        p_coupon_id: null, // 必要に応じて設定
        p_staff_id: staff_id || null,
        p_payment_method: payment_method || null,
        p_payment_status: payment_status || null,
        p_payment_amount: payment_amount || null,
        p_stripe_payment_intent_id: stripe_payment_intent_id || null,
      };

      // Supabase クライアント（サービスロールキーを使用）を作成
      const supabaseService = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! // サービスロールキーを使用
      );

      // create_reservation 関数を呼び出す
      const { data: reservationData, error: reservationError } = await supabaseService.rpc(
        "create_reservation",
        rpcParams
      );

      if (reservationError) {
        console.error("予約作成エラー:", reservationError);
        throw new Error(reservationError.message);
      }

      // 予約IDとreservation_customer_idの存在を確認
      if (
        !reservationData ||
        reservationData.length === 0 ||
        !reservationData[0].reservation_id ||
        !reservationData[0].reservation_customer_id
      ) {
        console.error("予約は作成されましたが、reservation_id または reservation_customer_id がありません:", reservationData);
        throw new Error("予約IDまたは予約顧客IDの取得に失敗しました");
      }

      const reservationId = reservationData[0].reservation_id;
      const reservationCustomerId = reservationData[0].reservation_customer_id;

      console.log("作成された予約ID:", reservationId);
      console.log("作成された予約顧客ID:", reservationCustomerId);

      // 作成された予約情報を取得
      const { data: newReservation, error: fetchError } = await supabase
        .from("reservations")
        .select(`
          *,
          reservation_customers!fk_customer (
            id, name, email, phone, name_kana
          ),
          menu_items (id, name, duration, price),
          staff (id, name)
        `)
        .eq("id", reservationId)
        .single();

      if (fetchError) {
        console.error("新規予約取得エラー:", fetchError);
        throw new Error(fetchError.message);
      }

      // フォーマット処理
      const formattedReservation = {
        ...newReservation,
        customer_name: newReservation.scraped_customer || newReservation.reservation_customers?.name || "Unknown",
        customer_email: newReservation.reservation_customers?.email || "Unknown",
        customer_phone: newReservation.reservation_customers?.phone || "Unknown",
        customer_name_kana: newReservation.reservation_customers?.name_kana || "Unknown",
        menu_name: newReservation.menu_items?.name || "Unknown",
        staff_name: newReservation.staff?.name || "Unknown",
        start_time: moment.utc(newReservation.start_time).local().format(),
        end_time: moment.utc(newReservation.end_time).local().format(),
        is_staff_schedule: newReservation.is_staff_schedule || false,
      };

      // 必要に応じて、支払い情報やメール送信処理を追加

      // 成功レスポンスを返す
      return formattedReservation;
    } catch (error: any) {
      console.error("予約保存中のエラー:", error);
      throw new Error(error.message || "予約の作成に失敗しました");
    }
  }
}

// 予約の更新
export async function updateReservation(data: any) {
  const user = await checkAuth();

  const supabase = createServerComponentClient({ cookies });
  console.log("Received data for update:", data);

  const { id, ...updateFields } = data;

  try {
    // 既存の予約データを取得
    const { data: existingReservation, error: fetchError } = await supabase
      .from("reservations")
      .select(`
        *,
        reservation_customers!fk_customer (
          id, name, email, phone, name_kana
        ),
        menu_items (id, name, duration, price),
        staff (id, name)
      `)
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("既存予約取得エラー:", fetchError);
      throw new Error(fetchError.message);
    }

    if (!existingReservation) {
      throw new Error("予約が見つかりません");
    }

    // 顧客IDの取得（スタッフスケジュールの場合はnullの可能性あり）
    const customerId = existingReservation.reservation_customers?.id || null;

    if (!customerId && !existingReservation.is_staff_schedule) {
      console.error("予約の顧客IDが見つかりません:", id);
      throw new Error("顧客情報が見つかりません");
    }

    // スタッフスケジュールの場合、end_time が必須
    if (existingReservation.is_staff_schedule && !updateFields.end_time) {
      throw new Error("スタッフスケジュールの更新にはend_timeが必要です");
    }

    // スタッフスケジュールの場合、顧客関連フィールドは除外
    if (existingReservation.is_staff_schedule) {
      // updateFields から顧客関連フィールドを除外
      delete updateFields.customer_name;
      delete updateFields.customer_email;
      delete updateFields.customer_phone;
      delete updateFields.customer_name_kana;
      delete updateFields.customer_last_name;
      delete updateFields.customer_first_name;
      delete updateFields.customer_last_name_kana;
      delete updateFields.customer_first_name_kana;
    }

    // 更新するフィールドを明示的に指定
    const fieldsToUpdate = [
      "start_time",
      "end_time",
      "staff_id",
      "menu_id",
      "status",
      "total_price",
      "is_staff_schedule",
      "event",
    ] as const;

    const updatedData: Partial<Reservation> = {};
    for (const field of fieldsToUpdate) {
      if (updateFields[field] !== undefined) {
        if (field === "start_time" || field === "end_time") {
          updatedData[field] = updateFields[field]
            ? moment(updateFields[field]).utc().format("YYYY-MM-DD HH:mm:ss")
            : undefined;
        } else {
          updatedData[field] = updateFields[field];
        }
      }
    }

    // 予約のステータスを更新する際の追加ロジック
    if (updateFields.status) {
      // ステータスがキャンセル系の場合、特別な処理を追加することも可能
    }

    // スタッフスケジュールの場合、ステータスを 'staff' に強制設定
    if (existingReservation.is_staff_schedule && updatedData.status !== "staff") {
      updatedData.status = "staff";
    }

    // 予約の更新
    const { data: updatedReservation, error: updateError } = await supabase
      .from("reservations")
      .update(updatedData)
      .eq("id", id)
      .select(`
        *,
        reservation_customers!fk_customer (
          id, name, email, phone, name_kana
        ),
        menu_items (id, name, duration, price),
        staff (id, name)
      `)
      .single();

    if (updateError) {
      console.error("予約更新エラー:", updateError);
      throw new Error(updateError.message);
    }

    // 顧客情報の更新（顧客IDが存在する場合のみ）
    if (
      customerId &&
      (updateFields.customer_name ||
        updateFields.customer_email ||
        updateFields.customer_phone ||
        updateFields.customer_name_kana)
    ) {
      const customerUpdateData: any = {};
      if (updateFields.customer_name) customerUpdateData.name = updateFields.customer_name;
      if (updateFields.customer_email) customerUpdateData.email = updateFields.customer_email;
      if (updateFields.customer_phone) customerUpdateData.phone = updateFields.customer_phone;
      if (updateFields.customer_name_kana) customerUpdateData.name_kana = updateFields.customer_name_kana;

      const { error: customerUpdateError } = await supabase
        .from("reservation_customers")
        .update(customerUpdateData)
        .eq("id", customerId);

      if (customerUpdateError) {
        console.error("顧客情報更新エラー:", customerUpdateError);
        throw new Error(customerUpdateError.message);
      }
    }

    // フォーマット処理
    const formattedReservation = {
      ...updatedReservation,
      customer_name: updatedReservation.scraped_customer || updatedReservation.reservation_customers?.name || "Unknown",
      customer_email: updatedReservation.reservation_customers?.email || "Unknown",
      customer_phone: updatedReservation.reservation_customers?.phone || "Unknown",
      customer_name_kana: updatedReservation.reservation_customers?.name_kana || "Unknown",
      menu_name: updatedReservation.menu_items?.name || "Unknown",
      staff_name: updatedReservation.staff?.name || "Unknown",
      start_time: moment.utc(updatedReservation.start_time).local().format(),
      end_time: moment.utc(updatedReservation.end_time).local().format(),
      is_staff_schedule: updatedReservation.is_staff_schedule || false,
    };

    console.log("予約が更新されました:", formattedReservation);
    return formattedReservation;
  } catch (error: unknown) {
    console.error("予約更新中の予期せぬエラー:", error);
    const errorMessage = error instanceof Error ? error.message : "予期せぬエラーが発生しました";
    throw new Error(errorMessage);
  }
}

// 予約の削除
export async function deleteReservation(reservationId: string) {
  const user = await checkAuth();

  const supabase = createServerComponentClient({ cookies });

  try {
    // 予約の取得（is_staff_schedule を含めるように修正）
    const { data: reservation, error: fetchError } = await supabase
      .from("reservations")
      .select("start_time, is_staff_schedule")
      .eq("id", reservationId)
      .maybeSingle();

    if (fetchError) {
      console.error("予約取得エラー:", fetchError);
      throw new Error(fetchError.message);
    }

    if (!reservation) {
      console.error("予約が見つかりません:", reservationId);
      throw new Error("予約が見つかりません");
    }

    if (reservation.is_staff_schedule) {
      // スタッフスケジュールの場合、予約を削除
      const { error: deleteError } = await supabase
        .from("reservations")
        .delete()
        .eq("id", reservationId);

      if (deleteError) {
        console.error("スタッフスケジュール削除エラー:", deleteError);
        throw new Error(deleteError.message);
      }

      console.log(`スタッフスケジュール ${reservationId} が正常に削除されました。`);
      return { success: true, message: "スタッフスケジュールが正常に削除されました。" };
    } else {
      // 通常の予約の場合、ステータスを更新
      const currentTime = moment.utc();
      const reservationStartTime = moment.utc(reservation.start_time);

      let newStatus: string;

      if (currentTime.isBefore(reservationStartTime)) {
        newStatus = "salon_cancelled";
      } else {
        newStatus = "no_show";
      }

      // 予約のステータスを更新
      const { error: updateError } = await supabase
        .from("reservations")
        .update({ status: newStatus })
        .eq("id", reservationId);

      if (updateError) {
        console.error("予約ステータス更新エラー:", updateError);
        throw new Error(updateError.message);
      }

      console.log(`予約 ${reservationId} のステータスが ${newStatus} に更新されました。`);
      return { success: true, status: newStatus };
    }
  } catch (error: any) {
    console.error("予約削除中の予期せぬエラー:", error);
    throw new Error(error.message || "予期せぬエラーが発生しました");
  }
}
