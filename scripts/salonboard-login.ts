import { Page, Browser } from "playwright";

export async function loginToSalonboard(
  page: Page,
  userId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await page.goto("https://salonboard.com/login/");
    await page.fill('input[name="userId"]', userId);
    await page.fill('input[name="password"]', password);

    await Promise.all([
      page.click(".common-CNCcommon__primaryBtn.loginBtnSize"),
      page.waitForNavigation({ waitUntil: "networkidle" }),
    ]);

    const isLoggedIn = await page.isVisible("#todayReserve");

    if (!isLoggedIn) {
      return {
        success: false,
        error: "Login failed: Dashboard element not found",
      };
    }

    console.log("ログイン完了");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
