"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processReservation = processReservation;
const supabase_js_1 = require("@supabase/supabase-js");
const date_fns_1 = require("date-fns");
const { zonedTimeToUtc } = require("date-fns-tz");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
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

async function processReservation(raw, userId) {
  // カスタムの parseDateTime 関数を使用して日時をパース
  const startTime = parseDateTime(raw.date);

  // 所要時間が分かっている場合は、startTime から endTime を計算
  const durationMinutes = raw.duration || 90; // デフォルトで90分
  const endTime = (0, date_fns_1.addMinutes)(startTime, durationMinutes);

  // 以下の処理は変更せず
  const menuId = await getMenuId(raw.menu, userId);
  const finalMenuId = menuId === null ? 0 : menuId;
  const staffId = await getStaffId(raw.staff, userId);
  const total_price = extractPrice(raw.amount);
  const cleanStatus = raw.status.replace(/\(未読\)$/, "").trim();

  return {
    user_id: userId,
    menu_id: finalMenuId,
    staff_id: staffId,
    status: mapStatus(cleanStatus),
    total_price: total_price,
    start_time: (0, date_fns_1.format)(startTime, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    end_time: (0, date_fns_1.format)(endTime, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    created_at: (0, date_fns_1.format)(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
    updated_at: (0, date_fns_1.format)(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
    scraped_customer: raw.customerName,
    scraped_menu: raw.menu,
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
async function getMenuId(menuName) {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id")
    .ilike("name", `%${menuName}%`)
    .limit(1);
  if (error) {
    console.error("Error fetching menu ID:", error);
    return 0; // エラー時のデフォルト値
  }
  return data && data.length > 0 ? data[0].id : 0;
}
async function getStaffId(staffName, userId) {
  const cleanedStaffName = staffName.replace(/（指）|\(指\)/g, "").trim();
  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", `%${cleanedStaffName}%`)
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
