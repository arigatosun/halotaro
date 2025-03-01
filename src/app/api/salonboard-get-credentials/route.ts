// /app/api/salonboard-get-credentials/route.ts (または .js)

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("salonboard_credentials")
      .select("username, updated_at, service_type") // ★ service_typeを取得
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { message: "No credentials found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      username: data.username,
      lastUpdated: data.updated_at,
      serviceType: data.service_type || null, // 返却
    });
  } catch (error: any) {
    console.error("Error fetching salonboard credentials:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
