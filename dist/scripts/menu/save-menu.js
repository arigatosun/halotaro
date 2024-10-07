"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveMenus = saveMenus;
// save-menus.ts
const supabase_js_1 = require("@supabase/supabase-js");
const crypto_1 = __importDefault(require("crypto"));
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function saveMenus(menus, haloTaroUserId, dataHash) {
    console.log(`Processing ${menus.length} menus for user ${haloTaroUserId}`);
    const processedMenus = processRawMenuItems(menus, haloTaroUserId);
    // 既存のメニューアイテムを取得
    const { data: existingMenus, error: fetchError } = await supabase
        .from("menu_items")
        .select("id, name")
        .eq("user_id", haloTaroUserId);
    if (fetchError) {
        console.error("Error fetching existing menus:", fetchError);
        throw new Error(`Failed to fetch existing menus: ${fetchError.message}`);
    }
    const existingMenuMap = new Map(existingMenus?.map((menu) => [menu.name, menu.id]));
    const menuUpdates = [];
    const menuInserts = [];
    for (const menu of processedMenus) {
        if (existingMenuMap.has(menu.name)) {
            // 既存のメニューを更新
            menuUpdates.push({
                id: existingMenuMap.get(menu.name),
                ...menu,
                updated_at: new Date().toISOString(),
            });
        }
        else {
            // 新しいメニューを挿入
            menuInserts.push({
                ...menu,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }
    }
    // バッチ更新
    if (menuUpdates.length > 0) {
        const { error: updateError } = await supabase
            .from("menu_items")
            .upsert(menuUpdates);
        if (updateError) {
            console.error("Error updating menus:", updateError);
            throw new Error(`Failed to update menus: ${updateError.message}`);
        }
    }
    // バッチ挿入
    if (menuInserts.length > 0) {
        const { error: insertError } = await supabase
            .from("menu_items")
            .insert(menuInserts);
        if (insertError) {
            console.error("Error inserting menus:", insertError);
            throw new Error(`Failed to insert menus: ${insertError.message}`);
        }
    }
    // 同期されなかったメニューを非アクティブ化
    const syncedMenuNames = new Set(processedMenus.map((menu) => menu.name));
    const menusToDeactivate = existingMenus?.filter((menu) => !syncedMenuNames.has(menu.name));
    if (menusToDeactivate && menusToDeactivate.length > 0) {
        const { error: deactivateError } = await supabase
            .from("menu_items")
            .update({ is_reservable: false, updated_at: new Date().toISOString() })
            .in("id", menusToDeactivate.map((menu) => menu.id));
        if (deactivateError) {
            console.error("Error deactivating menus:", deactivateError);
            throw new Error(`Failed to deactivate menus: ${deactivateError.message}`);
        }
    }
    // 同期ログを記録
    const { error: logError } = await supabase.from("menu_sync_logs").insert({
        user_id: haloTaroUserId,
        sync_time: new Date().toISOString(),
        data_hash: dataHash,
        items_processed: processedMenus.length,
        items_updated: menuUpdates.length,
        items_added: menuInserts.length,
        items_deactivated: menusToDeactivate?.length || 0,
        sync_started_at: new Date().toISOString(),
    });
    if (logError) {
        console.error("Error creating sync log:", logError);
        throw new Error(`Failed to create sync log: ${logError.message}`);
    }
    console.log(`Saved ${menuUpdates.length} updated menus and ${menuInserts.length} new menus`);
    console.log(`Deactivated ${menusToDeactivate?.length || 0} menus`);
    return {
        itemsProcessed: processedMenus.length,
        itemsUpdated: menuUpdates.length,
        itemsAdded: menuInserts.length,
        itemsDeactivated: menusToDeactivate?.length || 0,
        dataHash: dataHash,
    };
}
function processRawMenuItems(rawMenuItems, userId) {
    return rawMenuItems.map((item) => ({
        user_id: userId,
        name: item.name,
        category: item.category,
        description: item.description,
        price: parseInt(item.price.replace(/[^0-9]/g, "")),
        duration: parseInt(item.duration.replace(/[^0-9]/g, "")),
        is_reservable: item.isReservable,
    }));
}
function generateDataHash(menus) {
    const sortedMenus = menus.sort((a, b) => a.name.localeCompare(b.name));
    const dataString = JSON.stringify(sortedMenus);
    return crypto_1.default.createHash("sha256").update(dataString).digest("hex");
}
