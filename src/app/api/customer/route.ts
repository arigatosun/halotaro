// app/api/customer/route.ts

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// 認証チェック関数
async function checkAuth(request: Request) {
  const supabaseClient = createRouteHandlerClient({ cookies });
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "認証ヘッダーが見つからないか無効です", status: 401 };
  }

  const token = authHeader.split(" ")[1];
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser(token);

  if (error || !user) {
    console.error("認証エラー:", error);
    return { error: "ユーザーが認証されていません", status: 401 };
  }

  return { user };
}

export async function POST(request: Request) {
  // 認証チェック
  const authResult = await checkAuth(request);
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const user = authResult.user;

  try {
    const { name, kana, email, phone } = await request.json();

    const insertData = {
      user_id: user.id,
      name,
      name_kana: kana,
      email,
      phone,
      reservation_count: 0,
      // genderフィールドを削除
    };

    const supabaseClient = createRouteHandlerClient({ cookies });

    const { data, error } = await supabaseClient
      .from("reservation_customers")
      .insert([insertData])
      .select();

    if (error) {
      console.error("顧客の作成中にエラーが発生しました:", error);
      return NextResponse.json(
        { error: error.message || "顧客の作成に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, customer: data[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("顧客の作成中に予期せぬエラーが発生しました:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 }
    );
  }
}
