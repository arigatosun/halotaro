// app/api/test-sync-reservation/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { syncReservationToSalonboard } from "../../../../scripts/main";
import { decrypt } from "@/utils/encryption";
import { logger } from "../../../../scripts/logger";

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Bad Request", message: "User ID is required" },
        { status: 400 }
      );
    }

    // テスト用の予約ID
    const testReservationId = "12345678-1234-5678-1234-567812345679";

    // サロンボードの認証情報を取得
    const { data: credentials, error: credentialsError } = await supabase
      .from("salonboard_credentials")
      .select("username, encrypted_password")
      .eq("user_id", userId)
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
      .eq("id", testReservationId)
      .single();

    console.log(reservation);

    if (reservationError || !reservation) {
      logger.error("Failed to retrieve reservation data", reservationError);
      return NextResponse.json(
        { error: "Not Found", message: "Test reservation data not found" },
        { status: 404 }
      );
    }

    // reservationData オブジェクトを構築
    const reservationData = {
      startTime: reservation.start_time,
      endTime: reservation.end_time,
      staffName: reservation.staff?.name,
      customerInfo: {
        name: reservation.reservation_customers[0]?.name,
        kana: reservation.reservation_customers[0]?.name_kana,
        phone: reservation.reservation_customers[0]?.phone,
      },
      memo: reservation.memo || "テスト予約",
    };

    // 予約の同期を実行
    const result = await syncReservationToSalonboard(
      userId,
      credentials.username,
      decrypt(credentials.encrypted_password),
      testReservationId,
      reservationData
    );

    return NextResponse.json({
      message: "Test reservation synced successfully",
      result,
    });
  } catch (error) {
    logger.error("Error syncing test reservation:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Sync Failed", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "An unexpected error occurred during test sync",
      },
      { status: 500 }
    );
  }
}
