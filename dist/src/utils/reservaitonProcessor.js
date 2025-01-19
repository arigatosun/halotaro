"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processReservation = processReservation;
const { createClient } = require("@supabase/supabase-js");
const { addMinutes, format } = require("date-fns");
const { zonedTimeToUtc } = require("date-fns-tz");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function parseDateTime(dateString) {
  // dateString は "MM/DDHH:mm" 形式（例: "10/2014:00"）
  const dateTimeRegex = /^(\d{1,2})\/(\d{1,2})(\d{1,2}):(\d{2})$/;
  const match = dateString.match(dateTimeRegex);

  if (!match) {
    throw new Error(`Invalid date format: ${dateString}`);
  }

  const [, monthStr, dayStr, hourStr, minuteStr] = match;
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const hours = parseInt(hourStr, 10);
  const minutes = parseInt(minuteStr, 10);

  const currentYear = new Date().getFullYear();

  // Dateオブジェクトを作成（UTCで作成し、タイムゾーンの問題を回避）
  const date = new Date(
    Date.UTC(currentYear, month - 1, day, hours - 9, minutes)
  );

  return date;
}

async function processReservation(raw, userId, salonType) {
  // dateとtimeを結合してパース
  const dateStr = raw.date.replace(/\s/g, "");
  const timeStr = raw.time.replace(/\s/g, "");
  const dateTimeStr = dateStr + timeStr;
  const startTime = parseDateTime(dateTimeStr);

  // 所要時間が分かっている場合は、startTime から endTime を計算
  const durationMinutes = raw.duration || 90; // デフォルトで90分
  const endTime = addMinutes(startTime, durationMinutes);

  // メニューIDを取得
  const menuId = await getMenuId(raw.menu, userId);
  const finalMenuId = menuId === null ? 0 : menuId;

  // スタッフIDを取得
  const staffId = await getStaffId(raw.staff, userId);

  // 金額を抽出
  const total_price = extractPrice(raw.amount);

  // ステータスをクリーンアップ
  const cleanStatus = raw.status.replace(/\(未読\)$/, "").trim();

  // サロンタイプに基づいてフラグを設定
  const isHairSync = salonType === "hair";

  return {
    user_id: userId,
    menu_id: finalMenuId,
    staff_id: staffId,
    status: mapStatus(cleanStatus),
    total_price: total_price,
    start_time: format(startTime, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    end_time: format(endTime, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    created_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
    updated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
    scraped_customer: raw.customerName,
    scraped_menu: raw.menu,
    is_hair_sync: isHairSync, // 追加：is_hair_syncフラグを追加
  };
}

function extractPrice(amountString) {
  if (amountString === "-") {
    return 0;
  }
  // 括弧の外にある金額を抽出
  const outsideBracketMatch = amountString.match(/(\d{1,3}(,\d{3})*)\s*円/);
  if (outsideBracketMatch) {
    return parseInt(outsideBracketMatch[1].replace(/,/g, ""), 10);
  }
  // 括弧内の金額がある場合は、括弧の外の金額を返す
  const bracketMatch = amountString.match(/(\d{1,3}(,\d{3})*)\s*円.*\(.*\)/);
  if (bracketMatch) {
    return parseInt(bracketMatch[1].replace(/,/g, ""), 10);
  }
  // 上記のパターンに一致しない場合は、最初に見つかる数値を返す
  const numberMatch = amountString.match(/(\d{1,3}(,\d{3})*)/);
  if (numberMatch) {
    return parseInt(numberMatch[1].replace(/,/g, ""), 10);
  }
  return 0;
}

async function getMenuId(menuName, userId) {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id")
    .eq("user_id", userId) // ユーザーIDでフィルタリング
    .ilike("name", `%${menuName}%`)
    .limit(1);

  if (error) {
    console.error("Error fetching menu ID:", error);
    return 0; // エラー時のデフォルト値
  }

  return data && data.length > 0 ? data[0].id : 0;
}

async function getStaffId(staffName, userId) {
  // "(指)" を削除
  const cleanedStaffName = staffName.replace(/（指）|\(指\)/g, "").trim();

  // 不可視文字（ゼロ幅スペースなど）を削除
  const cleanedStaffNameWithoutInvisibleChars = cleanedStaffName.replace(
    /[\u200B-\u200D\uFEFF]/g,
    ""
  );

  // 文字列を正規化（NFC 形式）
  const normalizedStaffName =
    cleanedStaffNameWithoutInvisibleChars.normalize("NFC");

  // デバッグ用ログ
  console.log(`Normalized staff name: "${normalizedStaffName}"`);

  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .eq("user_id", userId) // ユーザーIDでフィルタリング
    .ilike("name", `%${normalizedStaffName}%`)
    .single();

  if (error) {
    console.error("Error fetching staff ID:", error);
    return null;
  }

  return data?.id || null;
}

function mapStatus(status) {
  // ステータスのマッピングを実装
  const statusMap = {
    受付待ち: "confirmed",
    済み: "completed",
    お断り: "rejected",
    お客様キャンセル: "cancelled",
    サロンキャンセル: "cancelled",
    無断キャンセル: "no_show",
    自動キャンセル: "auto_cancelled",
    会計済み: "completed",
  };
  return statusMap[status] || "unknown";
}
