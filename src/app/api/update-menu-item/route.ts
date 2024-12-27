import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// トークンからユーザを取得する共通関数
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

export async function PATCH(request: NextRequest) {
  try {
    // ユーザー認証
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const menuItemId = formData.get("id") as string;

    if (!menuItemId) {
      return NextResponse.json(
        { message: "Invalid menu item ID" },
        { status: 400 }
      );
    }

    // ここからは既存コードとほぼ同じ
    const name = formData.get("name") as string;
    const categoryId = formData.get("category_id") as string;
    const description = formData.get("description") as string;
    const price = parseInt(formData.get("price") as string);
    const duration = parseInt(formData.get("duration") as string);
    const image = formData.get("image") as File;
    const unavailableStaffIds = formData.getAll(
      "unavailable_staff_ids[]"
    ) as string[];

    let imageUrl = null;
    if (image && image.size > 0) {
      const fileExt = image.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("menu-images")
        .upload(fileName, image);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("menu-images")
        .getPublicUrl(fileName);

      imageUrl = publicUrlData.publicUrl;
    }

    const updateData: any = {
      name,
      category_id: categoryId,
      description,
      price,
      duration,
    };
    if (imageUrl) {
      updateData.image_url = imageUrl;
    }

    // user.id と menuItemId が一致するものだけ更新
    const { data, error } = await supabase
      .from("menu_items")
      .update(updateData)
      .eq("id", menuItemId)
      .eq("user_id", user.id) // ★ 認証ユーザのみ
      .select()
      .single();

    if (error) throw error;

    // 既存の対応不可スタッフを削除
    const { error: deleteError } = await supabase
      .from("menu_item_unavailable_staff")
      .delete()
      .eq("menu_item_id", menuItemId);

    if (deleteError) throw deleteError;

    // 新しい対応不可スタッフを追加
    if (unavailableStaffIds && unavailableStaffIds.length > 0) {
      const insertData = unavailableStaffIds.map((staffId) => ({
        menu_item_id: menuItemId,
        staff_id: staffId,
      }));

      const { error: insertError } = await supabase
        .from("menu_item_unavailable_staff")
        .insert(insertData);

      if (insertError) throw insertError;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating menu item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
