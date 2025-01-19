"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeReservations = scrapeReservations;
const crypto_1 = __importDefault(require("crypto"));
async function scrapeReservations(
  page,
  startDate,
  endDate,
  lastSyncTime,
  lastReservationId,
  salonType
) {
  console.log("開始日:", startDate, "終了日:", endDate);
  await selectDateRange(page, startDate, endDate);
  await page.waitForTimeout(1000); // 日付選択後の更新を待つ
  console.log("日付範囲選択完了");
  await clickSearch(page);
  console.log("検索ボタンクリック完了");
  const reservations = [];
  let currentLastReservationId = lastReservationId;
  let shouldContinue = true;
  let pageNum = 1;
  while (shouldContinue) {
    console.log(`ページ ${pageNum} の予約情報を取得中...`);
    const pageReservations = await scrapeReservationTable(page, salonType);
    console.log(
      `ページ ${pageNum} で ${pageReservations.length} 件の予約を取得`
    );
    for (const reservation of pageReservations) {
      console.log(`Checking reservation: ${JSON.stringify(reservation)}`);
      // 変更後のコード
      const dateStr = reservation.date;
      const timeStr = reservation.time;

      if (!timeStr) {
        console.error(
          `Time is undefined for reservation: ${JSON.stringify(reservation)}`
        );
        continue; // またはデフォルトの時間を設定
      }

      const reservationDate = parseJapaneseDate(dateStr);
      const [hours, minutes] = timeStr.split(":").map(Number);
      reservationDate.setHours(hours, minutes);
      console.log(
        `Parsed Reservation date: ${reservationDate}, Last sync time: ${lastSyncTime}`
      );
      if (reservationDate > lastSyncTime) {
        console.log(`Adding reservation to list`);
        reservations.push(reservation);
        if (!currentLastReservationId) {
          currentLastReservationId = reservation.reservationId;
        }
      } else {
        console.log(`Skipping reservation (older than last sync)`);
      }
    }
    if (pageReservations.length > 0) {
      const hasNextPage = await goToNextPage(page);
      if (hasNextPage) {
        pageNum++;
      } else {
        shouldContinue = false;
      }
    } else {
      shouldContinue = false;
    }
  }
  console.log(`合計 ${reservations.length} 件の予約を取得`);
  const dataHash = generateHash(reservations);
  return {
    reservations,
    dataHash,
    lastReservationId: currentLastReservationId || lastReservationId || "",
  };
}
function parseJapaneseDate(dateString) {
  const [month, day] = dateString.split("/").map(Number);
  const year = new Date().getFullYear(); // 現在の年を使用
  return new Date(year, month - 1, day);
}
async function selectDateRange(page, startDate, endDate) {
  // 開始日の選択
  await page.click("#dispDateFrom");
  await page.waitForSelector("#calendarArea", { state: "visible" });
  await selectDateFromCalendar(page, startDate);
  await page.waitForSelector("#calendarArea", { state: "hidden" });
  // 終了日の選択
  await page.click("#dispDateTo");
  await page.waitForSelector("#calendarArea", { state: "visible" });
  await selectDateFromCalendar(page, endDate);
  await page.waitForSelector("#calendarArea", { state: "hidden" });
  console.log("日付範囲選択完了:", startDate, "-", endDate);
}
async function selectDateFromCalendar(page, date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScriptの月は0-11なので、1を足す
  const day = date.getDate();
  console.log("カレンダーで選択する日付:", year, month, day);
  // 年月が合うまでカレンダーを移動
  while (true) {
    const currentYearMonth = await page.$eval(
      "#calendarArea th.w65",
      (el) => el.textContent
    );
    if (currentYearMonth === `${year}`) {
      const currentMonth = await page.$eval(
        "#calendarArea th.mod_left p",
        (el) => el.textContent
      );
      if (currentMonth === `${month}月`) {
        break;
      }
    }
    await page.click("#nextMonth");
    await page.waitForTimeout(100); // カレンダーの更新を待つ
  }
  // 日付を選択
  await page.click(
    `#calendarArea a[href="#${year}${month.toString().padStart(2, "0")}${day
      .toString()
      .padStart(2, "0")}"]`
  );
  console.log("日付選択完了:", year, month, day);
}
async function clickSearch(page) {
  await page.click("#search");
  await page.waitForTimeout(2000);
  console.log("検索完了、結果ページ読み込み完了");
}
async function scrapeReservationTable(page, salonType) {
  const reservations = [];
  const rows = await page.$$("#resultList tbody tr");
  console.log(`テーブルから ${rows.length} 行を検出`);
  for (const row of rows) {
    const reservation = await scrapeReservationRow(row, salonType);
    if (reservation) {
      reservations.push(reservation);
    }
  }
  return reservations;
}
async function scrapeReservationRow(row, salonType) {
  try {
    let dateSelector,
      statusSelector,
      customerNameSelector,
      reservationIdSelector,
      staffSelector,
      reservationRouteSelector,
      menuSelector,
      usedPointsSelector,
      paymentMethodSelector,
      amountSelector;

    if (salonType === "hair") {
      // Hairサロンのセレクタ
      dateSelector = "td:nth-child(1) a";
      statusSelector = "td:nth-child(2)";
      customerNameSelector = "td:nth-child(3) p:first-child";
      reservationIdSelector = "td:nth-child(3) p:last-child a";
      staffSelector = "td:nth-child(4)";
      reservationRouteSelector = "td:nth-child(5)";
      menuSelector = "td:nth-child(6) ul li";
      usedPointsSelector = "td:nth-child(7)";
      paymentMethodSelector = "td:nth-child(8)";
      amountSelector = "td:nth-child(9)";
    } else if (salonType === "kirei") {
      // Kireiサロンのセレクタ（実際のHTML構造に合わせて調整してください）
      dateSelector = "td.rsv_date a";
      statusSelector = "td:nth-child(2)";
      customerNameSelector = "td:nth-child(3) p:first-child";
      reservationIdSelector = "td:nth-child(3) p:last-child a";
      staffSelector = "td:nth-child(4)";
      reservationRouteSelector = "td:nth-child(5)";
      menuSelector = "td:nth-child(6)";
      usedPointsSelector = "td:nth-child(7)";
      paymentMethodSelector = "td:nth-child(8)";
      amountSelector = "td:nth-child(9)";
    } else {
      throw new Error(`Unknown salonType: ${salonType}`);
    }

    // 日付と時間を取得
    const dateTime = await row.$eval(dateSelector, (el) => el.innerText.trim());
    const [datePart, timePart] = dateTime.split("\n").map((s) => s.trim());
    const date = datePart;
    const time = timePart || ""; // timePartが存在しない場合は空文字

    // ステータスを取得
    const status = await row.$eval(
      statusSelector,
      (el) => el.textContent?.trim() || ""
    );

    // お客様名を取得
    const customerName = await row.$eval(
      customerNameSelector,
      (el) => el.textContent?.trim() || ""
    );

    // 予約番号を取得
    const reservationId = await row.$eval(
      reservationIdSelector,
      (el) => el.textContent?.replace(/[()]/g, "") || ""
    );

    // スタイリストを取得
    const staff = await row.$eval(
      staffSelector,
      (el) => el.textContent?.trim() || ""
    );

    // 予約経路を取得
    const reservationRoute = await row.$eval(
      reservationRouteSelector,
      (el) => el.textContent?.trim() || ""
    );

    // メニューを取得
    let menu;
    if (salonType === "hair") {
      const menuItems = await row.$$eval(menuSelector, (elements) =>
        elements.map((el) => el.textContent?.trim() || "")
      );
      menu = menuItems.join(", ");
    } else if (salonType === "kirei") {
      menu = await row.$eval(
        menuSelector,
        (el) => el.textContent?.trim() || ""
      );
    }

    // 利用ポイントを取得
    const usedPoints = await row.$eval(
      usedPointsSelector,
      (el) => el.textContent?.trim() || ""
    );

    // 支払い種別を取得
    const paymentMethod = await row.$eval(
      paymentMethodSelector,
      (el) => el.textContent?.trim() || ""
    );

    // お支払金額を取得
    const amount = await row.$eval(
      amountSelector,
      (el) => el.textContent?.trim() || ""
    );

    return {
      date,
      time,
      status,
      customerName,
      reservationId,
      staff,
      reservationRoute,
      menu,
      usedPoints,
      paymentMethod,
      amount,
    };
  } catch (error) {
    console.error("Error scraping reservation row:", error);
    return null;
  }
}
async function goToNextPage(page) {
  const nextPageLink = await page.$("div.paging p.next a");
  if (nextPageLink) {
    await Promise.all([
      nextPageLink.click(),
      page.waitForNavigation({ waitUntil: "networkidle" }),
    ]);
    console.log(`次のページに移動`);
    return true;
  }
  console.log(
    "次のページが見つかりません。最後のページに到達した可能性があります。"
  );
  return false;
}
function generateHash(reservations) {
  const sortedReservations = reservations.sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const dataString = JSON.stringify(sortedReservations);
  return crypto_1.default.createHash("sha256").update(dataString).digest("hex");
}
