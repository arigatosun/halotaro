// lib/resendClient.ts
import { Resend } from "resend";

/**
 * Resendクライアントを初期化します。
 * 環境変数に RESEND_API_KEY が含まれている必要があります。
 */
if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set in the environment variables");
}

export const resend = new Resend(process.env.RESEND_API_KEY);
