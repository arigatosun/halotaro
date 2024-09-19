// app/actions/syncMenus.ts

import { Page } from "playwright";

import {
  upsertMenuItems,
  deactivateMenuItems,
  createMenuSyncLog,
  ProcessedMenuItem,
  MenuSyncLog,
} from "./menuSync";
import { scrapeMenusWithRetry } from "../../../scripts/menu/scrapeMenus";
import { processMenuData } from "../../../scripts/menu/processMenuData";

export async function syncMenus(page: Page, userId: string) {
  const syncStartedAt = new Date().toISOString();
  let syncLog: Omit<MenuSyncLog, "id" | "created_at" | "updated_at"> = {
    user_id: userId,
    sync_started_at: syncStartedAt,
    sync_completed_at: null,
    status: "in_progress",
    items_processed: 0,
    items_updated: 0,
    items_added: 0,
    items_deactivated: 0,
    error_message: null,
  };

  try {
    const rawMenuItems = await scrapeMenusWithRetry(page);
    const processedMenuItems = processMenuData(rawMenuItems.menus, userId);

    syncLog.items_processed = processedMenuItems.length;

    const upsertResult = await upsertMenuItems(userId, processedMenuItems);
    if (upsertResult) {
      syncLog.items_updated = upsertResult.filter(
        (item: any) => item.updated_at !== item.created_at
      ).length;
      syncLog.items_added = upsertResult.filter(
        (item: any) => item.updated_at === item.created_at
      ).length;
    }

    const activeMenuNames = processedMenuItems.map((item) => item.name);
    const deactivateResult = await deactivateMenuItems(userId, activeMenuNames);
    if (deactivateResult) {
      syncLog.items_deactivated = deactivateResult.length;
    }

    syncLog.status = "completed";
    syncLog.sync_completed_at = new Date().toISOString();
  } catch (error: unknown) {
    syncLog.status = "failed";
    syncLog.error_message =
      error instanceof Error ? error.message : String(error);
    syncLog.sync_completed_at = new Date().toISOString();
  }

  await createMenuSyncLog(userId, syncLog);

  if (syncLog.status === "failed") {
    throw new Error(`Menu sync failed: ${syncLog.error_message}`);
  }

  return syncLog;
}
