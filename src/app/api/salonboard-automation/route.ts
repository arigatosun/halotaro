// app/api/salonboard-automation/route.ts

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const {
      user_id,
      date,
      rsv_hour,
      rsv_minute,
      staff_name,
      nm_sei_kana,
      nm_mei_kana,
      nm_sei,
      nm_mei,
      rsv_term_hour, // 所要時間の追加
      rsv_term_minute, // 所要時間の追加
    } = await request.json();

    // FastAPIサーバーのURL
    // const apiUrl = process.env.PYTHON_API_URL || "http://localhost:8000";
    const apiUrl = "http://localhost:8000";

    const response = await fetch(`${apiUrl}/run-automation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id,
        date,
        rsv_hour,
        rsv_minute,
        staff_name, // スタッフ名を転送
        nm_sei_kana,
        nm_mei_kana,
        nm_sei,
        nm_mei,
        rsv_term_hour, // 所要時間の追加
        rsv_term_minute, // 所要時間の追加
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      //TODO サロンオーナーに対してエラー内容と同期が失敗した予約を通知する

      // エラーレスポンスの場合
      return NextResponse.json(
        { error: data.detail || "Automation failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in salonboard-automation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
