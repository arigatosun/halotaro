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
  created_at: string; // 追加: 予約作成日時
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

    // ステータスが'confirmed'の将来の予約を取得
    const { data, error: reservationsError } = await supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        customer_id,
        start_time,
        created_at,  -- 追加: 予約作成日時
        status,
        reservation_customers:customer_id (
          email,
          name,
          name_kana
        )
      `)
      .eq('status', 'confirmed')
      .gte('start_time', today.toISOString());

    if (reservationsError || !data) {
      console.error('予約の取得中にエラーが発生しました:', reservationsError);
      return NextResponse.json({ error: '予約の取得中にエラーが発生しました' }, { status: 500 });
    }

    // クエリ結果に型アサーションを適用
    const reservations = data as unknown as Reservation[];

    console.log(`取得した予約数: ${reservations.length}`);

    // 各予約を処理
    for (const reservation of reservations) {
      const { id: reservationId, user_id: userId, start_time, created_at, reservation_customers } = reservation;

      if (!reservation_customers) {
        console.warn(`予約 ${reservationId} に顧客情報がありません`);
        continue;
      }

      const { email: customerEmail, name: customerName, name_kana: customerNameKana } = reservation_customers;

      // 予約までの日数を計算
      const reservationDate = new Date(start_time);
      reservationDate.setHours(0, 0, 0, 0); // 時間をクリア

      const timeDiff = reservationDate.getTime() - today.getTime();
      const daysUntilReservation = Math.round(timeDiff / (1000 * 60 * 60 * 24));

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

      const messages = reservationMessagesData.messages || [];

      // 各メッセージを処理
      for (const message of messages) {
        const { id: messageId, days, message: messageText } = message;

        if (days === daysUntilReservation) {
          // 新しいチェック: 予約作成日がメッセージ送信予定日以降かどうか
          const messageSendDate = new Date(reservationDate);
          messageSendDate.setDate(reservationDate.getDate() - days);
          messageSendDate.setHours(0, 0, 0, 0); // 時間をクリア

          const reservationCreatedAt = new Date(created_at);
          reservationCreatedAt.setHours(0, 0, 0, 0); // 時間をクリア

          if (reservationCreatedAt > messageSendDate) {
            console.log(`予約 ${reservationId} はメッセージ ${messageId} の送信日以降に作成されたため、メッセージを送信しません`);
            continue;
          }

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

          // 送信元メールアドレスを使用してメールを送信
          try {
            await resend.emails.send({
              from: `サービス名 <${senderEmailAddresses[0]}>`,
              to: customerEmail,
              subject: '予約に関するお知らせ',
              text: messageText.replace('{name}', customerName),
              // 必要に応じてテンプレートを使用できます
            });

            console.log(`予約 ${reservationId} にメッセージ ${messageId} を送信しました`);

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
            console.error(`予約 ${reservationId} にメッセージ ${messageId} を送信中にエラーが発生しました:`, emailError);
          }
        }
      }
    }

    return NextResponse.json({ message: '予約メッセージのCronジョブが完了しました。' }, { status: 200 });
  } catch (err) {
    console.error('予約メッセージのCronジョブ中にエラーが発生しました:', err);
    return NextResponse.json({ error: '予約メッセージのCronジョブ中にエラーが発生しました' }, { status: 500 });
  }
}
