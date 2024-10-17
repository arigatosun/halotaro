import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(request: NextRequest) {
  try {
    const formData = await request.formData();
    const menuItemId = formData.get("id") as string;

    if (
      !menuItemId ||
      typeof menuItemId !== "string" ||
      menuItemId.length === 0
    ) {
      return NextResponse.json(
        { message: "Invalid menu item ID" },
        { status: 400 }
      );
    }

    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
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
      const { data: uploadData, error: uploadError } = await supabase.storage
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
      category,
      description,
      price,
      duration,
    };

    if (imageUrl) {
      updateData.image_url = imageUrl;
    }

    const { data, error } = await supabase
      .from("menu_items")
      .update(updateData)
      .eq("id", menuItemId)
      .select()
      .single();

    if (error) throw error;

    // 既存の対応不可スタッフを削除
    const { error: deleteError } = await supabase
      .from("menu_item_unavailable_staff")
      .delete()
      .eq("menu_item_id", menuItemId);

    if (deleteError) throw deleteError;

    // 新しい対応不可スタッフを挿入
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
