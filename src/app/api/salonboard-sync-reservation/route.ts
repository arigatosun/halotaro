// app/api/salonboard-sync-reservation/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { decrypt } from "@/utils/encryption";
import { syncReservationToSalonboard } from "../../../../scripts/main";
import { logger } from "../../../../scripts/logger";

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { haloTaroUserId, reservationId } = await request.json();

    if (!haloTaroUserId || !reservationId) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "User ID and Reservation ID are required",
        },
        { status: 400 }
      );
    }

    // Supabaseからサロンボードの認証情報を取得
    const { data: credentials, error: credentialsError } = await supabase
      .from("salonboard_credentials")
      .select("username, encrypted_password")
      .eq("user_id", haloTaroUserId)
      .single();

    if (credentialsError || !credentials) {
      logger.error(
        "Failed to retrieve Salonboard credentials",
        credentialsError
      );
      return NextResponse.json(
        {
          error: "Not Found",
          message: "Salonboard credentials not found for the user",
        },
        { status: 404 }
      );
    }

    // 予約情報を取得
    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .select(
        `
        *,
        staff (name),
        reservation_customers (name, name_kana, phone)
      `
      )
      .eq("id", reservationId)
      .single();

    if (reservationError || !reservation) {
      logger.error("Failed to retrieve reservation data", reservationError);
      return NextResponse.json(
        { error: "Not Found", message: "Reservation data not found" },
        { status: 404 }
      );
    }

    // 予約データを適切な形式に変換
    const reservationData = {
      startTime: reservation.start_time,
      endTime: reservation.end_time,
      staffName: reservation.staff.name,
      customerInfo: {
        name: reservation.reservation_customers.name,
        kana: reservation.reservation_customers.name_kana,
        phone: reservation.reservation_customers.phone,
      },
      memo: reservation.memo || "ハロタロからの予約",
    };

    // syncReservationToSalonboard関数を呼び出し
    const result = await syncReservationToSalonboard(
      haloTaroUserId,
      credentials.username,
      decrypt(credentials.encrypted_password),
      reservationId,
      reservationData
    );

    return NextResponse.json({ message: result });
  } catch (error) {
    logger.error("Error syncing reservation to Salonboard:", error);

    if (error instanceof Error) {
      // エラータイプに基づいて適切なステータスコードを設定
      let statusCode = 500;
      if (error.message.includes("Not Found")) {
        statusCode = 404;
      } else if (error.message.includes("Bad Request")) {
        statusCode = 400;
      }

      return NextResponse.json(
        { error: "Sync Failed", message: error.message },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
