import { Page } from "playwright";
import crypto from "crypto";

export interface RawMenuItem {
  name: string;
  category: string;
  description: string;
  price: string;
  duration: string;
  isReservable: boolean;
  isPublished: boolean;
  searchCategory: string;
}

export async function scrapeMenus(
  page: Page
): Promise<{ menus: RawMenuItem[]; dataHash: string }> {
  await page.waitForSelector("#menuEditForm", {
    state: "visible",
    timeout: 30000,
  });
  console.log("Menu edit form found");

  // デバッグ情報
  console.log("Current URL:", await page.url());
  console.log("Menu form visible:", await page.isVisible("#menuEditForm"));
  console.log(
    "All menu tables:",
    await page.$$eval(
      "table.tbl_edit_store.menu_table",
      (tables) => tables.length
    )
  );

  // セレクタを変更し、待機時間を延長
  await page.waitForSelector(
    'table.tbl_edit_store.menu_table[style*="display:block"]',
    { state: "attached", timeout: 60000 }
  );
  console.log("Visible menu tables found");

  const menus = await extractMenuItems(page);
  const dataHash = generateDataHash(menus);
  return { menus, dataHash };
}

async function extractMenuItems(page: Page): Promise<RawMenuItem[]> {
  const menuItems: RawMenuItem[] = [];

  // セレクタを変更
  const menuTables = await page.$$(
    'table.tbl_edit_store.menu_table[style*="display:block"]'
  );
  console.log(`Found ${menuTables.length} visible menu tables`);

  for (let i = 0; i < menuTables.length; i++) {
    const menuTable = menuTables[i];
    try {
      const index = await menuTable.getAttribute("id");
      const numericIndex = index
        ? index.replace("TagTBL_MENU_TABLE_", "").padStart(3, "0")
        : "";
      console.log(`Processing menu item ${i + 1}, index: ${numericIndex}`);

      const [
        name,
        category,
        description,
        price,
        duration,
        isReservable,
        isPublished,
        searchCategory,
      ] = await Promise.all([
        getElementText(menuTable, `#MENU_SET_NAME_NAME_${numericIndex}`),
        getElementValue(
          menuTable,
          `#MENU_SET_MENU_CATEGORY_NAME_${numericIndex}`
        ),
        getElementText(menuTable, `#MENU_SET_EXPLANATION_NAME_${numericIndex}`),
        getElementValue(menuTable, `#MENU_SET_PRICE_NAME_${numericIndex}`),
        getElementValue(menuTable, `#MENU_SET_TIME_NAME_${numericIndex}`),
        isElementChecked(
          menuTable,
          `#MENU_SET_RESERVE_DISP_FLG_${numericIndex}_DISP`
        ),
        isElementChecked(
          menuTable,
          `#MENU_SET_PRESENT_FLG_NAME_${numericIndex}_PRESENT`
        ),
        getSelectedOptionText(
          menuTable,
          `#MENU_SET_SEARCH_CATEGORY_NAME_${numericIndex}`
        ),
      ]);

      menuItems.push({
        name,
        category,
        description,
        price,
        duration,
        isReservable,
        isPublished,
        searchCategory,
      });
    } catch (error) {
      console.error(`Error extracting menu item ${i + 1}:`, error);
    }
  }

  return menuItems;
}

async function getElementText(element: any, selector: string): Promise<string> {
  try {
    const elementHandle = await element.$(selector);
    if (!elementHandle) {
      console.warn(`Element not found: ${selector}`);
      return "";
    }
    return await elementHandle.evaluate(
      (el: any) => el.textContent?.trim() || ""
    );
  } catch (error) {
    console.warn(`Failed to get text for selector ${selector}:`, error);
    return "";
  }
}

async function getElementValue(
  element: any,
  selector: string
): Promise<string> {
  try {
    const elementHandle = await element.$(selector);
    if (!elementHandle) {
      console.warn(`Element not found: ${selector}`);
      return "";
    }
    return await elementHandle.evaluate((el: any) => el.value || "");
  } catch (error) {
    console.warn(`Failed to get value for selector ${selector}:`, error);
    return "";
  }
}

async function isElementChecked(
  element: any,
  selector: string
): Promise<boolean> {
  try {
    const elementHandle = await element.$(selector);
    if (!elementHandle) {
      console.warn(`Element not found: ${selector}`);
      return false;
    }
    return await elementHandle.evaluate((el: any) => el.checked);
  } catch (error) {
    console.warn(
      `Failed to get checked state for selector ${selector}:`,
      error
    );
    return false;
  }
}

async function getSelectedOptionText(
  element: any,
  selector: string
): Promise<string> {
  try {
    const elementHandle = await element.$(selector);
    if (!elementHandle) {
      console.warn(`Element not found: ${selector}`);
      return "";
    }
    return await elementHandle.evaluate((el: any) => {
      const selectedOption = el.options[el.selectedIndex];
      return selectedOption ? selectedOption.text : "";
    });
  } catch (error) {
    console.warn(
      `Failed to get selected option text for selector ${selector}:`,
      error
    );
    return "";
  }
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(
        `Retry ${i + 1}/${maxRetries} failed. Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries reached");
}

export async function scrapeMenusWithRetry(
  page: Page
): Promise<{ menus: RawMenuItem[]; dataHash: string }> {
  return retryOperation(() => scrapeMenus(page));
}

function generateDataHash(menus: RawMenuItem[]): string {
  const sortedMenus = menus.sort((a, b) => a.name.localeCompare(b.name));
  const dataString = JSON.stringify(sortedMenus);
  return crypto.createHash("sha256").update(dataString).digest("hex");
}
