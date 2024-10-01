export interface RawReservation {
    date: string;
    time: string | undefined;
    status: string;
    customerName: string;
    reservationId: string;
    staff: string;
    reservationRoute: string;
    menu: string;
    usedPoints: string;
    paymentMethod: string;
    amount: string;
  }
  
  export interface ProcessedReservation {
    user_id: string;
    menu_id: number;
    staff_id: string | null;
    status: string;
    total_price: number;
    start_time: string;
    end_time: string;
    created_at: string;
    updated_at: string;
    scraped_customer: string;
    scraped_menu: string;
  }