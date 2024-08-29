//scrapeReservation.ts
import { Page } from "playwright";
import { format } from "date-fns-tz";
import { ja } from "date-fns/locale";

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
  endDate: Date
): Promise<Reservation[]> {
  await selectDateRange(page, startDate, endDate);
  await page.waitForTimeout(1000); // 日付選択後の更新を待つ
  await clickSearch(page);

  const reservations = await scrapeReservationTable(page);
  return reservations;
}

async function selectDateRange(page: Page, startDate: Date, endDate: Date) {
  // 終了日の選択
  await page.click("#dispDateTo");
  await page.waitForSelector("#calendarArea", { state: "visible" });
  await selectDateFromCalendar(page, endDate);

  // カレンダーが閉じるのを待つ
  await page.waitForSelector("#calendarArea", { state: "hidden" });
}

async function selectDateFromCalendar(page: Page, date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScriptの月は0-11なので、1を足す
  const day = date.getDate();
  console.log(year, month, day);

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
}

async function setDateRange(page: Page, startDate: Date, endDate: Date) {
  const startDateStr = format(startDate, "yyyy年M月d日（E）", {
    locale: ja,
    timeZone: "Asia/Tokyo",
  });
  const endDateStr = format(endDate, "yyyy年M月d日（E）", {
    locale: ja,
    timeZone: "Asia/Tokyo",
  });

  await page.evaluate(
    ({ startDateStr, endDateStr }) => {
      const startDateInput = document.querySelector(
        "#dispDateFrom"
      ) as HTMLInputElement;
      const endDateInput = document.querySelector(
        "#dispDateTo"
      ) as HTMLInputElement;
      if (startDateInput && endDateInput) {
        startDateInput.value = startDateStr;
        endDateInput.value = endDateStr;
      } else {
        console.error("Date input elements not found");
      }
    },
    { startDateStr, endDateStr }
  );
}

async function clickSearch(page: Page) {
  await page.click("#search");
  await page.waitForNavigation({ waitUntil: "networkidle" });
}

async function scrapeReservationTable(page: Page): Promise<Reservation[]> {
  const reservations: Reservation[] = [];

  const rows = await page.$$("#resultList tbody tr");

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
