"use strict";
// scripts/staff/scrapeStaff.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeStaff = scrapeStaff;

/**
 * スタッフ情報をスクレイピングする関数
 * @param {import('playwright').Page} page - Playwrightのページオブジェクト
 * @param {string} salonType - サロンの種類 ("hair" または "kirei")
 * @returns {Promise<Array>} - スタッフ情報の配列
 */
async function scrapeStaff(page, salonType) {
  // サロンタイプに応じてスタッフ行のセレクタを設定
  const staffRowSelector =
    salonType === "hair" ? 'tr[name="stylist_info"]' : 'tr[name="staff_info"]';

  // スタッフ行が表示されるまで待機
  await page.waitForSelector(staffRowSelector);

  // スタッフデータを取得
  const staffData = await page.$$eval(
    staffRowSelector,
    (rows, salonType) => {
      return rows.map((row) => {
        // 次の行を取得（説明文が次の行にある場合）
        const nextRow = row.nextElementSibling;

        // セルを取得
        const cells = row.querySelectorAll('td[name^="td["]');

        // スタッフIDを取得
        const stylistIdInput = row.querySelector('input[name$=".stylistId"]');
        const stylistId = stylistIdInput ? stylistIdInput.value : "";

        // ソート順を取得
        const sortOrderInput = row.querySelector('input[name$=".sortNo"]');
        const sortOrder = sortOrderInput
          ? parseInt(sortOrderInput.value, 10)
          : 0;

        // 公開状態を取得
        let isPublished = true;

        if (salonType === "hair") {
          // ヘアサロンの場合
          const presentLink = row.querySelector('a[onclick^="stylistPresent"]');
          if (presentLink) {
            const publishImg = presentLink.querySelector("img");
            const altText = publishImg?.getAttribute("alt") || "";
            if (altText === "非掲載") {
              isPublished = false;
            }
          }
        } else {
          // キレイサロンの場合
          isPublished = !row.classList.contains("td_value_store_gray_c");
        }

        // スタッフ名、役職、経験年数の取得
        let name = "";
        let role = "";
        let experience = "";
        let description = "";
        let image = "";

        if (salonType === "hair") {
          // ヘアサロンの場合
          name = cells[3]?.textContent?.trim() || "";
          role = cells[4]?.textContent?.trim() || "";
          experience = cells[5]?.textContent?.trim() || "";

          // 説明文（キャッチフレーズ）を次の行から取得
          const descriptionElement = nextRow?.querySelector('td[colspan="4"]');
          description = descriptionElement?.textContent?.trim() || "";

          // 画像を取得
          const imageElement = row.querySelector('img[name="stylistPhoto"]');
          image = imageElement?.src || "";
        } else {
          // キレイサロンの場合
          name = cells[3]?.textContent?.trim() || "";
          role = cells[4]?.textContent?.trim() || "";
          experience = cells[5]?.textContent?.trim() || "";

          // 説明文（キャッチフレーズ）を次の行から取得
          const descriptionElement = nextRow?.querySelector('td[colspan="4"]');
          description = descriptionElement?.textContent?.trim() || "";

          // 画像を取得
          const imageElement = row.querySelector('img[name="staffPhoto"]');
          image = imageElement?.src || "";
        }

        return {
          name: name,
          role: role,
          experience: experience,
          isPublished: isPublished,
          image: image,
          description: description,
          sortOrder: sortOrder,
        };
      });
    },
    salonType
  );

  // スタッフデータを返す
  return staffData;
}
