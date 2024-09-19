import { chromium, BrowserContext } from "playwright";
import fs from "fs";
import path from "path";

const SESSION_FILE = path.join(__dirname, "session.json");

async function saveSession(context: BrowserContext) {
  const cookies = await context.cookies();
  const localStorage = await context.pages()[0].evaluate(() => {
    const storage: Record<string, string> = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        storage[key] = window.localStorage.getItem(key) || "";
      }
    }
    return JSON.stringify(storage);
  });
  const sessionData = { cookies, localStorage };
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData));
}

async function loadSession(context: BrowserContext) {
  if (fs.existsSync(SESSION_FILE)) {
    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
    await context.addCookies(sessionData.cookies);
    await context.pages()[0].evaluate((storedData) => {
      const data = JSON.parse(storedData);
      for (const key in data) {
        localStorage.setItem(key, data[key]);
      }
    }, sessionData.localStorage);
    return true;
  }
  return false;
}
