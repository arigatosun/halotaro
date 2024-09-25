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
      return NextResponse.json({ message: "Menu item ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", menuItemId);

      if (error) {
        if (error.code === '23503' && error.details?.includes('reservations')) {
          return NextResponse.json(
            { message: "このメニューは現在ユーザーから予約されているため削除できません。" },
            { status: 409 }
          );
        }
        throw error;
      }
  
      return NextResponse.json({ message: "メニューが正常に削除されました。" });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      return NextResponse.json(
        { message: "メニューの削除中にエラーが発生しました。" },
        { status: 500 }
      );
    }
  }