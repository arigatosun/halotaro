// app/api/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/categories
 * BearerトークンからユーザーIDを取得して、そのユーザーのカテゴリ一覧を返す
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "").trim();

    // トークンからユーザー情報を取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // user.idに紐づくカテゴリを取得
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("カテゴリ取得エラー:", error);
    return NextResponse.json(
      { error: "カテゴリ取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * body: { name: string }
 * 新規カテゴリの追加（user_idはトークンから取得）
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Invalid category name" },
        { status: 400 }
      );
    }

    // 新規カテゴリを作成
    const { data, error } = await supabase
      .from("categories")
      .insert([{ name, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("カテゴリ作成エラー:", error);
    return NextResponse.json(
      { error: "カテゴリ作成に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/categories
 * body: { id: number, name: string }
 * カテゴリ名の更新
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("categories")
      .update({ name, updated_at: new Date() })
      .match({ id, user_id: user.id })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("カテゴリ更新エラー:", error);
    return NextResponse.json(
      { error: "カテゴリ更新に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories
 * body: { id: number }
 * カテゴリの削除
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing category id" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("categories")
      .delete()
      .match({ id, user_id: user.id })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ message: "カテゴリ削除成功", deleted: data });
  } catch (error: any) {
    console.error("カテゴリ削除エラー:", error);
    return NextResponse.json(
      { error: "カテゴリ削除に失敗しました" },
      { status: 500 }
    );
  }
}
