"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveCoupons = saveCoupons;
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function saveCoupons(coupons, userId, dataHash) {
    console.log(`Processing ${coupons.length} coupons for user ${userId}`);
    // 既存のクーポンアイテムを取得
    const { data: existingCoupons, error: fetchError } = await supabase
        .from("coupons")
        .select("id, coupon_id")
        .eq("user_id", userId);
    if (fetchError) {
        console.error("Error fetching existing coupons:", fetchError);
        throw new Error(`Failed to fetch existing coupons: ${fetchError.message}`);
    }
    const existingCouponMap = new Map(existingCoupons?.map((coupon) => [coupon.coupon_id, coupon.id]));
    const couponUpdates = [];
    const couponInserts = [];
    for (const coupon of coupons) {
        if (existingCouponMap.has(coupon.coupon_id)) {
            // 既存のクーポンを更新
            couponUpdates.push({
                id: existingCouponMap.get(coupon.coupon_id),
                ...coupon,
                updated_at: new Date().toISOString(),
            });
        }
        else {
            // 新しいクーポンを挿入
            couponInserts.push({
                ...coupon,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }
    }
    // バッチ更新
    if (couponUpdates.length > 0) {
        const { error: updateError } = await supabase
            .from("coupons")
            .upsert(couponUpdates);
        if (updateError) {
            console.error("Error updating coupons:", updateError);
            throw new Error(`Failed to update coupons: ${updateError.message}`);
        }
    }
    // バッチ挿入
    if (couponInserts.length > 0) {
        const { error: insertError } = await supabase
            .from("coupons")
            .insert(couponInserts);
        if (insertError) {
            console.error("Error inserting coupons:", insertError);
            throw new Error(`Failed to insert coupons: ${insertError.message}`);
        }
    }
    // 同期されなかったクーポンを非アクティブ化
    const syncedCouponIds = new Set(coupons.map((coupon) => coupon.coupon_id));
    const couponsToDeactivate = existingCoupons?.filter((coupon) => !syncedCouponIds.has(coupon.coupon_id));
    if (couponsToDeactivate && couponsToDeactivate.length > 0) {
        const { error: deactivateError } = await supabase
            .from("coupons")
            .update({ is_reservable: false, updated_at: new Date().toISOString() })
            .in("id", couponsToDeactivate.map((coupon) => coupon.id));
        if (deactivateError) {
            console.error("Error deactivating coupons:", deactivateError);
            throw new Error(`Failed to deactivate coupons: ${deactivateError.message}`);
        }
    }
    // 同期ログを記録
    const { error: logError } = await supabase.from("coupon_sync_logs").insert({
        user_id: userId,
        sync_time: new Date().toISOString(),
        data_hash: dataHash,
        items_processed: coupons.length,
        items_updated: couponUpdates.length,
        items_added: couponInserts.length,
        items_deactivated: couponsToDeactivate?.length || 0,
    });
    if (logError) {
        console.error("Error creating sync log:", logError);
        throw new Error(`Failed to create sync log: ${logError.message}`);
    }
    console.log(`Saved ${couponUpdates.length} updated coupons and ${couponInserts.length} new coupons`);
    console.log(`Deactivated ${couponsToDeactivate?.length || 0} coupons`);
    return {
        itemsProcessed: coupons.length,
        itemsUpdated: couponUpdates.length,
        itemsAdded: couponInserts.length,
        itemsDeactivated: couponsToDeactivate?.length || 0,
        dataHash: dataHash,
    };
}
