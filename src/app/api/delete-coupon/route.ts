// app/api/delete-coupon/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: NextRequest) {
  try {
    const { couponId } = await request.json();

    if (!couponId) {
      return NextResponse.json({ message: "Coupon ID is required" }, { status: 400 });
    }

    // クーポンの削除
    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("id", couponId);

    if (error) throw error;

    return NextResponse.json({ message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}