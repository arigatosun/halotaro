"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginToSalonboard = loginToSalonboard;
async function loginToSalonboard(page, userId, password) {
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
    }
    catch (error) {
        return { success: false, error: error.message };
    }
}
