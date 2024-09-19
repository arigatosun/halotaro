"use client";

import Head from "next/head";
import * as Sentry from "@sentry/nextjs";
import { logger } from "../../../scripts/logger";

export default function Page() {
  const handleLog = () => {
    logger.log("これは情報ログです。");
  };

  const handleError = () => {
    try {
      throw new Error("this is a test error");
    } catch (error) {
      logger.error("エラーハンドリング中にエラーが発生しました:", error);
    }
  };

  const handleException = () => {
    // 未処理の例外を発生させる
    throw new Error("これは未処理の例外です。");
  };

  return (
    <div>
      <Head>
        <title>Sentry Onboarding</title>
        <meta name="description" content="Test Sentry for your Next.js app!" />
      </Head>

      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: "4rem", margin: "14px 0" }}>
          {/* ロゴなどの既存のコード */}
        </h1>

        <p>logger.tsを使ったロギングのテスト:</p>

        <button
          type="button"
          style={{
            padding: "12px",
            cursor: "pointer",
            backgroundColor: "#AD6CAA",
            borderRadius: "4px",
            border: "none",
            color: "white",
            fontSize: "14px",
            margin: "8px",
          }}
          onClick={handleLog}
        >
          情報ログを送信
        </button>

        <button
          type="button"
          style={{
            padding: "12px",
            cursor: "pointer",
            backgroundColor: "#E94B35",
            borderRadius: "4px",
            border: "none",
            color: "white",
            fontSize: "14px",
            margin: "8px",
          }}
          onClick={handleError}
        >
          エラーログを送信
        </button>

        <button
          type="button"
          style={{
            padding: "12px",
            cursor: "pointer",
            backgroundColor: "#F2C94C",
            borderRadius: "4px",
            border: "none",
            color: "black",
            fontSize: "14px",
            margin: "8px",
          }}
          onClick={handleException}
        >
          未処理の例外を発生
        </button>

        <p style={{ marginTop: "24px" }}>
          Sentryのダッシュボードでログとエラーを確認してください。
        </p>
      </main>
    </div>
  );
}
