"use strict";
// scripts/staff/scrapeStaff.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeStaff = scrapeStaff;
async function scrapeStaff(page) {
    await page.waitForSelector('tr[name="staff_info"]');
    const staffData = await page.$$eval('tr[name="staff_info"]', (rows) => {
        return rows.map((row, index) => {
            const nextRow = row.nextElementSibling;
            const cells = row.querySelectorAll('td[name^="td["]');
            const nameCell = cells[3];
            const roleCell = cells[4];
            const experienceCell = cells[5];
            const imageElement = row.querySelector('img[name="staffPhoto"]');
            const descriptionElement = nextRow?.querySelector('td[colspan="4"]');
            const isPublished = !row.classList.contains("td_value_store_gray_c");
            const sortOrderInput = row.querySelector('input[name$=".sortNo"]');
            return {
                name: nameCell?.textContent?.trim() || "",
                role: roleCell?.textContent?.trim() || "",
                experience: experienceCell?.textContent?.trim() || "",
                isPublished: isPublished,
                image: imageElement?.src || "",
                description: descriptionElement?.textContent?.trim() || "",
                sortOrder: parseInt(sortOrderInput?.value || "0", 10),
            };
        });
    });
    return staffData;
}
