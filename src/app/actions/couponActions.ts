// src/actions/couponActions.ts

import { Coupon } from "@/types/coupon";
import { supabase } from "@/lib/supabaseClient";

export async function getCouponItems(userId: string): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from("coupons") // クーポンテーブルの名前を正確に指定してください
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Supabase error:", error);
    throw new Error(`Failed to fetch coupon data: ${error.message}`);
  }

  return data || [];
}

export async function getCouponById(id: string, userId: string): Promise<Coupon | null> {
  const { data, error } = await supabase
    .from("coupons") // クーポンテーブルの名前を正確に指定してください
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error(`Failed to fetch coupon with id ${id}:`, error);
    return null;
  }

  return data as Coupon;
}

// 必要に応じて、他のクーポン関連の関数も追加できます
