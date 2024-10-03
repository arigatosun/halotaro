import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("user-id");
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // フォームデータの取得
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const path = formData.get("path") as string | null;

    if (!file || !path) {
      return NextResponse.json({ message: "Invalid form data" }, { status: 400 });
    }

    // ファイル拡張子の取得
    const fileExtension = file.name.split('.').pop();
    if (!fileExtension) {
      return NextResponse.json({ message: "Invalid file type" }, { status: 400 });
    }

    // 一意のファイル名の生成
    const uniqueFileName = `${path}-${Date.now()}.${fileExtension}`;
    const bucketName = "salon-images";

    // Supabase Storage にファイルをアップロード
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(uniqueFileName, file, { upsert: false });

    if (error) {
      console.error("Error uploading image:", error);
      throw error;
    }

    // 公開URLの取得（バケットが公開設定の場合）
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    if (!publicUrlData) {
      console.error("Failed to retrieve public URL.");
      return NextResponse.json(
        { message: "Failed to retrieve public URL" },
        { status: 500 }
      );
    }

    const publicUrl = publicUrlData.publicUrl;

    return NextResponse.json({ publicUrl });
  } catch (error) {
    console.error("Error in upload-image:", error);
    return NextResponse.json(
      { message: "Failed to upload image" },
      { status: 500 }
    );
  }
}
