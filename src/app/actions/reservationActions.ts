'use server'

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export interface Reservation {
  id: string
  user_id: string
  menu_id: string
  staff_id: string
  status: string
  total_price: number
  created_at: string
  updated_at: string
  start_time: string
  end_time: string
}

export async function getReservations(
  date?: string,
  staff?: string,
  page: number = 1,
  limit: number = 30
): Promise<{ data: Reservation[], count: number }> {
  console.log("getReservations called with:", { date, staff, page, limit });

  const supabase = createServerComponentClient({ cookies })
  
  let query = supabase
    .from('reservations')
    .select('id, user_id, menu_id, staff_id, status, total_price, created_at, updated_at, start_time, end_time', { count: 'exact' })

  if (date) {
    query = query.gte('start_time', `${date}T00:00:00`)
      .lt('start_time', `${date}T23:59:59`)
  }

  if (staff && staff !== 'all') {
    query = query.eq('staff_id', staff)
  }

  const { data, error, count } = await query
    .order('start_time', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  console.log("Query result:", { data, error, count });

  if (error) {
    console.error('Error fetching reservations:', error);
    throw new Error('予約の取得に失敗しました');
  }

  return { 
    data: data as Reservation[],
    count: count || 0
  }
}