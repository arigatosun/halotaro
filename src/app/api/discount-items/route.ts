import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 1) 認証トークンからユーザー情報を取得するヘルパー関数
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

// 2) 画像アップロード用のヘルパー関数（必要な場合）
async function uploadImageToStorage(image: File): Promise<string | null> {
  if (!image || image.size === 0) return null;

  const fileExt = image.name.split(".").pop();
  const fileName = `discount-images/${uuidv4()}.${fileExt}`;
  const { error: uploadError } = await supabase.storage
    .from("discount-images")
    .upload(fileName, image);

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase.storage
    .from("discount-images")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

/**
 * discount_itemsテーブルに
 *   discount_type text NOT NULL DEFAULT 'fixed'
 * がある前提
 */

// 3) GETメソッド: 割引一覧を取得
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // user_id = ログイン中 or 00000000-0000-0000-0000-000000000000 (グローバル)
    const { data, error } = await supabase
      .from("discount_items")
      .select("*")
      .or(
        `user_id.eq.${user.id},user_id.eq.00000000-0000-0000-0000-000000000000`
      )
      .order("id", { ascending: false });

    if (error) {
      throw error;
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching discount items:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// 4) POSTメソッド: 割引を新規作成
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const discountValue = Number(formData.get("discount_value"));
    // ★ ここがポイント：discount_type を受け取って保存
    //   フロントの "percent" or "fixed" が入る想定
    const discountType = (formData.get("discount_type") as string) || "fixed";

    const imageFile = formData.get("image") as File | null;

    let image_url: string | null = null;
    if (imageFile && imageFile.size > 0) {
      image_url = await uploadImageToStorage(imageFile);
    }

    // Supabase へ insert
    const { data, error } = await supabase
      .from("discount_items")
      .insert({
        user_id: user.id,
        name,
        discount_value: discountValue,
        discount_type: discountType, // ★ ここで discount_type を保存
        image_url,
      })
      .select("*");

    if (error) {
      throw error;
    }

    return NextResponse.json(data[0]);
  } catch (error: any) {
    console.error("Error creating discount item:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// 5) PATCHメソッド: 割引を編集
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const id = Number(formData.get("id"));
    const name = formData.get("name") as string;
    const discountValue = Number(formData.get("discount_value"));
    // ★ PATCH時にも discount_type を受け取りたいなら:
    const discountType = (formData.get("discount_type") as string) || null;

    const imageFile = formData.get("image") as File | null;

    // まず既存アイテムを取得（本人のものか確認）
    const { data: existingData, error: getError } = await supabase
      .from("discount_items")
      .select("*")
      .eq("id", id)
      .single();

    if (getError || !existingData) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // global なら編集禁止
    if (existingData.user_id === "global") {
      return NextResponse.json(
        { error: "This global discount item cannot be edited." },
        { status: 403 }
      );
    }

    // 本人のものか
    if (existingData.user_id !== user.id) {
      return NextResponse.json({ error: "この割引は削除できません。" }, {
        status: 403,
      });
    }

    // 画像アップロード
    let image_url = existingData.image_url;
    if (imageFile && imageFile.size > 0) {
      image_url = await uploadImageToStorage(imageFile);
    }

    // update
    const updateData: any = {
      name,
      discount_value: discountValue,
      image_url,
      updated_at: new Date().toISOString(),
    };

    if (discountType) {
      updateData.discount_type = discountType; // 変更する場合のみ
    }

    const { data, error } = await supabase
      .from("discount_items")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*");

    if (error) {
      throw error;
    }

    return NextResponse.json(data[0]);
  } catch (error: any) {
    console.error("Error updating discount item:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// 6) DELETEメソッド: 割引を削除
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const discountId = body.discountItemId;

    // 削除対象を取得
    const { data: existingData, error: getError } = await supabase
      .from("discount_items")
      .select("*")
      .eq("id", discountId)
      .single();

    if (getError || !existingData) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // global は削除不可
    if (
      existingData.user_id === "00000000-0000-0000-0000-000000000000" ||
      existingData.user_id === "global"
    ) {
      return NextResponse.json(
        { error: "こちらは削除できません。" },
        { status: 403 }
      );
    }

    // 自分のアイテムかどうか
    if (existingData.user_id !== user.id) {
      return NextResponse.json(
        { error: "この割引は削除できません。" },
        { status: 403 }
      );
    }

    // 実際の削除
    const { data, error } = await supabase
      .from("discount_items")
      .delete()
      .eq("id", discountId)
      .eq("user_id", user.id)
      .select("*");

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Item deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting discount item:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
