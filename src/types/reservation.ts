// src/types/reservation.ts

import { EventInput } from '@fullcalendar/core';

// 予約インターフェース
export interface Reservation extends EventInput {
  id: string; // 予約ID
  user_id: string; // ユーザーID
  menu_id: string; // メニューID
  staff_id: string; // スタッフID
  status: string; // 予約ステータス (例: confirmed, salon_cancelled, same_day_cancelled, no_show, cancelled)
  total_price: number; // 予約の合計金額
  created_at: string; // 作成日時
  updated_at: string; // 更新日時
  start_time: string; // 予約開始時間
  end_time: string; // 予約終了時間
  customer_name: string; // 顧客の名前
  customer_name_kana?: string; // 顧客の名前（カナ）
  customer_email?: string; // 顧客のメールアドレス
  customer_phone?: string; // 顧客の電話番号
  menu_name: string; // メニューの名前
  staff_name: string; // 担当スタッフの名前
  reservation_route?: string; // 予約の経路 (例: Web, Phoneなど)
  used_points?: string; // 使用ポイント
  payment_method?: string; // 支払い方法 (例: クレジットカード, 現金など)
  is_staff_schedule?: boolean; // スタッフスケジュールのフラグ (true: スタッフスケジュール, false: 通常予約)
  event?: string; // イベント名（スタッフスケジュールの場合など）
}

// スタッフのインターフェース
export interface Staff {
  id: string; // スタッフID
  name: string; // スタッフ名
}

// メニューアイテムのインターフェース
export interface MenuItem {
  id: string; // メニューID
  name: string; // メニュー名
  price: number; // メニューの価格
  duration: number; // メニューの所要時間 (分)
}
