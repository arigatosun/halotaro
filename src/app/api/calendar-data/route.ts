// app/api/calendar-data/route.ts

import { NextResponse } from "next/server";
import {
  Reservation,
  Staff,
  MenuItem,
  BusinessHour,
} from "@/types/reservation";
import moment from "moment-timezone";
import { createClient } from "@supabase/supabase-js";
import { sendReservationEmails } from "@/app/service/reservationService";

// anon key で作ったクライアントを使う
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 認証チェック関数
async function checkAuth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header", status: 401 };
  }

  const token = authHeader.split(" ")[1];
  const {
    data: { user },
    error,
  } = await supabaseAnon.auth.getUser(token);

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
      "",
    customer_email: reservation.reservation_customers?.email || "",
    customer_phone: reservation.reservation_customers?.phone || "",
    customer_name_kana: reservation.reservation_customers?.name_kana || "",
    menu_name: reservation.scraped_menu || reservation.menu_items?.name || "",
    staff_name: reservation.staff?.name || "",
    start_time: moment.utc(reservation.start_time).toISOString(),
    end_time: moment.utc(reservation.end_time).toISOString(),
    is_staff_schedule: reservation.is_staff_schedule || false,
    editable: reservation.is_staff_schedule === true,
    is_hair_sync: reservation.is_hair_sync || false,
    // 複数メニュー情報を含める
    reservation_menu_items: reservation.reservation_menu_items || [],
    // memo フィールドを追加（なければ空文字）
    memo: reservation.memo || "",
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

    const supabase = supabaseAnon;
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

    // 表示対象のステータスリスト
    const includedStatuses = ["confirmed", "paid", "staff"];

    // 予約データの取得（memo カラムと複数メニュー情報も含む）
    const { data: reservations, error: reservationError } = await supabase
      .from("reservations")
      .select(
        `
        *,
        scraped_menu,
        is_hair_sync,
        reservation_customers!fk_customer (
          id, name, email, phone, name_kana
        ),
        menu_items (id, name, duration, price),
        staff (id, name, schedule_order),
        coupons!fk_coupon (id, name, duration, price),
        reservation_menu_items (id, menu_id, coupon_id, name, price, duration),
        memo
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

    // フォーマット処理
    const formattedReservations = reservations.map(formatReservation);

    // サロンデータの取得
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
      return NextResponse.json({
        reservations: formattedReservations,
        closedDays: [],
        businessHours: [],
        staffShifts: [],
      });
    }

    // 営業時間データの取得
    const { data: businessHoursData, error: businessHoursError } =
      await supabase
        .from("salon_business_hours")
        .select("*")
        .eq("salon_id", userId)
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

    // 各日付の営業時間（存在しない場合はデフォルト値を設定）
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

    // スタッフシフトの取得
    const { data: staffShiftsData, error: staffShiftsError } = await supabase
      .from("staff_shifts")
      .select("*, staff!inner(user_id)")
      .eq("staff.user_id", userId)
      .gte("date", startDateStr)
      .lte("date", endDateStr);

    if (staffShiftsError) {
      console.error("Error fetching staff shifts:", staffShiftsError);
      return NextResponse.json(
        { error: staffShiftsError.message },
        { status: 500 }
      );
    }

    const staffShifts = staffShiftsData.map((shift) => ({
      id: shift.id,
      staff_id: shift.staff_id,
      date: shift.date,
      shift_status: shift.shift_status,
      start_time: shift.start_time,
      end_time: shift.end_time,
      memo: shift.memo,
    }));

    return NextResponse.json({
      reservations: formattedReservations,
      closedDays,
      businessHours: dateRange,
      staffShifts,
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

    const supabase = supabaseAnon;
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
        if (!end_time) {
          return NextResponse.json(
            { error: "end_time is required for staff schedule" },
            { status: 400 }
          );
        }

        const startMoment = moment(start_time);
        const endMoment = moment(end_time);
        if (!endMoment.isAfter(startMoment)) {
          return NextResponse.json(
            { error: "end_time must be after start_time" },
            { status: 400 }
          );
        }

        // クライアントから受け取った時間をJSTとして解釈し、UTCに変換
        const utcStartTime = moment.tz(start_time, "Asia/Tokyo").utc().format();
        const utcEndTime = moment.tz(end_time, "Asia/Tokyo").utc().format();

        const insertData: Partial<Reservation> = {
          user_id: authResult.user.id,
          staff_id: staff_id || undefined,
          start_time: utcStartTime,
          end_time: utcEndTime,
          status: "staff",
          total_price: 0,
          is_staff_schedule: true,
          event: event || "予定あり",
          // memo フィールドを追加（なければ空文字）
          memo: data.memo || "",
        };

        console.log("Inserting staff schedule:", insertData);

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

        const formattedSchedule = formatReservation(newSchedule);
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
      // スタッフダッシュボードからの予約作成
      try {
        const rpcParams = {
          p_user_id: authResult.user.id,
          p_staff_id: staff_id,
          p_menu_id: menu_id ? parseInt(menu_id, 10) : null,
          p_coupon_id: data.coupon_id || null,
          p_start_time: start_time
            ? moment.utc(start_time).format("YYYY-MM-DD HH:mm:ss")
            : null,
          p_end_time: end_time
            ? moment.utc(end_time).format("YYYY-MM-DD HH:mm:ss")
            : null,
          p_total_price: total_price || 0,
          p_customer_last_name_kana: customer_last_name_kana,
          p_customer_first_name_kana: customer_first_name_kana,
          p_customer_last_name: customer_last_name || null,
          p_customer_first_name: customer_first_name || null,
          p_customer_email: customer_email || null,
          p_customer_phone: customer_phone || null,
          p_customer_id: data.customer_id || null,
          p_payment_method: null,
          p_payment_status: null,
          p_payment_amount: 0,
          p_stripe_payment_intent_id: null,
          // 追加：memo パラメータ
          p_memo: data.memo || null,
        };

        const { data: reservationData, error: reservationError } =
          await supabase.rpc("create_reservation", rpcParams);

        if (reservationError) {
          console.error("Error creating staff reservation:", reservationError);
          return NextResponse.json(
            { error: reservationError.message },
            { status: 500 }
          );
        }

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

        const { data: newReservation, error: fetchError } = await supabase
          .from("reservations")
          .select(
            `
            *,
            reservation_customers!fk_customer (
              id, name, email, phone, name_kana
            ),
            menu_items (id, name, duration, price),
            staff (id, name),
            coupons!fk_coupon (id, name, duration, price)
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

        const formattedReservation = formatReservation(newReservation);

        if (customer_email) {
          try {
            const startTime = data.start_time;
            const endTime = data.end_time;
            const staffName = formattedReservation.staff_name || "";
            const serviceName = formattedReservation.menu_name || "";
            const totalPrice = data.total_price || 0;

            await sendReservationEmails({
              reservationId,
              customerInfo: {
                firstNameKanji: data.customer_first_name || "",
                lastNameKanji: data.customer_last_name || "",
                firstNameKana: data.customer_first_name_kana || "",
                lastNameKana: data.customer_last_name_kana || "",
                email: customer_email,
                phone: customer_phone || "",
              },
              startTime,
              endTime,
              staffName,
              serviceName,
              totalPrice,
              recipientEmails: [],
            });
            console.log(
              "Reservation confirmation email sent to:",
              customer_email
            );
          } catch (err) {
            console.error("Failed to send reservation email:", err);
          }
        }

        return NextResponse.json(formattedReservation);
      } catch (error: any) {
        console.error("Error saving staff reservation:", error);
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

    const supabase = supabaseAnon;
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

    const customerId = existingReservation.reservation_customers?.id;

    if (existingReservation.is_staff_schedule && !updateFields.end_time) {
      return NextResponse.json(
        { error: "end_time is required for staff schedule updates" },
        { status: 400 }
      );
    }

    if (existingReservation.is_staff_schedule) {
      delete updateFields.customer_name;
      delete updateFields.customer_email;
      delete updateFields.customer_phone;
      delete updateFields.customer_name_kana;
      delete updateFields.customer_last_name;
      delete updateFields.customer_first_name;
      delete updateFields.customer_last_name_kana;
      delete updateFields.customer_first_name_kana;
    }

    // 更新するフィールドリストに memo を追加
    const fieldsToUpdate = [
      "start_time",
      "end_time",
      "staff_id",
      "menu_id",
      "coupon_id",
      "status",
      "total_price",
      "is_staff_schedule",
      "event",
      "memo",
    ] as const;

    const updatedData: Partial<Reservation> = {};
    for (const field of fieldsToUpdate) {
      if (updateFields[field] !== undefined) {
        if (field === "start_time" || field === "end_time") {
          if (existingReservation.is_staff_schedule) {
            updatedData[field] = updateFields[field]
              ? moment.tz(updateFields[field], "Asia/Tokyo").utc().format()
              : undefined;
          } else {
            updatedData[field] = updateFields[field]
              ? moment.utc(updateFields[field]).format("YYYY-MM-DD HH:mm:ss")
              : undefined;
          }
        } else {
          updatedData[field] = updateFields[field];
        }
      }
    }

    if (
      existingReservation.is_staff_schedule &&
      updatedData.status !== "staff"
    ) {
      updatedData.status = "staff";
    }

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
        staff (id, name),
        coupons!fk_coupon (id, name, duration, price)
      `
      )
      .single();

    if (updateError) {
      console.error("Error updating reservation:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (customerId) {
      // Update customer information if provided
      // Extract customer fields from updateFields
      const {
        customer_last_name,
        customer_first_name,
        customer_last_name_kana,
        customer_first_name_kana,
        customer_email,
        customer_phone,
      } = updateFields;

      // Log update fields for debugging
      console.log("[calendar-data:PUT] Customer update fields:", {
        customerId,
        customer_last_name,
        customer_first_name,
        customer_last_name_kana,
        customer_first_name_kana,
        customer_email,
        customer_phone,
      });

      // Build the customer update data object
      const customerUpdateData: Record<string, any> = {};

      // Set name if both last_name and first_name exist
      if (
        customer_last_name !== undefined ||
        customer_first_name !== undefined
      ) {
        const lastName = customer_last_name || "";
        const firstName = customer_first_name || "";
        customerUpdateData.name = `${lastName} ${firstName}`.trim();
      }

      // Set name_kana if both last_name_kana and first_name_kana exist
      if (
        customer_last_name_kana !== undefined ||
        customer_first_name_kana !== undefined
      ) {
        const lastNameKana = customer_last_name_kana || "";
        const firstNameKana = customer_first_name_kana || "";
        customerUpdateData.name_kana =
          `${lastNameKana} ${firstNameKana}`.trim();
      }

      // Add other customer fields if they exist
      if (customer_email !== undefined) {
        customerUpdateData.email = customer_email;
      }

      if (customer_phone !== undefined) {
        customerUpdateData.phone = customer_phone;
      }

      // Always update the updated_at timestamp
      customerUpdateData.updated_at = new Date().toISOString();

      // Log customer update data
      console.log(
        "[calendar-data:PUT] Customer update data:",
        customerUpdateData
      );

      // Only update if there are fields to update
      if (Object.keys(customerUpdateData).length > 0) {
        try {
          const { data: customerData, error: customerError } = await supabase
            .from("reservation_customers")
            .update(customerUpdateData)
            .eq("id", customerId)
            .select();

          if (customerError) {
            console.error(
              "[calendar-data:PUT] Error updating customer:",
              customerError
            );
          } else {
            console.log(
              "[calendar-data:PUT] Updated customer data:",
              customerData
            );
          }
        } catch (error) {
          console.error(
            "[calendar-data:PUT] Exception updating customer:",
            error
          );
        }
      }
    }

    const formattedReservation = formatReservation(updatedReservation);
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

    const supabase = supabaseAnon;
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get("id");

    if (!reservationId) {
      console.error("DELETE request received without ID");
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

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
      const currentTime = moment.utc();
      const reservationStartTime = moment.utc(reservation.start_time);

      let newStatus: string;
      if (currentTime.isBefore(reservationStartTime)) {
        newStatus = "salon_cancelled";
      } else {
        newStatus = "no_show";
      }

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
