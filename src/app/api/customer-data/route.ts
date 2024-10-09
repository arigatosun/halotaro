// app/api/customer-data/route.ts

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabaseClient';

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
  const userId = authResult.user.id;

  try {
    // お客様情報の取得（customer_details を含む）
    const { data: customersData, error } = await supabase
      .from('reservation_customers')
      .select(`
        id,
        name,
        name_kana,
        email,
        phone,
        reservation_count,
        reservations!fk_customer(
          user_id,
          end_time
        ),
        customer_details (
          gender,
          birth_date,
          wedding_anniversary,
          children
        )
      `)
      .eq('reservations.user_id', userId)
      .order('end_time', { foreignTable: 'reservations', ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // お客様ごとの最新の来店日とcustomer_detailsをマッピング
    const customersMap = new Map<string, any>();

    customersData.forEach((customer) => {
      const lastVisit = customer.reservations?.[0]?.end_time || "";

      if (!customersMap.has(customer.id)) {
        customersMap.set(customer.id, {
          id: customer.id,
          name: customer.name,
          kana: customer.name_kana || "",
          email: customer.email || "",
          phone: customer.phone || "",
          visits: customer.reservation_count || 0,
          gender: customer.customer_details?.[0]?.gender || "",
          lastVisit: lastVisit,
          birthDate: customer.customer_details?.[0]?.birth_date || "0-0",
weddingAnniversary: customer.customer_details?.[0]?.wedding_anniversary || "0-0",
children: customer.customer_details?.[0]?.children || [],
        });
      }
    });

    const customers = Array.from(customersMap.values());

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
