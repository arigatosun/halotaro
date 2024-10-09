import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // サーバーサイドでのみ使用するキー

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

export async function POST(request: NextRequest) {
  const userId = request.headers.get("user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as Blob;
  const path = formData.get("path") as string;

  if (!file || !path) {
    return NextResponse.json(
      { error: "Missing file or path" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.storage
    .from("salon-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("salon-images").getPublicUrl(path);

  return NextResponse.json({ publicUrl });
}
