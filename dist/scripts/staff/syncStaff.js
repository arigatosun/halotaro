"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncStaff = syncStaff;
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function syncStaff(staffData, userId) {
    // 既存のスタッフデータを取得
    const { data: existingStaff, error: fetchError } = await supabase
        .from("staff")
        .select("id, name")
        .eq("user_id", userId);
    if (fetchError) {
        throw new Error(`Failed to fetch existing staff: ${fetchError.message}`);
    }
    const existingStaffMap = new Map(existingStaff?.map((staff) => [staff.name, staff.id]));
    const staffUpdates = [];
    const staffInserts = [];
    for (const staff of staffData) {
        if (existingStaffMap.has(staff.name)) {
            staffUpdates.push({
                id: existingStaffMap.get(staff.name),
                ...staff,
                updated_at: new Date().toISOString(),
            });
        }
        else {
            staffInserts.push({
                ...staff,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }
    }
    // 更新
    if (staffUpdates.length > 0) {
        const { error: updateError } = await supabase
            .from("staff")
            .upsert(staffUpdates);
        if (updateError) {
            throw new Error(`Failed to update staff: ${updateError.message}`);
        }
    }
    // 挿入
    if (staffInserts.length > 0) {
        const { error: insertError } = await supabase
            .from("staff")
            .insert(staffInserts);
        if (insertError) {
            throw new Error(`Failed to insert staff: ${insertError.message}`);
        }
    }
    // 同期されなかったスタッフを非アクティブ化
    const syncedStaffNames = new Set(staffData.map((staff) => staff.name));
    const staffToDeactivate = existingStaff?.filter((staff) => !syncedStaffNames.has(staff.name));
    if (staffToDeactivate && staffToDeactivate.length > 0) {
        const { error: deactivateError } = await supabase
            .from("staff")
            .update({ is_published: false, updated_at: new Date().toISOString() })
            .in("id", staffToDeactivate.map((staff) => staff.id));
        if (deactivateError) {
            throw new Error(`Failed to deactivate staff: ${deactivateError.message}`);
        }
    }
    return {
        updated: staffUpdates.length,
        inserted: staffInserts.length,
        deactivated: staffToDeactivate?.length || 0,
    };
}
