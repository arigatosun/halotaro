import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("user-id");
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
