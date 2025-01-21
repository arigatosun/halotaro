// app/api/initial-data/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// anon key で作ったクライアント
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 認証チェック（Bearerトークン）
async function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header", status: 401 };
  }

  const token = authHeader.split(" ")[1];
  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data?.user) {
    console.error("Authentication error:", error);
    return { error: "User not authenticated", status: 401 };
  }

  return { user: data.user };
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1) Bearer トークン認証 (Cookie ではなく)
    const authResult = await checkAuth(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    const userId = authResult.user.id;

    // 2) staffList の取得
    const { data: staffList, error: staffError } = await supabaseAnon
      .from("staff")
      .select("id, name, schedule_order")
      .eq("user_id", userId)
      .eq("is_published", true)
      .order("schedule_order", { ascending: true });

    if (staffError) {
      console.error("Error fetching staff list:", staffError);
      return NextResponse.json({ error: staffError.message }, { status: 500 });
    }

    // 3) menuList の取得
    const { data: menuList, error: menuError } = await supabaseAnon
      .from("menu_items")
      .select("id, name, duration, price")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (menuError) {
      console.error("Error fetching menu list:", menuError);
      return NextResponse.json({ error: menuError.message }, { status: 500 });
    }

    // 4) 結果返却
    return NextResponse.json({
      staffList,
      menuList,
    });
  } catch (error) {
    console.error("Unexpected error in GET handler:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
