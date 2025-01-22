// /app/api/salonboard-save-credentials/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encrypt } from "@/utils/encryption"; // パスワード暗号化に利用

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { username, password, userId, serviceType } = await request.json();
    console.log("Received salonboard credentials data:", {
      username,
      userId,
      serviceType,
    });

    if (!username || !password || !userId) {
      throw new Error("Username, password, and userId are required");
    }
    if (!serviceType) {
      throw new Error("serviceType is required ('hair' or 'spa')");
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
      // 既存レコードの更新
      const { data, error: updateError } = await supabase
        .from("salonboard_credentials")
        .update({
          username,
          encrypted_password: encryptedPassword,
          service_type: serviceType, // ★ service_typeを更新
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
      // 新しくレコードを作成
      const { data, error: insertError } = await supabase
        .from("salonboard_credentials")
        .insert({
          user_id: userId,
          username,
          encrypted_password: encryptedPassword,
          service_type: serviceType, // ★ 新規登録
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
