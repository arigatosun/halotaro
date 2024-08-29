// src/types/reservation.ts

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
  