import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// SERVICE_ROLE_KEY の利用
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ユーザーをトークンから取得する共通関数
async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring("Bearer ".length);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return null;
  }
  return user;
}

export async function DELETE(request: NextRequest) {
  try {
    // Bearerトークンからユーザーを取得
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { menuItemId } = await request.json();
    if (!menuItemId) {
      return NextResponse.json(
        { message: "Menu item ID is required" },
        { status: 400 }
      );
    }

    // user.id かつ id が一致するレコードのみ削除
    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", menuItemId)
      .eq("user_id", user.id); // ★ ここがポイント

    if (error) {
      // 外部キー制約(予約テーブルなど)でエラーが起きた場合の例
      if (error.code === "23503" && error.details?.includes("reservations")) {
        return NextResponse.json(
          {
            message:
              "このメニューは現在ユーザーから予約されているため削除できません。",
          },
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
