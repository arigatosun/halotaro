// app/api/salonboard-sync-reservation/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import { decrypt } from "@/utils/encryption"; // 暗号化ユーティリティをインポート
import { syncReservationToSalonboard } from "../../../../scripts/main";

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  const { haloTaroUserId } = await request.json();

  if (!haloTaroUserId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    // Supabaseからサロンボードの認証情報を取得
    const { data, error } = await supabase
      .from("salonboard_credentials")
      .select("username, encrypted_password")
      .eq("user_id", haloTaroUserId)
      .single();

    if (error || !data) {
      throw new Error("Failed to retrieve Salonboard credentials");
    }

    // 暗号化されたパスワードを復号化
    const decryptedPassword = decrypt(data.encrypted_password);

    // テスト用の予約ID（実際の実装では適切な予約IDを使用してください）
    const testReservationId = "test_reservation_123";

    // syncReservationToSalonboard関数を呼び出し
    const result = await syncReservationToSalonboard(
      haloTaroUserId,
      data.username,
      decryptedPassword,
      testReservationId
    );

    return NextResponse.json({ message: result });
  } catch (error) {
    console.error("Error syncing reservation to Salonboard:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
