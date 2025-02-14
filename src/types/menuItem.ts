export type MenuItem = {
  id: number;
  user_id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  image_url?: string | null;
  is_reservable?: boolean;
  created_at?: string; // or Date
  category_id?: number | null;
  category: string;
  isCoupon?: boolean;
  // JOIN した結果「categories」というオブジェクトが入るかもしれない
  categories?: {
    id: number;
    name: string;
  } | null;
  sort_order?: number | null;
};
