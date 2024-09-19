import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encrypt } from "@/utils/encryption";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { username, password, userId } = await request.json();

    console.log("Received salonboard credentials data:", { username, userId });

    // 必須フィールドの検証
    if (!username || !password || !userId) {
      throw new Error("Username, password, and userId are required");
    }

    const encryptedPassword = encrypt(password);

    // 既存の認証情報を検索
    const { data: existingCredentials, error: fetchError } = await supabase
      .from("salonboard_credentials")
      .select()
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching existing credentials:", fetchError);
      throw fetchError;
    }

    let result;

    if (existingCredentials) {
      // 既存の認証情報を更新
      const { data, error: updateError } = await supabase
        .from("salonboard_credentials")
        .update({
          username,
          encrypted_password: encryptedPassword,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingCredentials.id)
        .select()
        .single();

      if (updateError) {
        console.error("Credentials update error:", updateError);
        throw updateError;
      }

      result = data;
    } else {
      // 新しい認証情報を作成
      const { data, error: insertError } = await supabase
        .from("salonboard_credentials")
        .insert({
          user_id: userId,
          username,
          encrypted_password: encryptedPassword,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Credentials insert error:", insertError);
        throw insertError;
      }

      result = data;
    }

    return NextResponse.json({
      success: true,
      message: "Salonboard credentials saved successfully",
    });
  } catch (error: any) {
    console.error("Error saving salonboard credentials:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
