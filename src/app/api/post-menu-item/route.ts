import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// tokenからuserを取得する関数
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

// 画像アップロード関数
async function uploadImageToStorage(image: File): Promise<string | null> {
  if (!image || image.size === 0) return null;

  const fileExt = image.name.split(".").pop();
  const fileName = `menu-images/${uuidv4()}.${fileExt}`;
  const { error: uploadError } = await supabase.storage
    .from("menu-images")
    .upload(fileName, image);

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase.storage
    .from("menu-images")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // FormDataを取得
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const categoryId = formData.get("category_id") as string;
    const description = formData.get("description") as string;
    const price = parseInt(formData.get("price") as string);
    const duration = parseInt(formData.get("duration") as string);
    const isReservable = formData.get("is_reservable") === "true";
    const imageFile = formData.get("image") as File | null;
    const unavailableStaffIds = formData.getAll(
      "unavailable_staff_ids[]"
    ) as string[];

    let imageUrl: string | null = null;
    if (imageFile && imageFile.size > 0) {
      imageUrl = await uploadImageToStorage(imageFile);
    }

    // menu_itemsにINSERT
    const { data, error } = await supabase
      .from("menu_items")
      .insert({
        user_id: user.id, // 認証したユーザーのidを使用
        name,
        category_id: categoryId, // ここが重要
        description,
        price,
        duration,
        is_reservable: isReservable,
        image_url: imageUrl,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    // unavailable staffの挿入
    if (unavailableStaffIds && unavailableStaffIds.length > 0) {
      const insertData = unavailableStaffIds.map((staffId) => ({
        menu_item_id: data.id,
        staff_id: staffId,
      }));

      const { error: insertError } = await supabase
        .from("menu_item_unavailable_staff")
        .insert(insertData);

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error creating menu item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
