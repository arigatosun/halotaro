import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/utils/encryption";
import {
  syncReservations,
  syncMenus,
  syncStaffData,
  syncCoupons,
} from "../../../../scripts/main";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { haloTaroUserId, syncType } = await request.json();

    if (!haloTaroUserId) {
      return NextResponse.json(
        { error: "HaloTaro User ID is required" },
        { status: 400 }
      );
    }

    if (
      !syncType ||
      !["reservations", "menus", "staff", "coupons"].includes(syncType)
    ) {
      return NextResponse.json(
        { error: "Invalid or missing sync type" },
        { status: 400 }
      );
    }

    // サロンボードの認証情報を取得
    const { data, error } = await supabase
      .from("salonboard_credentials")
      .select("username, encrypted_password")
      .eq("user_id", haloTaroUserId)
      .single();

    if (error || !data) {
      console.error("Error fetching salonboard credentials:", error);
      return NextResponse.json(
        { error: "Failed to retrieve credentials" },
        { status: 500 }
      );
    }

    const { username: salonboardUserId, encrypted_password } = data;
    const password = decrypt(encrypted_password);

    let result;
    // サロンボード連携を実行
    switch (syncType) {
      case "reservations":
        result = await syncReservations(
          haloTaroUserId,
          salonboardUserId,
          password
        );
        break;
      case "menus":
        result = await syncMenus(haloTaroUserId, salonboardUserId, password);
        break;
      case "staff":
        result = await syncStaffData(
          haloTaroUserId,
          salonboardUserId,
          password
        );
        break;
      case "coupons":
        result = await syncCoupons(haloTaroUserId, salonboardUserId, password);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid sync type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ message: result });
  } catch (error) {
    console.error("Integration error:", error);
    return NextResponse.json({ error: "Integration failed" }, { status: 500 });
  }
}
