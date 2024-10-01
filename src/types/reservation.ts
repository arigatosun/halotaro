// src/types/reservation.ts

import { EventInput } from '@fullcalendar/core';

export interface Reservation extends EventInput {
  id: string;
  user_id: string;
  menu_id: string;
  staff_id: string;
  status: string;
  total_price: number;
  created_at: string;
  updated_at: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_name_kana?: string;
  customer_email?: string;
  customer_phone?: string;
  menu_name: string;
  staff_name: string;
  reservation_route?: string;
  used_points?: string;
  payment_method?: string;
  is_staff_schedule?: boolean; // スタッフスケジュール用のフラグを追加
  event?: string; 
}

export interface Staff {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  duration: number;
}