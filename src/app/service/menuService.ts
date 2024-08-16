// src/services/menuService.ts
import * as menuActions from "@/app/actions/menuActions";
import { MenuItem } from "@/types/menuItem";

export async function getMenuItems(userId: string): Promise<MenuItem[]> {
  try {
    return await menuActions.getMenuItems(userId);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    throw new Error("メニューアイテムの取得に失敗しました");
  }
}

export async function addMenuItem(
  newItem: Omit<MenuItem, "id">,
  userId: string
): Promise<MenuItem> {
  try {
    return await menuActions.addMenuItem(newItem, userId);
  } catch (error) {
    console.error("Error adding menu item:", error);
    throw new Error("メニューアイテムの追加に失敗しました");
  }
}

export async function updateMenuItem(updatedItem: MenuItem): Promise<void> {
  try {
    await menuActions.updateMenuItem(updatedItem);
  } catch (error) {
    console.error("Error updating menu item:", error);
    throw new Error("メニューアイテムの更新に失敗しました");
  }
}

export async function deleteMenuItem(id: number): Promise<void> {
  try {
    await menuActions.deleteMenuItem(id);
  } catch (error) {
    console.error("Error deleting menu item:", error);
    throw new Error("メニューアイテムの削除に失敗しました");
  }
}

export async function toggleReservable(
  id: number,
  is_reservable: boolean
): Promise<void> {
  try {
    await menuActions.toggleReservable(id, is_reservable);
  } catch (error) {
    console.error("Error toggling reservable status:", error);
    throw new Error("予約可能状態の更新に失敗しました");
  }
}

export function calculateTotalAmount(menus: { price: number }[]): number {
  return menus.reduce((sum, menu) => sum + menu.price, 0);
}

export async function getTotalAmount(
  menuIds: string[] | undefined,
  userId: string
): Promise<number> {
  console.log(
    "getTotalAmount called with menuIds:",
    menuIds,
    "and userId:",
    userId
  );

  if (!menuIds || menuIds.length === 0) {
    console.error("No menu IDs provided");
    return 0;
  }

  const allMenus = await getMenuItems(userId);

  const selectedMenus = allMenus.filter((menu) =>
    menuIds.includes(menu.id.toString())
  );
  console.log("Selected menus:", selectedMenus);

  const total = calculateTotalAmount(selectedMenus);
  console.log("Calculated total:", total);

  return total;
}
