// src/actions/menuActions.ts
import { MenuItem } from "@/types/menuItem";
import { supabase } from "@/lib/supabaseClient";

export async function getMenuItems(userId: string): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Supabase error:", error);
    throw new Error(`Failed to fetch menu data: ${error.message}`);
  }

  return data || [];
}

export async function addMenuItem(
  newItem: Omit<MenuItem, "id">,
  userId: string
): Promise<MenuItem> {
  const { data, error } = await supabase
    .from("menu_items")
    .insert({ ...newItem, user_id: userId })
    .select();

  if (error) {
    throw new Error("Failed to add menu item");
  }

  return data![0];
}

export async function updateMenuItem(updatedItem: MenuItem): Promise<void> {
  const { error } = await supabase
    .from("menu_items")
    .update(updatedItem)
    .eq("id", updatedItem.id);

  if (error) {
    throw new Error("Failed to update menu item");
  }
}

export async function deleteMenuItem(id: number): Promise<void> {
  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  if (error) {
    throw new Error("Failed to delete menu item");
  }
}

export async function toggleReservable(
  id: number,
  is_reservable: boolean
): Promise<void> {
  const { error } = await supabase
    .from("menu_items")
    .update({ is_reservable })
    .eq("id", id);

  if (error) {
    throw new Error("Failed to update reservable status");
  }
}
