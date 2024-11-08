// src/types/reservation.ts

export interface Reservation {
  id?: string;
  user_id?: string;
  staff_id?: string; // UUID（文字列）
  menu_id?: number; // 整数
  start_time?: string; // 'null'を許容しない
  end_time?: string; // 'null'を許容しない
  status?: string;
  total_price?: number;
  is_staff_schedule?: boolean;
  event?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_name_kana?: string;
  menu_name?: string; // 追加
  staff_name?: string; // 追加
  is_closed_day?: boolean; // 追加（休業日用）
  editable?: boolean; // この行を追加
  is_hair_sync?: boolean; // この行を追加
  customer_id?: string; // ここを追加
  // その他のフィールドがある場合はここに追加
}

export interface Staff {
  id: string;
  name: string;
  schedule_order: number; // この行を追加
  // その他のプロパティがあれば追加
}

export interface MenuItem {
  id: number;
  name: string;
  duration: number;
  price: number;
  // その他のプロパティがあれば追加
}

export interface BusinessHour {
  date: string;
  open_time: string;
  close_time: string;
  is_holiday: boolean; // この行を追加
}
