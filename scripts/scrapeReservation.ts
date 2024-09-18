import { Page } from "playwright";
import { format } from "date-fns-tz";
import { ja } from "date-fns/locale";
import crypto from "crypto";

export interface Reservation {
  date: string;
  time: string;
  status: string;
  customerName: string;
  reservationId: string;
  staff: string;
  reservationRoute: string;
  menu: string;
  usedPoints: string;
  paymentMethod: string;
  amount: string;
}

export async function scrapeReservations(
  page: Page,
  startDate: Date,
  endDate: Date,
  lastSyncTime: Date,
  lastReservationId: string | null
): Promise<{
  reservations: Reservation[];
  dataHash: string;
  lastReservationId: string;
}> {
  console.log("開始日:", startDate, "終了日:", endDate);

  await selectDateRange(page, startDate, endDate);
  await page.waitForTimeout(1000); // 日付選択後の更新を待つ

  console.log("日付範囲選択完了");

  await clickSearch(page);
  console.log("検索ボタンクリック完了");

  const reservations: Reservation[] = [];
  let currentLastReservationId = lastReservationId;
  let shouldContinue = true;
  let pageNum = 1;

  while (shouldContinue) {
    console.log(`ページ ${pageNum} の予約情報を取得中...`);
    const pageReservations = await scrapeReservationTable(page);
    console.log(
      `ページ ${pageNum} で ${pageReservations.length} 件の予約を取得`
    );

    for (const reservation of pageReservations) {
      console.log(`Checking reservation: ${JSON.stringify(reservation)}`);
      const [dateStr, timeStr] = reservation.date.split(/(?<=\d{2}\/\d{2})/);
      const reservationDate = parseJapaneseDate(dateStr);
      reservationDate.setHours(
        parseInt(timeStr.split(":")[0]),
        parseInt(timeStr.split(":")[1])
      );
      console.log(
        `Parsed Reservation date: ${reservationDate}, Last sync time: ${lastSyncTime}`
      );

      if (reservation.reservationId === lastReservationId) {
        console.log(`Found last synced reservation: ${lastReservationId}`);
        shouldContinue = false;
        break;
      }
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

    if (shouldContinue && pageReservations.length > 0) {
      const hasNextPage = await goToNextPage(page, pageNum);
      if (!hasNextPage) {
        shouldContinue = false;
      }
      pageNum++;
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

function parseJapaneseDate(dateString: string): Date {
  const [month, day] = dateString.split("/").map(Number);
  const year = new Date().getFullYear(); // 現在の年を使用
  return new Date(year, month - 1, day);
}

async function selectDateRange(page: Page, startDate: Date, endDate: Date) {
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

async function selectDateFromCalendar(page: Page, date: Date) {
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

async function clickSearch(page: Page) {
  await page.click("#search");
  await page.waitForNavigation({ waitUntil: "networkidle" });
  console.log("検索完了、結果ページ読み込み完了");
}

async function scrapeReservationTable(page: Page): Promise<Reservation[]> {
  const reservations: Reservation[] = [];

  const rows = await page.$$("#resultList tbody tr");
  console.log(`テーブルから ${rows.length} 行を検出`);

  for (const row of rows) {
    const reservation = await scrapeReservationRow(row);
    if (reservation) {
      reservations.push(reservation);
    }
  }

  return reservations;
}

async function scrapeReservationRow(row: any): Promise<Reservation | null> {
  try {
    const dateTime = await row.$eval(
      "td.rsv_date a",
      (el: any) => el.textContent?.trim() || ""
    );
    const [date, time] = dateTime.split("\n").map((s: any) => s.trim());

    const status = await row.$eval(
      "td:nth-child(2)",
      (el: any) => el.textContent?.trim() || ""
    );
    const customerName = await row.$eval(
      "td:nth-child(3) p:first-child",
      (el: any) => el.textContent?.trim() || ""
    );
    const reservationId = await row.$eval(
      "td:nth-child(3) p:last-child a",
      (el: any) => el.textContent?.replace(/[()]/g, "") || ""
    );
    const staff = await row.$eval(
      "td:nth-child(4)",
      (el: any) => el.textContent?.trim() || ""
    );
    const reservationRoute = await row.$eval(
      "td:nth-child(5)",
      (el: any) => el.textContent?.trim() || ""
    );
    const menu = await row.$eval(
      "td:nth-child(6)",
      (el: any) => el.textContent?.trim() || ""
    );
    const usedPoints = await row.$eval(
      "td:nth-child(7)",
      (el: any) => el.textContent?.trim() || ""
    );
    const paymentMethod = await row.$eval(
      "td:nth-child(8)",
      (el: any) => el.textContent?.trim() || ""
    );
    const amount = await row.$eval(
      "td:nth-child(9)",
      (el: any) => el.textContent?.trim() || ""
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

async function goToNextPage(page: Page, currentPage: number): Promise<boolean> {
  const nextPageLink = await page.$(`a[href="#${currentPage + 1}"]`);
  if (nextPageLink) {
    await nextPageLink.click();
    await page.waitForNavigation({ waitUntil: "networkidle" });
    console.log(`次のページ (${currentPage + 1}) に移動`);
    return true;
  }
  console.log(
    "次のページが見つかりません。最後のページに到達した可能性があります。"
  );
  return false;
}

function generateHash(reservations: Reservation[]): string {
  const sortedReservations = reservations.sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const dataString = JSON.stringify(sortedReservations);
  return crypto.createHash("sha256").update(dataString).digest("hex");
}
