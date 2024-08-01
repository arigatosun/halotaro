import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categories: string[];
}

export function useMenuItems(userId: string) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchMenuItems() {
      if (!userId) {
        setError(new Error("User ID is not provided"));
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("menu_items")
          .select("*")
          .eq("user_id", userId);

        if (error) throw error;

        setMenuItems(data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("An error occurred"));
      } finally {
        setLoading(false);
      }
    }

    fetchMenuItems();
  }, [userId]);

  return { menuItems, loading, error };
}
