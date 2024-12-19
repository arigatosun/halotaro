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
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
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

    // data?.policiesが存在するならそのまま、存在しない場合は空オブジェクトを返す
    const policiesData = data?.policies || { policies: [], customText: "" };

    return NextResponse.json({ policies: policiesData });
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

    // policiesは { policies: [...], customText: "..."} の形
    if (!userId || typeof policies !== "object") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { policies: policyArray, customText } = policies;

    if (!Array.isArray(policyArray)) {
      return NextResponse.json(
        { error: "policies must be an array" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("cancel_policies").upsert(
      {
        user_id: userId,
        policies: {
          policies: policyArray,
          customText: customText || "",
        },
      },
      { onConflict: "user_id" }
    );

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
