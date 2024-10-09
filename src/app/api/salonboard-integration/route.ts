import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { haloTaroUserId } = await req.json();

    // サーバーサイドの環境変数
    const API_URL = process.env.API_URL;
    const API_KEY = process.env.API_KEY;

    if (!API_URL || !API_KEY) {
      return NextResponse.json(
        { error: "サーバーの設定に問題があります" },
        { status: 500 }
      );
    }

    console.log("API_URL:", API_URL);
    console.log("API_KEY:", API_KEY);

    // サーバーサイドのAPIにリクエストを送信
    const response = await fetch(`${API_URL}/salonboard-integration`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({ haloTaroUserId }),
    });

    // レスポンスの処理
    const responseText = await response.text();
    console.log("サーバーからのレスポンスステータス:", response.status);
    console.log("サーバーからのレスポンスボディ:", responseText);

    if (!response.ok) {
      return NextResponse.json(
        { error: "サーバーエラーが発生しました" },
        { status: response.status }
      );
    }

    const data = JSON.parse(responseText);
    return NextResponse.json({ message: data.message });
  } catch (error: any) {
    console.error("APIルートでのエラー:", error);
    console.error("エラーの詳細:", {
      message: error.message,
      cause: error.cause,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        error: "サーバー内部でエラーが発生しました",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
