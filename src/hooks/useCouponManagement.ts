import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface Coupon {
  id: string;
  name: string;
  type: string;
  description: string;
  searchCategory: string;
  price: number;
  duration: number;
  discountType: "amount" | "percentage";
  discountValue: number;
  image: string | null;
  isPublished: boolean;
  isValid: boolean;
  user_id: string;
  applicableMenu: string;
}

interface ErrorWithMessage {
  message: string;
}

export function useCouponManagement(userId: string | undefined) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorWithMessage | null>(null);

  const fetchCoupons = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      setCoupons(data || []);
      setError(null);
    } catch (err) {
      setError({ message: "クーポンデータの取得に失敗しました" });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const uploadCouponImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from("coupon-images")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("coupon-images")
        .getPublicUrl(filePath);

      if (!data || !data.publicUrl) {
        throw new Error("Failed to get public URL");
      }

      return data.publicUrl;
    } catch (error) {
      console.error("画像のアップロードに失敗しました: ", error);
      return null;
    }
  };

  const addCoupon = async (
    newCoupon: Omit<Coupon, "id">,
    imageFile: File | null
  ) => {
    try {
      let imageUrl = newCoupon.image;
      if (imageFile) {
        imageUrl = await uploadCouponImage(imageFile);
        if (!imageUrl) {
          throw new Error("画像のアップロードに失敗しました");
        }
      }

      const { data, error } = await supabase
        .from("coupons")
        .insert({ ...newCoupon, image: imageUrl })
        .select();

      if (error) throw error;

      setCoupons([...coupons, data[0]]);
      setError(null);
    } catch (err) {
      setError({ message: "クーポンの追加に失敗しました" });
      console.error(err);
      throw err;
    }
  };

  const updateCoupon = async (
    updatedCoupon: Coupon,
    imageFile: File | null
  ) => {
    try {
      let imageUrl = updatedCoupon.image;
      if (imageFile) {
        imageUrl = await uploadCouponImage(imageFile);
        if (!imageUrl) {
          throw new Error("画像のアップロードに失敗しました");
        }
      }

      const { error } = await supabase
        .from("coupons")
        .update({ ...updatedCoupon, image: imageUrl })
        .eq("id", updatedCoupon.id);

      if (error) throw error;

      setCoupons(
        coupons.map((coupon) =>
          coupon.id === updatedCoupon.id
            ? { ...updatedCoupon, image: imageUrl }
            : coupon
        )
      );
      setError(null);
    } catch (err) {
      setError({ message: "クーポン情報の更新に失敗しました" });
      console.error(err);
      throw err;
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase.from("coupons").delete().eq("id", id);

      if (error) throw error;

      setCoupons(coupons.filter((coupon) => coupon.id !== id));
      setError(null);
    } catch (err) {
      setError({ message: "クーポンの削除に失敗しました" });
      console.error(err);
      throw err;
    }
  };

  const toggleCouponPublish = async (id: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ isPublished })
        .eq("id", id);

      if (error) throw error;

      setCoupons(
        coupons.map((coupon) =>
          coupon.id === id ? { ...coupon, isPublished } : coupon
        )
      );
      setError(null);
    } catch (err) {
      setError({ message: "公開状態の変更に失敗しました" });
      console.error(err);
      throw err;
    }
  };

  return {
    coupons,
    loading,
    error,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponPublish,
    refreshCoupons: fetchCoupons,
  };
}
