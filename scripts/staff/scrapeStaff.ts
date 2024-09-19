// scripts/staff/scrapeStaff.ts

import { Page } from "playwright";

export interface RawStaffData {
  name: string;
  role: string;
  experience: string;
  isPublished: boolean;
  image: string;
  description: string;
  sortOrder: number;
}

export async function scrapeStaff(page: Page): Promise<RawStaffData[]> {
  await page.waitForSelector('tr[name="staff_info"]');

  const staffData = await page.$$eval('tr[name="staff_info"]', (rows) => {
    return rows.map((row, index) => {
      const nextRow = row.nextElementSibling as HTMLElement;
      const cells = row.querySelectorAll('td[name^="td["]');
      const nameCell = cells[3];
      const roleCell = cells[4];
      const experienceCell = cells[5];
      const imageElement = row.querySelector(
        'img[name="staffPhoto"]'
      ) as HTMLImageElement;
      const descriptionElement = nextRow?.querySelector('td[colspan="4"]');
      const isPublished = !row.classList.contains("td_value_store_gray_c");
      const sortOrderInput = row.querySelector(
        'input[name$=".sortNo"]'
      ) as HTMLInputElement;

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
