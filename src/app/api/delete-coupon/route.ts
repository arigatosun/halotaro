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
      return NextResponse.json({ message: "クーポンIDが必要です" }, { status: 400 });
    }

    // クーポンの削除
    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("id", couponId);

    if (error) {
      if (error.code === '23503' && error.details?.includes('reservations')) {
        return NextResponse.json(
          { message: "このクーポンは現在予約されているため削除できません。" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ message: "クーポンが正常に削除されました。" });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return NextResponse.json(
      { message: "クーポンの削除中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}