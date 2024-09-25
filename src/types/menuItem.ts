export interface MenuItem {
  id: number | string;
  user_id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  is_reservable: boolean;
  isCoupon?: boolean;
  coupon_id?: string;
  image_url?: string;
}