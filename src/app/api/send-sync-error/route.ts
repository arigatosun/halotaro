import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { SynchronizationErrorNotification } from "../../../emails/SynchronizationErrorNotification";

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is not set in the environment variables");
}
const resend = new Resend(resendApiKey);

export async function POST(request: Request) {
  try {
    const { userId, reservation, errorMessage } = await request.json();

    if (!userId || !reservation || !errorMessage) {
      return NextResponse.json(
        { error: "必須パラメータが不足しています" },
        { status: 400 }
      );
    }

    // 本番用のサロン運営者情報取得処理（テスト時はコメントアウト）
    /*
    const { data: userData, error: userError } = await supabase
      .from("user_view")
      .select("email, name")
      .eq("id", userId)
      .single();

    if (userError || !userData?.email) {
      console.error("Error fetching user data:", userError);
      throw new Error("サロン運営者の情報が見つかりません");
    }
    */

    // テスト用の固定値（本番時は削除）
    const userData = {
      email: 'k2@arigatosun.com',
      name: 'テスト管理者'
    };

    // エラー通知メールを送信
    const emailResult = await resend.emails.send({
      from: "Harotalo運営 <noreply@harotalo.com>",
      // 本番用のメールアドレス指定（テスト時はコメントアウト）
      // to: userData.email,
      // テスト用のメールアドレス（本番時は削除）
      to: 'k2@arigatosun.com',
      subject: "【重要】予約の同期に失敗しました",
      react: SynchronizationErrorNotification({
        adminName: userData.name || "管理者",
        errorMessage,
        reservationData: {
          customerName: reservation.customer_name,
          startTime: reservation.start_time,
          endTime: reservation.end_time,
          staffName: reservation.staff_name
        }
      }),
    });

    return NextResponse.json({ 
      success: true, 
      messageId: emailResult.data?.id || 'unknown'
    });

  } catch (error: any) {
    console.error("Error sending sync error notification:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}