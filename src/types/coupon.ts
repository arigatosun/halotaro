export interface RawCoupon {
  name: string;
  category: string;
  description: string;
  price: string;
  duration: string;
  isReservable: boolean;
  imageUrl: string;
  couponId: string;
}

export interface ProcessedCoupon {
  user_id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  is_reservable: boolean;
  image_url: string;
  coupon_id: string;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  user_id: string | null;
  coupon_id: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number | null;
  duration: number | null;
  is_reservable: boolean | null;
  image_url: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
}
