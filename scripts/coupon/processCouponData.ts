import { RawCoupon, ProcessedCoupon } from "@/types/coupon";

export function processCouponData(
  rawCoupons: RawCoupon[],
  userId: string
): ProcessedCoupon[] {
  return rawCoupons.map((item) => ({
    user_id: userId,
    name: item.name,
    category: item.category,
    description: item.description,
    price: parseInt(item.price.replace(/[^0-9]/g, "")) || 0,
    duration: parseInt(item.duration.replace(/[^0-9]/g, "")) || 0,
    is_reservable: item.isReservable,
    coupon_id: item.couponId,
    image_url: item.imageUrl, // 画像URLを追加
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}
