import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("salonboard_sync_status")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ status: "not_started" });
  }

  return NextResponse.json({
    status: data.status,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    errorMessage: data.error_message,
  });
}
