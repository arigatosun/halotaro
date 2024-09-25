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

    if (error) throw error;

    return NextResponse.json({ message: "Menu item deleted successfully" });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}