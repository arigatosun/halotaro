// app/api/customer-data/route.ts

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// インターフェースの定義
interface CustomerDetails {
  gender: string;
  birth_date: string;
  wedding_anniversary: string;
  children: Array<{
    name: string;
    birthDate: string;
  }>;
}

interface Reservation {
  user_id: string;
  start_time: string;
  status: string;
}

interface CustomerData {
  id: string;
  user_id: string;
  name: string;
  name_kana: string;
  email: string;
  phone: string;
  reservation_count: number;
  customer_details: CustomerDetails[];
  reservations: Reservation[]; // 配列として定義
}

interface MappedCustomer {
  id: string;
  name: string;
  kana: string;
  email: string;
  phone: string;
  visits: number;
  gender: string;
  lastVisit: string;
  birthDate: string;
  weddingAnniversary: string;
  children: Array<{
    name: string;
    birthDate: string;
  }>;
}

// 認証チェック関数
async function checkAuth(request: Request) {
  const supabaseClient = createRouteHandlerClient({ cookies });
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseClient.auth.getUser(token);

  if (error || !user) {
    console.error('Authentication error:', error);
    return { error: 'User not authenticated', status: 401 };
  }

  return { user };
}

export async function GET(request: Request) {
  const authResult = await checkAuth(request);
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const supabaseClient = createRouteHandlerClient({ cookies });
  const userId = authResult.user.id;

  try {
    // リレーションシップを明示的に指定して、お客様情報を取得
    const { data: customersData, error } = await supabaseClient
      .from('reservation_customers')
      .select(`
        id,
        user_id,
        name,
        name_kana,
        email,
        phone,
        reservation_count,
        customer_details (
          gender,
          birth_date,
          wedding_anniversary,
          children
        ),
        reservations:reservations!fk_customer (
          user_id,
          start_time,
          status
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!customersData) {
      return NextResponse.json({ customers: [] });
    }

    // 型アサーション
    const typedCustomersData = customersData as CustomerData[];

    // お客様ごとの最新の来店日とcustomer_detailsをマッピング
    const customersMap = new Map<string, MappedCustomer>();

    typedCustomersData.forEach((customer) => {
      const reservations = customer.reservations || [];

      // 条件に合致する予約をフィルタリング
      const validReservations = reservations.filter(
        (reservation) =>
          reservation.status === 'paid' &&
          new Date(reservation.start_time) <= new Date()
      );

      // start_timeの降順に並び替え
      validReservations.sort(
        (a, b) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );

      // 最も近い予約のstart_timeを取得
      const lastVisit =
        validReservations.length > 0 ? validReservations[0].start_time : '';

      // customer_details の処理
      const customerDetails = customer.customer_details?.[0] || {
        gender: '',
        birth_date: '0-0',
        wedding_anniversary: '0-0',
        children: [],
      };

      // お客様情報をマップに追加
      if (!customersMap.has(customer.id)) {
        customersMap.set(customer.id, {
          id: customer.id,
          name: customer.name,
          kana: customer.name_kana || '',
          email: customer.email || '',
          phone: customer.phone || '',
          visits: customer.reservation_count || 0,
          gender: customerDetails.gender || '',
          lastVisit: lastVisit,
          birthDate: customerDetails.birth_date || '0-0',
          weddingAnniversary:
            customerDetails.wedding_anniversary || '0-0',
          children: customerDetails.children || [],
        });
      }
    });

    const customers = Array.from(customersMap.values());

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
