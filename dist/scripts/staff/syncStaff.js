"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncStaff = syncStaff;
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncStaff(staffData, userId) {
  // スタッフデータ内の重複を排除（userId と staff.name で一意にする）
  const uniqueStaffDataMap = new Map();
  for (const staff of staffData) {
    const uniqueKey = `${userId}-${staff.name}`;
    if (!uniqueStaffDataMap.has(uniqueKey)) {
      uniqueStaffDataMap.set(uniqueKey, staff);
    }
  }
  const uniqueStaffData = Array.from(uniqueStaffDataMap.values());

  // 既存のスタッフデータを取得（userId と name でマッピング）
  const { data: existingStaff, error: fetchError } = await supabase
    .from("staff")
    .select("id, name")
    .eq("user_id", userId);

  if (fetchError) {
    throw new Error(
      `既存のスタッフデータの取得に失敗しました: ${fetchError.message}`
    );
  }

  // 既存スタッフを name でマッピング
  const existingStaffMap = new Map();
  for (const staff of existingStaff) {
    existingStaffMap.set(staff.name, staff.id);
  }

  const staffUpdates = [];
  const staffInserts = [];

  for (const staff of uniqueStaffData) {
    const staffRecord = {
      user_id: userId,
      name: staff.name,
      role: staff.role,
      experience: staff.experience,
      is_published: staff.isPublished,
      image: staff.image,
      description: staff.description,
      updated_at: new Date().toISOString(),
    };

    if (existingStaffMap.has(staff.name)) {
      // 更新
      staffUpdates.push({
        id: existingStaffMap.get(staff.name),
        ...staffRecord,
      });
    } else {
      // 挿入
      staffInserts.push({
        ...staffRecord,
        created_at: new Date().toISOString(),
      });
    }
  }

  // 更新
  if (staffUpdates.length > 0) {
    const { error: updateError } = await supabase
      .from("staff")
      .upsert(staffUpdates, { onConflict: "id" });

    if (updateError) {
      throw new Error(`スタッフの更新に失敗しました: ${updateError.message}`);
    }
  }

  // 挿入
  if (staffInserts.length > 0) {
    const { error: insertError } = await supabase
      .from("staff")
      .insert(staffInserts);

    if (insertError) {
      throw new Error(`スタッフの挿入に失敗しました: ${insertError.message}`);
    }
  }

  // 同期されなかったスタッフを非アクティブ化
  const syncedStaffNames = new Set(uniqueStaffData.map((staff) => staff.name));
  const staffToDeactivate = existingStaff?.filter(
    (staff) => !syncedStaffNames.has(staff.name)
  );

  if (staffToDeactivate && staffToDeactivate.length > 0) {
    const { error: deactivateError } = await supabase
      .from("staff")
      .update({ is_published: false, updated_at: new Date().toISOString() })
      .in(
        "id",
        staffToDeactivate.map((staff) => staff.id)
      );

    if (deactivateError) {
      throw new Error(
        `スタッフの非アクティブ化に失敗しました: ${deactivateError.message}`
      );
    }
  }

  return {
    updated: staffUpdates.length,
    inserted: staffInserts.length,
    deactivated: staffToDeactivate?.length || 0,
  };
}
