import { Page } from "playwright";
import { RawCoupon } from "@/types/coupon";
import crypto from "crypto";

export async function scrapeCoupons(
  page: Page
): Promise<{ coupons: RawCoupon[]; dataHash: string }> {
  const coupons: RawCoupon[] = [];

  let rowCount = await page.$$eval(
    ".table_list_store tbody tr",
    (rows) => rows.length
  );
  console.log(`Found ${rowCount} coupon rows initially`);

  for (let i = 0; i < rowCount; i++) {
    console.log(`Processing coupon ${i + 1} of ${rowCount}`);

    try {
      // 毎回行を再取得
      const rows = await page.$$(".table_list_store tbody tr");
      if (i >= rows.length) {
        console.log(`Row ${i + 1} no longer exists, stopping processing`);
        break;
      }
      const row = rows[i];

      const detailButton = await row.$('a[onclick^="doEdit"]');
      if (!detailButton) {
        console.log(`Detail button not found for row ${i + 1}, skipping`);
        continue;
      }

      const onclickAttribute = await detailButton.getAttribute("onclick");
      if (!onclickAttribute) {
        console.log(`Onclick attribute not found for row ${i + 1}, skipping`);
        continue;
      }

      const match = onclickAttribute.match(
        /doEdit\(event,\s*'[^']*',\s*'([^']*)'/
      );
      const couponId = match ? match[1] : "";

      if (couponId) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle" }),
          detailButton.click(),
        ]);

        const coupon = await scrapeCouponDetails(page, couponId);
        coupons.push(coupon);

        await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle" }),
          page.goBack(),
        ]);

        await page.waitForSelector(".table_list_store tbody tr", {
          state: "attached",
          timeout: 30000,
        });

        // 行数を再計算（ページに変更がある可能性があるため）
        rowCount = await page.$$eval(
          ".table_list_store tbody tr",
          (rows) => rows.length
        );
      }
    } catch (error) {
      console.error(`Error processing coupon ${i + 1}: ${error}`);
    }
  }

  const dataHash = generateDataHash(coupons);
  return { coupons, dataHash };
}

async function scrapeCouponDetails(
  page: Page,
  couponId: string
): Promise<RawCoupon> {
  try {
    await page.waitForSelector("#TagTA_NM_COUPON_NAME_01", {
      state: "visible",
      timeout: 30000,
    });

    const name = await page.$eval(
      "#TagTA_NM_COUPON_NAME_01",
      (el) => (el as HTMLInputElement).value
    );
    const category = await page.$eval(
      "#TagSL_NM_COUPON_TYPE_CD_01 option:checked",
      (el) => el.textContent || ""
    );
    const description = await page.$eval(
      "#TagTA_NM_CONTENT_EXPLANATION_01",
      (el) => (el as HTMLTextAreaElement).value
    );
    const price = await page.$eval(
      "#TagIN_NM_PRICE_01",
      (el) => (el as HTMLInputElement).value
    );
    const duration = await page.$eval(
      "#TagSL_NM_SEJYUTSU_AIM_TIME_01",
      (el) => (el as HTMLInputElement).value
    );
    const isReservable = await page.$eval(
      'input[name="frmCouponEditDto.checkedAutoExpiration"]',
      (el) => (el as HTMLInputElement).checked
    );
    const imageUrl = await page.$eval(
      "#TagImgCouponPoto",
      (el) => (el as HTMLImageElement).src
    );

    return {
      name,
      category,
      description,
      price,
      duration,
      isReservable,
      imageUrl,
      couponId,
    };
  } catch (error) {
    console.error(`Error scraping coupon details for ${couponId}: ${error}`);
    return {
      name: "Error",
      category: "",
      description: "",
      price: "",
      duration: "",
      isReservable: false,
      imageUrl: "",
      couponId,
    };
  }
}

function generateDataHash(coupons: RawCoupon[]): string {
  const sortedCoupons = coupons.sort((a, b) => a.name.localeCompare(b.name));
  const dataString = JSON.stringify(sortedCoupons);
  return crypto.createHash("sha256").update(dataString).digest("hex");
}
