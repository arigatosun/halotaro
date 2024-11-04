import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getReservations } from "@/app/actions/reservationActions";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  // ユーザーIDの取得
  const userId = request.headers.get("user-id");
  console.log("userId:", userId);

  if (!userId) {
    return NextResponse.json(
      { message: "ユーザーIDが提供されていません" },
      { status: 401 }
    );
  }

  // クエリパラメータの取得
  const { searchParams } = new URL(request.url);

  const date = searchParams.get("date") || undefined;
  const staff = searchParams.get("staff") || undefined;
  const menu = searchParams.get("menu") || undefined;
  const statusesParam = searchParams.get("statuses");
  const statuses = statusesParam ? statusesParam.split(",") : [];
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "30", 10);

  // フィルターオプションをオブジェクトとして作成
  const filterOptions = {
    date,
    staff,
    menu,
    statuses,
    // 必要に応じて他のフィルター項目を追加
  };

  try {
    const { data, count } = await getReservations(
      supabase,
      userId,
      filterOptions,
      page,
      limit
    );

    return NextResponse.json({ data, count });
  } catch (error) {
    console.error("予約の取得エラー:", error);
    return NextResponse.json(
      { message: "予約の取得に失敗しました" },
      { status: 500 }
    );
  }
}
