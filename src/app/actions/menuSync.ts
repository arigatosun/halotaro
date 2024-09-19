// app/actions/menuSync.ts

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export interface ProcessedMenuItem {
  user_id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  is_reservable: boolean;
}

export interface MenuSyncLog {
  id: string;
  user_id: string;
  sync_started_at: string;
  sync_completed_at: string | null;
  status: string;
  items_processed: number;
  items_updated: number;
  items_added: number;
  items_deactivated: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface UpsertResult {
  created_at: string;
  updated_at: string;
}

interface DeactivateResult {
  id: string;
}

export async function upsertMenuItems(
  userId: string,
  menuItems: ProcessedMenuItem[]
): Promise<UpsertResult[]> {
  const cookieStore = cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("Authentication error:", authError);
    throw new Error("Authentication failed");
  }

  if (user.id !== userId) {
    throw new Error("User ID mismatch");
  }

  const { data, error } = await supabase.from("menu_items").upsert(menuItems, {
    onConflict: "user_id,name",
  });

  if (error) {
    console.error("Error upserting menu items:", error);
    throw new Error(`Failed to upsert menu items: ${error.message}`);
  }

  return data ?? [];
}

export async function deactivateMenuItems(
  userId: string,
  activeMenuNames: string[]
): Promise<DeactivateResult[]> {
  const cookieStore = cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("Authentication error:", authError);
    throw new Error("Authentication failed");
  }

  if (user.id !== userId) {
    throw new Error("User ID mismatch");
  }

  const { data, error } = await supabase
    .from("menu_items")
    .update({ is_reservable: false })
    .eq("user_id", userId)
    .not(
      "name",
      "in",
      `(${activeMenuNames.map((name) => `'${name}'`).join(",")})`
    )
    .select("id");

  if (error) {
    console.error("Error deactivating menu items:", error);
    throw new Error(`Failed to deactivate menu items: ${error.message}`);
  }

  return (data as DeactivateResult[]) ?? [];
}

export async function createMenuSyncLog(
  userId: string,
  logData: Omit<MenuSyncLog, "id" | "created_at" | "updated_at">
) {
  const cookieStore = cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("Authentication error:", authError);
    throw new Error("Authentication failed");
  }

  if (user.id !== userId) {
    throw new Error("User ID mismatch");
  }

  const { data, error } = await supabase
    .from("menu_sync_logs")
    .insert({ ...logData, user_id: userId });

  if (error) {
    console.error("Error creating menu sync log:", error);
    throw new Error(`Failed to create menu sync log: ${error.message}`);
  }

  return data;
}
