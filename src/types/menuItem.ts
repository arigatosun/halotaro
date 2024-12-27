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
  // JOIN した結果「categories」というオブジェクトが入るかもしれない
  categories?: {
    id: number;
    name: string;
  } | null;
};
