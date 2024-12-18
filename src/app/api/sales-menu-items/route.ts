// app/api/sales-menu-items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

async function uploadImageToStorage(image: File): Promise<string | null> {
  if (!image || image.size === 0) return null;

  const fileExt = image.name.split(".").pop();
  const fileName = `sales-menu-images/${uuidv4()}.${fileExt}`;
  const { error: uploadError } = await supabase.storage
    .from("sales-menu-images")
    .upload(fileName, image);

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase.storage
    .from("sales-menu-images")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("sales_menu_items")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching sales menu items:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string | null;
    const price = Number(formData.get("price"));
    const imageFile = formData.get("image") as File | null;

    let image_url: string | null = null;
    if (imageFile && imageFile.size > 0) {
      image_url = await uploadImageToStorage(imageFile);
    }

    const { data, error } = await supabase
      .from("sales_menu_items")
      .insert({
        user_id: user.id,
        name,
        category,
        description,
        price,
        image_url,
      })
      .select("*");

    if (error) {
      throw error;
    }

    return NextResponse.json(data[0]);
  } catch (error: any) {
    console.error("Error creating sales menu item:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const id = Number(formData.get("id"));
    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string | null;
    const price = Number(formData.get("price"));
    const imageFile = formData.get("image") as File | null;

    const { data: existingData, error: getError } = await supabase
      .from("sales_menu_items")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (getError || !existingData) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    let image_url = existingData.image_url;
    if (imageFile && imageFile.size > 0) {
      image_url = await uploadImageToStorage(imageFile);
    }

    const { data, error } = await supabase
      .from("sales_menu_items")
      .update({
        name,
        category,
        description,
        price,
        image_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*");

    if (error) {
      throw error;
    }

    return NextResponse.json(data[0]);
  } catch (error: any) {
    console.error("Error updating sales menu item:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const menuItemId = body.menuItemId;

    const { data, error } = await supabase
      .from("sales_menu_items")
      .delete()
      .eq("id", menuItemId)
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
    console.error("Error deleting sales menu item:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
