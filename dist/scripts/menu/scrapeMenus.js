"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeMenus = scrapeMenus;
exports.scrapeMenusWithRetry = scrapeMenusWithRetry;
const crypto_1 = __importDefault(require("crypto"));
async function scrapeMenus(page) {
    await page.waitForSelector("#menuEditForm", {
        state: "visible",
        timeout: 30000,
    });
    console.log("Menu edit form found");
    // デバッグ情報
    console.log("Current URL:", await page.url());
    console.log("Menu form visible:", await page.isVisible("#menuEditForm"));
    console.log("All menu tables:", await page.$$eval("table.tbl_edit_store.menu_table", (tables) => tables.length));
    // セレクタを変更し、待機時間を延長
    await page.waitForSelector('table.tbl_edit_store.menu_table[style*="display:block"]', { state: "attached", timeout: 60000 });
    console.log("Visible menu tables found");
    const menus = await extractMenuItems(page);
    const dataHash = generateDataHash(menus);
    return { menus, dataHash };
}
async function extractMenuItems(page) {
    const menuItems = [];
    // セレクタを変更
    const menuTables = await page.$$('table.tbl_edit_store.menu_table[style*="display:block"]');
    console.log(`Found ${menuTables.length} visible menu tables`);
    for (let i = 0; i < menuTables.length; i++) {
        const menuTable = menuTables[i];
        try {
            const index = await menuTable.getAttribute("id");
            const numericIndex = index
                ? index.replace("TagTBL_MENU_TABLE_", "").padStart(3, "0")
                : "";
            console.log(`Processing menu item ${i + 1}, index: ${numericIndex}`);
            const [name, category, description, price, duration, isReservable, isPublished, searchCategory,] = await Promise.all([
                getElementText(menuTable, `#MENU_SET_NAME_NAME_${numericIndex}`),
                getElementValue(menuTable, `#MENU_SET_MENU_CATEGORY_NAME_${numericIndex}`),
                getElementText(menuTable, `#MENU_SET_EXPLANATION_NAME_${numericIndex}`),
                getElementValue(menuTable, `#MENU_SET_PRICE_NAME_${numericIndex}`),
                getElementValue(menuTable, `#MENU_SET_TIME_NAME_${numericIndex}`),
                isElementChecked(menuTable, `#MENU_SET_RESERVE_DISP_FLG_${numericIndex}_DISP`),
                isElementChecked(menuTable, `#MENU_SET_PRESENT_FLG_NAME_${numericIndex}_PRESENT`),
                getSelectedOptionText(menuTable, `#MENU_SET_SEARCH_CATEGORY_NAME_${numericIndex}`),
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
        }
        catch (error) {
            console.error(`Error extracting menu item ${i + 1}:`, error);
        }
    }
    return menuItems;
}
async function getElementText(element, selector) {
    try {
        const elementHandle = await element.$(selector);
        if (!elementHandle) {
            console.warn(`Element not found: ${selector}`);
            return "";
        }
        return await elementHandle.evaluate((el) => el.textContent?.trim() || "");
    }
    catch (error) {
        console.warn(`Failed to get text for selector ${selector}:`, error);
        return "";
    }
}
async function getElementValue(element, selector) {
    try {
        const elementHandle = await element.$(selector);
        if (!elementHandle) {
            console.warn(`Element not found: ${selector}`);
            return "";
        }
        return await elementHandle.evaluate((el) => el.value || "");
    }
    catch (error) {
        console.warn(`Failed to get value for selector ${selector}:`, error);
        return "";
    }
}
async function isElementChecked(element, selector) {
    try {
        const elementHandle = await element.$(selector);
        if (!elementHandle) {
            console.warn(`Element not found: ${selector}`);
            return false;
        }
        return await elementHandle.evaluate((el) => el.checked);
    }
    catch (error) {
        console.warn(`Failed to get checked state for selector ${selector}:`, error);
        return false;
    }
}
async function getSelectedOptionText(element, selector) {
    try {
        const elementHandle = await element.$(selector);
        if (!elementHandle) {
            console.warn(`Element not found: ${selector}`);
            return "";
        }
        return await elementHandle.evaluate((el) => {
            const selectedOption = el.options[el.selectedIndex];
            return selectedOption ? selectedOption.text : "";
        });
    }
    catch (error) {
        console.warn(`Failed to get selected option text for selector ${selector}:`, error);
        return "";
    }
}
async function retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        }
        catch (error) {
            if (i === maxRetries - 1)
                throw error;
            console.warn(`Retry ${i + 1}/${maxRetries} failed. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw new Error("Max retries reached");
}
async function scrapeMenusWithRetry(page) {
    return retryOperation(() => scrapeMenus(page));
}
function generateDataHash(menus) {
    const sortedMenus = menus.sort((a, b) => a.name.localeCompare(b.name));
    const dataString = JSON.stringify(sortedMenus);
    return crypto_1.default.createHash("sha256").update(dataString).digest("hex");
}
