import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const userId = formData.get("user_id") as string;

    // ユーザーIDの確認
    if (!userId || typeof userId !== 'string' || userId.length === 0) {
        return NextResponse.json(
          { message: "Invalid user ID" },
          { status: 400 }
        );
      }


    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;
    const price = parseInt(formData.get("price") as string);
    const duration = parseInt(formData.get("duration") as string);
    const isReservable = formData.get("is_reservable") === "true";
    const image = formData.get("image") as File;

    let imageUrl = null;
    if (image) {
      const fileExt = image.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("coupon-images")
        .upload(fileName, image);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("coupon-images")
        .getPublicUrl(fileName);

      imageUrl = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase.from("coupons").insert({
      user_id: userId,
      coupon_id: uuidv4(),
      name,
      category,
      description,
      price,
      duration,
      is_reservable: isReservable,
      image_url: imageUrl,
    }).select().single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating coupon:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}