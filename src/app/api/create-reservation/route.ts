import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from 'resend';
import { ReservationConfirmation } from '../../../emails/ReservationConfirmation';
import { NewReservationNotification } from '../../../emails/NewReservationNotification';
import { generateCancelUrl } from '../../../utils/url';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // リクエストボディからデータを取得
    const {
      userId,
      menuId,
      staffId,
      startTime,
      endTime,
      totalPrice,
      customerInfo,
      paymentInfo,
    } = await request.json();

    console.log("Received reservation data:", {
      userId,
      menuId,
      staffId,
      startTime,
      endTime,
      totalPrice,
      customerInfo,
      paymentInfo,
    });

    // 必須フィールドの検証
    if (
      !userId ||
      !menuId ||
      !staffId ||
      !startTime ||
      !endTime ||
      !totalPrice ||
      !customerInfo
    ) {
      throw new Error("必須フィールドが不足しています");
    }

    // 重複チェック
    const { data: existingReservation, error: checkError } = await supabase
      .from("reservations")
      .select()
      .eq("user_id", userId)
      .eq("staff_id", staffId)
      .eq("start_time", startTime)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (existingReservation) {
      return NextResponse.json(
        { error: "この予約は既に存在します" },
        { status: 409 }
      );
    }

    // メニューIDが整数かどうかを判定
    const isMenuIdInteger = /^\d+$/.test(menuId);
    const p_menu_id = isMenuIdInteger ? Number(menuId) : null;
    const p_coupon_id = isMenuIdInteger ? null : menuId; // UUID の場合

    // フルネームとフルネーム（カナ）を組み立てる
    const customerFullName = `${customerInfo.lastNameKanji} ${customerInfo.firstNameKanji}`;
    const customerFullNameKana = `${customerInfo.lastNameKana} ${customerInfo.firstNameKana}`;

    // スタッフ用通知メールアドレスの取得
    const { data: staffNotificationEmails, error: staffEmailsError } = await supabase
      .from('staff_notification_emails')
      .select('email_addresses')
      .eq('user_id', userId)
      .single();

    if (staffEmailsError) {
      console.error('Error fetching staff notification emails:', staffEmailsError);
    }

    // RPC関数の呼び出し
    const { data, error: reservationError } = await supabase.rpc(
      "create_reservation",
      {
        p_user_id: userId,
        p_menu_id: p_menu_id,
        p_coupon_id: p_coupon_id,
        p_staff_id: staffId,
        p_start_time: startTime,
        p_end_time: endTime,
        p_total_price: totalPrice,
        p_customer_name: customerFullName,
        p_customer_name_kana: customerFullNameKana,
        p_customer_email: customerInfo.email,
        p_customer_phone: customerInfo.phone,
        p_payment_method: paymentInfo?.method,
        p_payment_status: paymentInfo?.status,
        p_payment_amount: paymentInfo?.amount,
        p_stripe_payment_intent_id: paymentInfo?.stripePaymentIntentId,
      }
    );

    if (reservationError) {
      console.error("Reservation creation error:", reservationError);
      throw reservationError;
    }

    if (!data || data.length === 0 || !data[0].id) {
      console.error("Reservation created but ID is missing", data);
      throw new Error("予約IDの取得に失敗しました");
    }

    const reservationId = data[0].id;
    console.log("Created reservation ID:", reservationId);

    // スタッフ名とメニュー/クーポン名を取得
    let staffName = '';
    let serviceName = '';

    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('name')
      .eq('id', staffId)
      .single();

    if (staffError) {
      console.error('Error fetching staff name:', staffError);
    } else {
      staffName = staffData.name;
    }

    if (p_menu_id) {
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('name')
        .eq('id', p_menu_id)
        .single();

      if (menuError) {
        console.error('Error fetching menu name:', menuError);
      } else {
        serviceName = menuData.name;
      }
    } else if (p_coupon_id) {
      const { data: couponData, error: couponError } = await supabase
        .from('coupons')
        .select('name')
        .eq('id', p_coupon_id)
        .single();

      if (couponError) {
        console.error('Error fetching coupon name:', couponError);
      } else {
        serviceName = couponData.name;
      }
    }

    // メール送信処理
    try {
      console.log('Attempting to send emails...');

      // ベースURLの設定
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : process.env.NEXT_PUBLIC_BASE_URL || 'https://www.harotalo.com';
      
      const cancelUrl = generateCancelUrl(baseUrl, reservationId);

      // 顧客へのメール送信
      const customerEmailResult = await resend.emails.send({
        from: 'Harotalo運営 <noreply@harotalo.com>',
        to: customerInfo.email,
        subject: '予約完了のお知らせ',
        react: ReservationConfirmation({ 
          customerName: customerFullName, 
          dateTime: new Date(startTime).toLocaleString('ja-JP'),
          endTime: new Date(endTime).toLocaleString('ja-JP'),
          staffName: staffName,
          serviceName: serviceName,
          totalPrice: totalPrice,
          reservationId: reservationId,
          cancelUrl: cancelUrl
        })
      });

      console.log('Customer email result:', customerEmailResult);

      // サロン運営者へのメール送信
      const { data: userData, error: userError } = await supabase
        .from('user_view')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user email:', userError);
        throw userError;
      }

      if (!userData || !userData.email) {
        console.error('Salon owner email not found');
        throw new Error('サロン運営者のメールアドレスが見つかりません');
      }

      const ownerEmailResult = await resend.emails.send({
        from: 'Harotalo運営 <noreply@harotalo.com>',
        to: userData.email,
        subject: '新規予約のお知らせ',
        react: NewReservationNotification({ 
          customerName: customerFullName,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
          dateTime: new Date(startTime).toLocaleString('ja-JP'),
          endTime: new Date(endTime).toLocaleString('ja-JP'),
          staffName: staffName,
          serviceName: serviceName,
          totalPrice: totalPrice
        })
      });

      console.log('Salon owner email result:', ownerEmailResult);

      // スタッフへのメール送信
      if (staffNotificationEmails && staffNotificationEmails.email_addresses) {
        for (const staffEmail of staffNotificationEmails.email_addresses) {
          const staffEmailResult = await resend.emails.send({
            from: 'Harotalo運営 <noreply@harotalo.com>',
            to: staffEmail,
            subject: '新規予約のお知らせ',
            react: NewReservationNotification({ 
              customerName: customerFullName,
              customerEmail: customerInfo.email,
              customerPhone: customerInfo.phone,
              dateTime: new Date(startTime).toLocaleString('ja-JP'),
              endTime: new Date(endTime).toLocaleString('ja-JP'),
              staffName: staffName,
              serviceName: serviceName,
              totalPrice: totalPrice
            })
          });

          console.log(`Staff email result for ${staffEmail}:`, staffEmailResult);
        }
      }

      console.log('Emails sent successfully');
    } catch (emailError) {
      console.error('Error sending emails:', emailError);
      if (emailError instanceof Error) {
        console.error('Error message:', emailError.message);
        console.error('Error stack:', emailError.stack);
      }
      // メール送信エラーはログに記録するが、予約プロセス自体は中断しない
    }

    return NextResponse.json({ success: true, reservationId: reservationId });
  } catch (error: any) {
    console.error("Error saving reservation:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}