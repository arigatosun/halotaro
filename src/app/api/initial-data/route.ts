import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Staff, MenuItem } from "@/types/reservation";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("Authentication error:", error);
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const userId = user.id;

    // スタッフリストの取得
    const { data: staffList, error: staffError } = await supabase
      .from("staff")
      .select("id, name, schedule_order")
      .eq("user_id", userId)
      .eq("is_published", true)
      .order("schedule_order", { ascending: true });

    if (staffError) {
      console.error("Error fetching staff list:", staffError);
      return NextResponse.json({ error: staffError.message }, { status: 500 });
    }

    // メニューリストの取得
    const { data: menuList, error: menuError } = await supabase
      .from("menu_items")
      .select("id, name, duration, price")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (menuError) {
      console.error("Error fetching menu list:", menuError);
      return NextResponse.json({ error: menuError.message }, { status: 500 });
    }

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
