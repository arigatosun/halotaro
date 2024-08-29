import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const status = searchParams.get('status');
  const customerName = searchParams.get('customerName');
  const reservationNumber = searchParams.get('reservationNumber');
  const staff = searchParams.get('staff');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const supabase = createServerComponentClient({ cookies });

  let query = supabase
    .from('reservations')
    .select(`
      *,
      reservation_customers (name, email, phone),
      staff (name),
      menu_items (name)
    `, { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }
  if (customerName) {
    query = query.ilike('reservation_customers.name', `%${customerName}%`);
  }
  if (reservationNumber) {
    query = query.eq('id', reservationNumber);
  }
  if (staff) {
    query = query.eq('staff_id', staff);
  }
  if (startDate && endDate) {
    query = query.gte('start_time', startDate).lte('start_time', endDate);
  }

  const { data, error, count } = await query
    .range((page - 1) * limit, page * limit - 1)
    .order('start_time', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    reservations: data, 
    totalCount: count,
    page,
    limit
  });
}