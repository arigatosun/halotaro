// app/api/salonboard-automation/route.ts

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

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
      rsv_term_hour,
      rsv_term_minute,
    } = await request.json();

    const FASTAPI_ENDPOINT =
      "https://4e37-34-97-99-223.ngrok-free.app/run-automation";

    //const apiUrl = process.env.FASTAPI_URL || "https://1ee6-34-97-99-223.ngrok-free.app";

    const response = await fetch(FASTAPI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id,
        date,
        rsv_hour,
        rsv_minute,
        staff_name,
        nm_sei_kana,
        nm_mei_kana,
        nm_sei,
        nm_mei,
        rsv_term_hour,
        rsv_term_minute,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // エラーメッセージを取得し、エラーを投げる
      const errorMessage = data.detail || data.error || "Automation failed";
      throw new Error(errorMessage);
    }

    // 正常なレスポンスをクライアントに返す
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in salonboard-automation API route:", error);
    // Sentryにエラーを送信
    Sentry.captureException(error);
    // エラーレスポンスをクライアントに返す
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
