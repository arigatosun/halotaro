// app/api/calendar-data/route.ts

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import {
  Reservation,
  Staff,
  MenuItem,
  BusinessHour,
} from "@/types/reservation";
import moment from "moment-timezone";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";

// Supabase サービスクライアントの初期化
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // サービスロールキーを使用
);

// 認証チェック関数
async function checkAuth(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header", status: 401 };
  }

  const token = authHeader.split(" ")[1];
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error("Authentication error:", error);
    return { error: "User not authenticated", status: 401 };
  }

  return { user };
}

// 予約データをフォーマットするヘルパー関数
function formatReservation(reservation: any) {
  return {
    ...reservation,
    customer_name:
      reservation.scraped_customer ||
      reservation.reservation_customers?.name ||
      "Unknown",
    customer_email: reservation.reservation_customers?.email || "Unknown",
    customer_phone: reservation.reservation_customers?.phone || "Unknown",
    customer_name_kana:
      reservation.reservation_customers?.name_kana || "Unknown",
    menu_name: reservation.menu_items?.name || "Unknown",
    staff_name: reservation.staff?.name || "Unknown",
    start_time: moment.utc(reservation.start_time).toISOString(),
    end_time: moment.utc(reservation.end_time).toISOString(),
    is_staff_schedule: reservation.is_staff_schedule || false,
    editable: reservation.is_staff_schedule === true,
    is_hair_sync: reservation.is_hair_sync || false,
  };
}

export async function GET(request: Request) {
  try {
    const authResult = await checkAuth(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const userId = authResult.user.id;

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: "Missing required parameters: startDate or endDate" },
        { status: 400 }
      );
    }

    const startDate = moment
      .tz(startDateStr, "YYYY-MM-DD", "Asia/Tokyo")
      .startOf("day")
      .utc()
      .format("YYYY-MM-DD HH:mm:ss");
    const endDate = moment
      .tz(endDateStr, "YYYY-MM-DD", "Asia/Tokyo")
      .endOf("day")
      .utc()
      .format("YYYY-MM-DD HH:mm:ss");

    // スタッフリストの取得（is_published が true のみ）
    const { data: staffList, error: staffError } = await supabase
      .from("staff")
      .select("id, name, schedule_order") // schedule_order を含める
      .eq("user_id", userId)
      .eq("is_published", true)
      .order("schedule_order", { ascending: true }); // schedule_order に基づいてソート

    if (staffError) {
      console.error("Error fetching staff list:", staffError);
      return NextResponse.json({ error: staffError.message }, { status: 500 });
    }

    // メニューリストの取得
    const { data: menuList, error: menuError } = await supabase
      .from("menu_items")
      .select("id, name, duration, price")
      .eq("user_id", userId) // ユーザーIDでフィルタリング
      .order("name", { ascending: true });

    if (menuError) {
      console.error("Error fetching menu list:", menuError);
      return NextResponse.json({ error: menuError.message }, { status: 500 });
    }

    // 表示対象のステータスリスト
    const includedStatuses = ["confirmed", "paid", "staff"];

    // 予約データの取得
    const { data: reservations, error: reservationError } = await supabase
      .from("reservations")
      .select(
        `
        *,
        is_hair_sync,
        reservation_customers!fk_customer (
          id, name, email, phone, name_kana
        ),
        menu_items (id, name, duration, price),
        staff (id, name, schedule_order) // schedule_order を含める
      `
      )
      .eq("user_id", userId)
      .gte("start_time", startDate)
      .lte("end_time", endDate)
      .in("status", includedStatuses)
      .order("start_time", { ascending: true });

    if (reservationError) {
      console.error("Error fetching reservations:", reservationError);
      return NextResponse.json(
        { error: reservationError.message },
        { status: 500 }
      );
    }

    // 予約データのフォーマット
    const formattedReservations = reservations.map(formatReservation);

    // サロンIDの取得
    const { data: salonData, error: salonError } = await supabase
      .from("salons")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (salonError) {
      console.error("Error fetching salon data:", salonError);
      return NextResponse.json({ error: salonError.message }, { status: 500 });
    }

    if (!salonData) {
      console.warn("No salon data found for user:", userId);

      // 休業日がない場合もレスポンスを返す
      return NextResponse.json({
        staffList,
        menuList,
        reservations: formattedReservations,
        closedDays: [],
        businessHours: [],
      });
    }

    const salonId = salonData.id;

    // 指定された期間内の営業時間データの取得
    const { data: businessHoursData, error: businessHoursError } =
      await supabase
        .from("salon_business_hours")
        .select("*")
        .eq("salon_id", salonId)
        .gte("date", startDateStr)
        .lte("date", endDateStr);

    if (businessHoursError) {
      console.error("Error fetching business hours:", businessHoursError);
      return NextResponse.json(
        { error: businessHoursError.message },
        { status: 500 }
      );
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
      const businessHourForDate = businessHours.find(
        (bh) => bh.date === dateStr
      );

      if (!businessHourForDate) {
        const isWeekend = [6, 0].includes(currentDate.day());
        dateRange.push({
          date: dateStr,
          open_time: isWeekend
            ? salonData.weekend_open
            : salonData.weekday_open,
          close_time: isWeekend
            ? salonData.weekend_close
            : salonData.weekday_close,
          is_holiday: salonData.closed_days.includes(
            currentDate.format("dddd").toLowerCase()
          ),
        });
      } else {
        dateRange.push(businessHourForDate);
      }

      currentDate.add(1, "day");
    }

    // 休業日の取得
    const closedDays = dateRange
      .filter(
        (bh) => bh.open_time === "00:00:00" && bh.close_time === "00:00:00"
      )
      .map((bh) => bh.date);

    return NextResponse.json({
      staffList,
      menuList,
      reservations: formattedReservations,
      closedDays,
      businessHours: dateRange,
    });
  } catch (error) {
    console.error("Unexpected error in GET handler:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await checkAuth(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const data = await request.json();
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

    const isStaffSchedule = is_staff_schedule ?? false;

    if (isStaffSchedule) {
      // スタッフスケジュールの作成
      try {
        // バリデーション: end_time が必須
        if (!end_time) {
          return NextResponse.json(
            { error: "end_time is required for staff schedule" },
            { status: 400 }
          );
        }

        // バリデーション: end_time が start_time より後
        const startMoment = moment(start_time);
        const endMoment = moment(end_time);
        if (!endMoment.isAfter(startMoment)) {
          return NextResponse.json(
            { error: "end_time must be after start_time" },
            { status: 400 }
          );
        }

        // スタッフスケジュールの場合、顧客関連フィールドは除外
        const insertData: Partial<Reservation> = {
          user_id: authResult.user.id,
          staff_id: staff_id || undefined,
          start_time: start_time
            ? moment.utc(start_time).format("YYYY-MM-DD HH:mm:ss")
            : undefined,
          end_time: end_time
            ? moment.utc(end_time).format("YYYY-MM-DD HH:mm:ss")
            : undefined,
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
          .select(
            `
            *,
            reservation_customers!fk_customer (
              id, name, email, phone, name_kana
            ),
            menu_items (id, name, duration, price),
            staff (id, name)
          `
          )
          .single();

        if (scheduleError) {
          console.error("Error creating staff schedule:", scheduleError);
          return NextResponse.json(
            { error: scheduleError.message },
            { status: 500 }
          );
        }

        // 予約データのフォーマット
        const formattedSchedule = formatReservation(newSchedule);

        // スタッフスケジュール挿入後の追加処理は不要

        return NextResponse.json(formattedSchedule);
      } catch (error: any) {
        console.error(
          "Unexpected error during staff schedule creation:",
          error
        );
        return NextResponse.json(
          { error: "An unexpected error occurred" },
          { status: 500 }
        );
      }
    } else {
      // 通常の予約作成時に create_reservation を使用
      try {
        // create_reservation 関数を呼び出すためのパラメータを準備
        const rpcParams = {
          p_user_id: authResult.user.id,
          p_start_time: start_time
            ? moment.utc(start_time).format("YYYY-MM-DD HH:mm:ss")
            : null,
          p_end_time: end_time
            ? moment.utc(end_time).format("YYYY-MM-DD HH:mm:ss")
            : null,
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

        // create_reservation 関数を呼び出す
        const { data: reservationData, error: reservationError } =
          await supabaseService.rpc("create_reservation", rpcParams);

        if (reservationError) {
          console.error("Error creating reservation:", reservationError);
          return NextResponse.json(
            { error: reservationError.message },
            { status: 500 }
          );
        }

        // 予約IDとreservation_customer_idの存在を確認
        if (
          !reservationData ||
          reservationData.length === 0 ||
          !reservationData[0].reservation_id ||
          !reservationData[0].reservation_customer_id
        ) {
          console.error(
            "Reservation created but reservation_id or reservation_customer_id is missing",
            reservationData
          );
          throw new Error("予約IDまたは予約顧客IDの取得に失敗しました");
        }

        const reservationId = reservationData[0].reservation_id;
        const reservationCustomerId =
          reservationData[0].reservation_customer_id;

        console.log("Created reservation ID:", reservationId);
        console.log("Created reservation customer ID:", reservationCustomerId);

        // 作成された予約情報を取得
        const { data: newReservation, error: fetchError } = await supabase
          .from("reservations")
          .select(
            `
            *,
            reservation_customers!fk_customer (
              id, name, email, phone, name_kana
            ),
            menu_items (id, name, duration, price),
            staff (id, name)
          `
          )
          .eq("id", reservationId)
          .single();

        if (fetchError) {
          console.error("Error fetching new reservation:", fetchError);
          return NextResponse.json(
            { error: fetchError.message },
            { status: 500 }
          );
        }

        // フォーマット処理
        const formattedReservation = formatReservation(newReservation);

        // 予約作成後の追加処理は不要

        // レスポンスを返す
        return NextResponse.json(formattedReservation);
      } catch (error: any) {
        console.error("Error saving reservation:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
  } catch (error: any) {
    console.error("Unexpected error in POST handler:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const authResult = await checkAuth(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const data = await request.json();
    console.log("Received data for update:", data);

    const { id, ...updateFields } = data;

    if (!id) {
      console.error("Reservation ID is undefined");
      return NextResponse.json(
        { error: "Reservation ID is required" },
        { status: 400 }
      );
    }

    // 既存の予約データを取得
    const { data: existingReservation, error: fetchError } = await supabase
      .from("reservations")
      .select(
        `
        *,
        reservation_customers!fk_customer (
          id, name, email, phone, name_kana
        ),
        menu_items (id, name, duration, price),
        staff (id, name)
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching existing reservation:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existingReservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // 顧客IDの取得（スタッフスケジュールの場合はnullの可能性あり）
    const customerId = existingReservation.reservation_customers?.id || null;

    if (!customerId && !existingReservation.is_staff_schedule) {
      console.error("Customer ID not found for reservation:", id);
      return NextResponse.json(
        { error: "Customer information not found" },
        { status: 500 }
      );
    }

    // スタッフスケジュールの場合、end_time が必須
    if (existingReservation.is_staff_schedule && !updateFields.end_time) {
      return NextResponse.json(
        { error: "end_time is required for staff schedule updates" },
        { status: 400 }
      );
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
            ? moment.utc(updateFields[field]).format("YYYY-MM-DD HH:mm:ss")
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
    if (
      existingReservation.is_staff_schedule &&
      updatedData.status !== "staff"
    ) {
      updatedData.status = "staff";
    }

    // 予約の更新
    const { data: updatedReservation, error: updateError } = await supabase
      .from("reservations")
      .update(updatedData)
      .eq("id", id)
      .select(
        `
        *,
        reservation_customers!fk_customer (
          id, name, email, phone, name_kana
        ),
        menu_items (id, name, duration, price),
        staff (id, name)
      `
      )
      .single();

    if (updateError) {
      console.error("Error updating reservation:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
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
      if (updateFields.customer_name)
        customerUpdateData.name = updateFields.customer_name;
      if (updateFields.customer_email)
        customerUpdateData.email = updateFields.customer_email;
      if (updateFields.customer_phone)
        customerUpdateData.phone = updateFields.customer_phone;
      if (updateFields.customer_name_kana)
        customerUpdateData.name_kana = updateFields.customer_name_kana;

      const { error: customerUpdateError } = await supabase
        .from("reservation_customers")
        .update(customerUpdateData)
        .eq("id", customerId);

      if (customerUpdateError) {
        console.error("Error updating customer:", customerUpdateError);
        return NextResponse.json(
          { error: customerUpdateError.message },
          { status: 500 }
        );
      }
    }

    // フォーマット処理
    const formattedReservation = formatReservation(updatedReservation);

    // 更新後の追加処理は不要

    console.log("Reservation updated:", formattedReservation);
    return NextResponse.json(formattedReservation);
  } catch (error: any) {
    console.error("Unexpected error during reservation update:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await checkAuth(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get("id");

    if (!reservationId) {
      console.error("DELETE request received without ID");
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // 予約の取得
    const { data: reservation, error: fetchError } = await supabase
      .from("reservations")
      .select("start_time, is_staff_schedule")
      .eq("id", reservationId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching reservation:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!reservation) {
      console.error("Reservation not found:", reservationId);
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    if (reservation.is_staff_schedule) {
      // スタッフスケジュールの場合、予約を削除
      const { error: deleteError } = await supabase
        .from("reservations")
        .delete()
        .eq("id", reservationId);

      if (deleteError) {
        console.error("Error deleting staff schedule:", deleteError);
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }

      console.log(`Staff schedule ${reservationId} deleted successfully.`);
      return NextResponse.json({
        success: true,
        message: "Staff schedule deleted successfully.",
      });
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
        console.error("Error updating reservation status:", updateError);
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      console.log(
        `Reservation ${reservationId} status updated to ${newStatus}`
      );

      // キャンセル時の追加処理は不要

      return NextResponse.json({ success: true, status: newStatus });
    }
  } catch (error: any) {
    console.error("Unexpected error during reservation cancellation:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
