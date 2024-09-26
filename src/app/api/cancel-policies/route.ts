import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("cancel_policies")
      .select("policies")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching cancel policies:", error);
      return NextResponse.json(
        { error: "Failed to fetch cancel policies" },
        { status: 500 }
      );
    }

    return NextResponse.json({ policies: data?.policies || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, policies } = body;

    if (!userId || !Array.isArray(policies)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { error } = await supabase
      .from("cancel_policies")
      .upsert({ user_id: userId, policies }, { onConflict: "user_id" });

    if (error) {
      console.error("Error saving cancel policies:", error);
      return NextResponse.json(
        { error: "Failed to save cancel policies" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}