// api/cron-reservation-messages/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// 型定義
interface ReservationCustomer {
  email: string;
  name: string;
  name_kana: string | null;
}

interface MessageItem {
  id: string;
  days: number;
  message: string;
}

interface ReservationMessage {
  messages: MessageItem[];
}

interface Reservation {
  id: string;
  user_id: string;
  customer_id: string;
  start_time: string;
  status: string;
  reservation_customers: ReservationCustomer | null;
}

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Resendクライアントの初期化
const resendApiKey = process.env.RESEND_API_KEY!;
const resend = new Resend(resendApiKey);

// Cronジョブの認証シークレット
const CRON_SECRET = process.env.CRON_SECRET_KEY!;

// スタッフ通知メールを取得する関数
async function getStaffNotificationEmails(userId: string): Promise<string[] | null> {
  const { data, error } = await supabase
    .from('staff_notification_emails')
    .select('email_addresses')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error(`ユーザー ${userId} のスタッフ通知メール取得中にエラーが発生しました:`, error);
    return null;
  }

  return data.email_addresses;
}

// サロン名を取得する関数
async function getSalonName(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('salons')
    .select('salon_name')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error(`ユーザー ${userId} のサロン名取得中にエラーが発生しました:`, error);
    return null;
  }

  return data.salon_name;
}

export async function GET(request: NextRequest) {
  // 認証チェック
  if (request.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`) {
    console.error('不正なアクセス試行');
    return NextResponse.json({ error: '認証されていません' }, { status: 401 });
  }

  console.log(`[${new Date().toISOString()}] 予約メッセージのCronジョブを開始します...`);

  try {
    // 今日の日付を取得
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時間をクリア

    // 5日後の日付を計算
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 5);
    targetDate.setHours(0, 0, 0, 0); // 時間をクリア

    // 次の日の日付を計算
    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    // 予約日のちょうど5日前の予約を取得
    const { data, error: reservationsError } = await supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        customer_id,
        start_time,
        status,
        reservation_customers:customer_id (
          email,
          name,
          name_kana
        )
      `)
      .eq('status', 'confirmed')
      .gte('start_time', targetDate.toISOString())
      .lt('start_time', nextDay.toISOString());

    if (reservationsError || !data) {
      console.error('予約の取得中にエラーが発生しました:', reservationsError);
      return NextResponse.json({ error: '予約の取得中にエラーが発生しました' }, { status: 500 });
    }

    // クエリ結果に型アサーションを適用
    const reservations = data as unknown as Reservation[];

    console.log(`取得した予約数: ${reservations.length}`);

    // 各予約を処理
    for (const reservation of reservations) {
      const { id: reservationId, user_id: userId, reservation_customers } = reservation;

      if (!reservation_customers) {
        console.warn(`予約 ${reservationId} に顧客情報がありません`);
        continue;
      }

      const { email: customerEmail, name: customerName, name_kana: customerNameKana } = reservation_customers;

      // ユーザーの予約メッセージを取得
      const { data: reservationMessagesData, error: messagesError } = await supabase
        .from('reservation_messages')
        .select('messages')
        .eq('user_id', userId)
        .single();

      if (messagesError || !reservationMessagesData) {
        console.error(`ユーザー ${userId} の予約メッセージ取得中にエラーが発生しました:`, messagesError);
        continue;
      }

      const messages: MessageItem[] = reservationMessagesData.messages || [];

      // days === 5 のメッセージを取得
      const message = messages.find((msg) => msg.days === 5);

      if (!message) {
        console.log(`ユーザー ${userId} に days === 5 のメッセージがありません`);
        continue;
      }

      const { id: messageId, message: messageText } = message;

      // メッセージが既に送信されているか確認
      const { data: sentLog, error: sentLogError } = await supabase
        .from('reservation_message_logs')
        .select('id')
        .eq('reservation_id', reservationId)
        .eq('message_id', messageId)
        .single();

      if (sentLogError && sentLogError.code !== 'PGRST116') {
        console.error(`予約 ${reservationId}、メッセージ ${messageId} のログ確認中にエラーが発生しました:`, sentLogError);
        continue;
      }

      if (sentLog) {
        console.log(`予約 ${reservationId} に対してメッセージ ${messageId} は既に送信済みです`);
        continue;
      }

      // スタッフ通知メールを取得
      const senderEmailAddresses = await getStaffNotificationEmails(userId);

      if (!senderEmailAddresses || senderEmailAddresses.length === 0) {
        console.error(`ユーザー ${userId} の送信元メールアドレスが設定されていません`);
        continue;
      }

      // サロン名を取得
      const salonName = await getSalonName(userId);

      if (!salonName) {
        console.error(`ユーザー ${userId} のサロン名が取得できませんでした`);
        continue;
      }

      // 送信元メールアドレスを使用してメールを送信
      try {
        // メール本文を取得し、必要に応じてプレースホルダーを置換
        const emailBody = messageText.replace('{name}', customerName);

        // 件名を設定
        const emailSubject = `〈${salonName}からのメッセージ〉`;

        await resend.emails.send({
          from: `Harotalo運営 <${senderEmailAddresses[0]}>`,
          to: customerEmail,
          subject: emailSubject,
          text: emailBody,
          // 必要に応じてテンプレートを使用できます
        });

        console.log(`予約 ${reservationId} にメールを送信しました`);

        // 送信済みメッセージをログに記録
        const { error: logError } = await supabase
          .from('reservation_message_logs')
          .insert({
            reservation_id: reservationId,
            message_id: messageId,
            sent_at: new Date().toISOString(),
          });

        if (logError) {
          console.error(`予約 ${reservationId}、メッセージ ${messageId} のログ保存中にエラーが発生しました:`, logError);
        }

      } catch (emailError) {
        console.error(`予約 ${reservationId} にメールを送信中にエラーが発生しました:`, emailError);
      }
    }

    return NextResponse.json({ message: '予約メッセージのCronジョブが完了しました。' }, { status: 200 });
  } catch (err) {
    console.error('予約メッセージのCronジョブ中にエラーが発生しました:', err);
    return NextResponse.json({ error: '予約メッセージのCronジョブ中にエラーが発生しました' }, { status: 500 });
  }
}
