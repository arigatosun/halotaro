import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from "next/headers";
import moment from 'moment';

// 認証チェック関数
async function checkAuth(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 };
  }
  
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('Authentication error:', error);
    return { error: 'User not authenticated', status: 401 };
  }

  return { user };
}

export async function GET(request: Request) {
  const authResult = await checkAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // スタッフリストの取得
    const { data: staffList, error: staffError } = await supabase
      .from('staff')
      .select('id, name')
      .order('name', { ascending: true });

    if (staffError) {
      console.error('Error fetching staff list:', staffError);
      return NextResponse.json({ error: staffError.message }, { status: 500 });
    }

    // メニューリストの取得
    const { data: menuList, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, duration, price')
      .order('name', { ascending: true });

    if (menuError) {
      console.error('Error fetching menu list:', menuError);
      return NextResponse.json({ error: menuError.message }, { status: 500 });
    }

    // 予約データの取得
    const { data: reservations, error: reservationError } = await supabase
      .from('reservations')
      .select(`
        *,
        reservation_customers (
          id, name, email, phone, name_kana
        ),
        menu_items (id, name, duration, price),
        staff (id, name)
      `)
      .eq('user_id', userId)
      .gte('start_time', startDate)
      .lte('end_time', endDate)
      .order('start_time', { ascending: true });

    if (reservationError) {
      console.error('Error fetching reservations:', reservationError);
      return NextResponse.json({ error: reservationError.message }, { status: 500 });
    }

    const formattedReservations = reservations.map(reservation => ({
      ...reservation,
      customer_name: reservation.scraped_customer || reservation.reservation_customers?.[0]?.name || 'Unknown',
      menu_name: reservation.menu_items?.name || 'Unknown',
      staff_name: reservation.staff?.name || 'Unknown',
      start_time: moment.utc(reservation.start_time).local().format(),
      end_time: moment.utc(reservation.end_time).local().format(),
    }));

    return NextResponse.json({
      staffList,
      menuList,
      reservations: formattedReservations
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResult = await checkAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const data = await request.json();
  console.log('Received data:', data);

  const {
    customer_name,
    customer_email,
    customer_phone,
    customer_name_kana,
    staff_id,
    menu_id,
    start_time,
    end_time,
    total_price,
    is_staff_schedule, 
    event,
  } = data;

  try {
    // 予約の作成
    const { data: newReservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        user_id: authResult.user.id,
        staff_id,
        menu_id,
        start_time: moment(start_time).utc().format(),
        end_time: moment(end_time).utc().format(),
        status: 'confirmed',
        total_price,
        is_staff_schedule, // この行を追加
        event, // この行を追加
      })
      .select()
      .single();

    if (reservationError) {
      console.error('Error creating reservation:', reservationError);
      return NextResponse.json({ error: reservationError.message }, { status: 500 });
    }

    // スタッフスケジュールでない場合のみ顧客情報を作成
    if (!is_staff_schedule) {
      const { error: customerError } = await supabase
        .from('reservation_customers')
        .insert({
          reservation_id: newReservation.id,
          name: customer_name,
          email: customer_email,
          phone: customer_phone,
          name_kana: customer_name_kana
        });

      if (customerError) {
        console.error('Error creating customer:', customerError);
        return NextResponse.json({ error: customerError.message }, { status: 500 });
      }
    }

    console.log('New reservation created:', newReservation);
    return NextResponse.json(newReservation);
  } catch (error) {
    console.error('Unexpected error during reservation creation:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authResult = await checkAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const data = await request.json();
  console.log('Received data for update:', data);

  const {
    id,
    start_time,
    end_time,
    staff_id,
    menu_id,
    status,
    total_price,
    customer_name,
    customer_email,
    customer_phone,
    customer_name_kana
  } = data;

  try {
    // 予約の更新
    const { data: updatedReservation, error: updateError } = await supabase
      .from('reservations')
      .update({
        start_time: moment(start_time).utc().format(),
        end_time: moment(end_time).utc().format(),
        staff_id,
        menu_id,
        status,
        total_price
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating reservation:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 顧客情報の更新
    const { error: customerUpdateError } = await supabase
      .from('reservation_customers')
      .update({
        name: customer_name,
        email: customer_email,
        phone: customer_phone,
        name_kana: customer_name_kana
      })
      .eq('reservation_id', id);

    if (customerUpdateError) {
      console.error('Error updating customer:', customerUpdateError);
      return NextResponse.json({ error: customerUpdateError.message }, { status: 500 });
    }

    // 更新後のデータを取得
    const { data: fullReservation, error: fetchError } = await supabase
      .from('reservations')
      .select(`
        *,
        reservation_customers (id, name, email, phone, name_kana),
        menu_items (id, name, duration, price),
        staff (id, name)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated reservation:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    console.log('Reservation updated:', fullReservation);
    return NextResponse.json(fullReservation);
  } catch (error) {
    console.error('Unexpected error during reservation update:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authResult = await checkAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    console.error('DELETE request received without ID');
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    // 顧客情報の削除
    const { error: customerDeleteError } = await supabase
      .from('reservation_customers')
      .delete()
      .eq('reservation_id', id);

    if (customerDeleteError) {
      console.error('Error deleting customer information:', customerDeleteError);
      return NextResponse.json({ error: customerDeleteError.message }, { status: 500 });
    }

    // 予約の削除
    const { error: reservationDeleteError } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);

    if (reservationDeleteError) {
      console.error('Error deleting reservation:', reservationDeleteError);
      return NextResponse.json({ error: reservationDeleteError.message }, { status: 500 });
    }

    console.log('Reservation and associated customer information deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error during reservation deletion:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
