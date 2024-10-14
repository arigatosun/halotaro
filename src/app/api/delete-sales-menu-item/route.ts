// /api/delete-sales-menu-item/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: NextRequest) {
  try {
    const { menuItemId } = await request.json();

    if (!menuItemId) {
      return NextResponse.json(
        { message: "メニューIDが必要です" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("sales_menu_items")
      .delete()
      .eq("id", menuItemId);

    if (error) throw error;

    return NextResponse.json({
      message: "メニューが正常に削除されました。",
    });
  } catch (error) {
    console.error("店販メニューの削除エラー:", error);
    return NextResponse.json(
      { message: "メニューの削除中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
