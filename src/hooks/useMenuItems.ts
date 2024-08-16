// src/hooks/useMenuItems.ts
import { useState, useEffect, useCallback } from "react";
import * as menuService from "@/app/service/menuService";
import { MenuItem } from "@/types/menuItem";
import { toast } from "@/components/ui/use-toast";

export function useMenuItems(userId: string) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMenuItems = useCallback(async () => {
    try {
      setLoading(true);
      const items = await menuService.getMenuItems(userId);
      setMenuItems(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An error occurred"));
      toast({
        variant: "destructive",
        title: "エラー",
        description: "メニューアイテムの取得に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  const addMenuItem = async (newItem: Omit<MenuItem, "id">) => {
    try {
      const addedItem = await menuService.addMenuItem(newItem, userId);
      setMenuItems([...menuItems, addedItem]);
      toast({
        title: "成功",
        description: "新しいメニューを追加しました",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "新しいメニューの追加に失敗しました",
      });
    }
  };

  const updateMenuItem = async (updatedItem: MenuItem) => {
    try {
      await menuService.updateMenuItem(updatedItem);
      setMenuItems(
        menuItems.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );
      toast({
        title: "成功",
        description: "メニューを更新しました",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "メニューの更新に失敗しました",
      });
    }
  };

  const deleteMenuItem = async (id: number) => {
    try {
      await menuService.deleteMenuItem(id);
      setMenuItems(menuItems.filter((item) => item.id !== Number(id)));
      toast({
        title: "成功",
        description: "メニューを削除しました",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "メニューの削除に失敗しました",
      });
    }
  };

  const toggleReservable = async (id: number, is_reservable: boolean) => {
    try {
      await menuService.toggleReservable(id, is_reservable);
      setMenuItems(
        menuItems.map((item) =>
          item.id === Number(id) ? { ...item, is_reservable } : item
        )
      );
      toast({
        title: "成功",
        description: "予約可否を更新しました",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "予約可否の更新に失敗しました",
      });
    }
  };

  return {
    menuItems,
    loading,
    error,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleReservable,
    refreshMenuItems: fetchMenuItems,
  };
}
