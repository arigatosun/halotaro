// src/hooks/useCoupons.ts
import { useState, useEffect, useCallback } from "react";
import { MenuItem } from "@/types/menuItem";
import { toast } from "@/components/ui/use-toast";

export function useCoupons(userId: string) {
  const [coupons, setCoupons] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/get-coupons", {
        headers: {
          "user-id": userId,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch coupons");
      }

      const data = await response.json();
      console.log("Fetched coupons:", data);

      const formattedCoupons: MenuItem[] = data.map((coupon: any) => ({
        id: coupon.id,
        user_id: coupon.user_id,
        name: coupon.name,
        category: coupon.category,
        description: coupon.description,
        price: coupon.price,
        duration: coupon.duration,
        is_reservable: coupon.is_reservable,
        isCoupon: true,
        coupon_id: coupon.coupon_id,
        image_url: coupon.image_url,
      }));

      setCoupons(formattedCoupons);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An error occurred"));
      toast({
        variant: "destructive",
        title: "エラー",
        description: "クーポンの取得に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  return { coupons, loading, error, refreshCoupons: fetchCoupons };
}
