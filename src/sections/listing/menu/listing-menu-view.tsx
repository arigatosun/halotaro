"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/authcontext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { PlusCircle, Pencil, Trash2, Loader2, ImageOff } from "lucide-react";
import { MenuItem } from "@/types/menuItem";
import { useStaffManagement } from "@/hooks/useStaffManagement";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MenuSettingsPage: React.FC = () => {
  const { user, session, loading: authLoading, refreshAuthState } = useAuth();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user && retryCount < 3) {
      refreshAuthState();
      setRetryCount((prev) => prev + 1);
    }
  }, [user, authLoading, refreshAuthState, retryCount]);

  if (authLoading) {
    return <div>認証状態を確認中...</div>;
  }

  if (!user || !session) {
    return <div>認証に失敗しました。ページをリロードしてください。</div>;
  }

  return <AuthenticatedMenuSettingsPage session={session} />;
};

// ------------------------------------
// Authenticated component
// ------------------------------------
const AuthenticatedMenuSettingsPage: React.FC<{ session: any }> = ({
  session,
}) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // カテゴリ一覧
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    []
  );
  // カテゴリ追加用
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // スタッフ関連
  const {
    staffList,
    loading: staffLoading,
    error: staffError,
  } = useStaffManagement(session.user.id);
  const [unavailableStaffIds, setUnavailableStaffIds] = useState<string[]>([]);

  // カテゴリ一覧を取得
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) {
        throw new Error("カテゴリ一覧の取得に失敗しました");
      }
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error(error);
    }
  };

  // メニュー一覧を取得
  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/get-menu-items", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch menu items");
      }
      const data = await response.json();
      console.log("Fetched menu items:", data);
      setMenuItems(data);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------
  // カテゴリ削除処理
  // ------------------------------------
  const handleDeleteCategory = async (categoryId: number) => {
    if (!window.confirm("このカテゴリを削除しますか？")) return;
    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: categoryId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "カテゴリ削除に失敗しました");
      }

      toast({
        title: "削除成功",
        description: "カテゴリを削除しました",
      });
      await fetchCategories();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "エラー",
        description: err.message || "カテゴリ削除中にエラーが発生しました",
        variant: "destructive",
      });
    }
  };

  // ------------------------------------
  // メニュー追加・編集モーダル制御
  // ------------------------------------
  const handleEdit = (menu: MenuItem) => {
    setEditingMenu(menu);
    setImageFile(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (editingMenu) {
      const fetchUnavailableStaff = async () => {
        const { data: unavailableStaffData, error: unavailableStaffError } =
          await supabase
            .from("menu_item_unavailable_staff")
            .select("staff_id")
            .eq("menu_item_id", editingMenu.id);

        if (unavailableStaffError) {
          console.error(
            "Error fetching unavailable staff:",
            unavailableStaffError
          );
          setUnavailableStaffIds([]);
        } else {
          setUnavailableStaffIds(
            unavailableStaffData.map((item) => item.staff_id)
          );
        }
      };
      fetchUnavailableStaff();
    } else {
      setUnavailableStaffIds([]);
    }
  }, [editingMenu]);

  const handleAdd = () => {
    setEditingMenu(null);
    setImageFile(null);
    setUnavailableStaffIds([]);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (editingMenu) {
      formData.append("id", editingMenu.id.toString());
    }
    if (imageFile) {
      formData.append("image", imageFile);
    }
    unavailableStaffIds.forEach((staffId) => {
      formData.append("unavailable_staff_ids[]", staffId);
    });

    const categoryId = formData.get("category_id");
    if (categoryId) {
      formData.set("category_id", categoryId.toString());
    }

    try {
      const response = await fetch(
        editingMenu ? "/api/update-menu-item" : "/api/post-menu-item",
        {
          method: editingMenu ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save menu item");
      }

      const updatedMenuItem = await response.json();

      setMenuItems((prevItems) =>
        editingMenu
          ? prevItems.map((item) =>
              item.id === updatedMenuItem.id ? updatedMenuItem : item
            )
          : [updatedMenuItem, ...prevItems]
      );

      setIsModalOpen(false);
      toast({
        title: editingMenu ? "メニュー更新" : "メニュー追加",
        description: `メニューが正常に${
          editingMenu ? "更新" : "追加"
        }されました。`,
      });
    } catch (error) {
      console.error("操作に失敗しました:", error);
      toast({
        title: "エラー",
        description: "メニューの操作中にエラーが発生しました。",
        variant: "destructive",
      });
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImageFile(event.target.files[0]);
    }
  };

  const handleDelete = async (menuItemId: number | string) => {
    if (!window.confirm("このメニューを削除してもよろしいですか？")) return;
    try {
      const response = await fetch("/api/delete-menu-item", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ menuItemId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || "メニューの削除中にエラーが発生しました。"
        );
      }

      setMenuItems((prevItems) =>
        prevItems.filter((item) => item.id !== menuItemId)
      );
      toast({
        title: "削除成功",
        description:
          data.message || `メニューID: ${menuItemId} が削除されました`,
      });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast({
        title: "削除エラー",
        description:
          error instanceof Error
            ? error.message
            : "メニューの削除中にエラーが発生しました。",
        variant: "destructive",
      });
    }
  };

  const handleToggleReservable = async (
    menuItemId: number | string,
    isReservable: boolean
  ) => {
    try {
      const response = await fetch("/api/update-menu-item-reservable", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ menuItemId, isReservable }),
      });

      if (!response.ok) {
        throw new Error("Failed to update menu item reservable status");
      }

      setMenuItems((prevItems) =>
        prevItems.map((item) =>
          item.id === menuItemId
            ? { ...item, is_reservable: isReservable }
            : item
        )
      );

      toast({
        title: "予約可能状態変更",
        description: `メニューID: ${menuItemId} の予約可能状態が ${
          isReservable ? "可能" : "不可能"
        } に変更されました`,
      });
    } catch (error) {
      console.error("Error updating menu item reservable status:", error);
      toast({
        title: "エラー",
        description: "予約可能状態の更新に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleStaffCheckboxChange = (staffId: string) => {
    setUnavailableStaffIds((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newCategoryName }),
      });
      if (!res.ok) throw new Error("カテゴリの追加に失敗しました");
      await fetchCategories();
      setIsCategoryModalOpen(false);
      setNewCategoryName("");
      toast({
        title: "カテゴリ追加",
        description: "新規カテゴリを追加しました",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "エラー",
        description: err.message ?? "カテゴリ追加エラー",
        variant: "destructive",
      });
    }
  };

  if (loading || staffLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || staffError) {
    return (
      <div className="text-red-500 text-center">
        {error?.message || staffError?.message}
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">メニュー掲載情報一覧</h1>
      <div className="flex justify-between items-center mb-4">
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          メニュー新規追加
        </Button>

        {/* カテゴリ追加ボタン */}
        <Button onClick={() => setIsCategoryModalOpen(true)}>
          カテゴリ管理
        </Button>
      </div>

      {/* メニュー一覧テーブル */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No.</TableHead>
            <TableHead>メニュー写真</TableHead>
            <TableHead>メニュー名</TableHead>
            <TableHead>カテゴリ</TableHead>
            <TableHead>価格</TableHead>
            <TableHead>所要時間</TableHead>
            <TableHead>編集</TableHead>
            <TableHead>予約可能</TableHead>
            <TableHead>削除</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {menuItems.map((item, index) => (
            <TableRow key={item.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded-md">
                    <ImageOff className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.categories?.name ?? "未分類"}</TableCell>
              <TableCell>¥{item.price.toLocaleString()}</TableCell>
              <TableCell>{item.duration}分</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(item)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell>
                <Switch
                  checked={item.is_reservable}
                  onCheckedChange={(checked) =>
                    handleToggleReservable(item.id, checked)
                  }
                />
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* メニュー作成/編集モーダル */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMenu ? "メニュー編集" : "新規メニュー追加"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleModalSubmit}>
            <div className="grid gap-4 py-4">
              {/* メニュー名 */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  メニュー名
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingMenu?.name}
                  className="col-span-3"
                />
              </div>
              {/* カテゴリ */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category_id" className="text-right">
                  カテゴリ
                </Label>
                <Select
                  name="category_id"
                  defaultValue={
                    editingMenu?.category_id
                      ? String(editingMenu.category_id)
                      : undefined
                  }
                  required
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* 説明 */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  説明
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingMenu?.description}
                  className="col-span-3"
                />
              </div>
              {/* 価格 */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  価格（税込）
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  defaultValue={editingMenu?.price}
                  className="col-span-3"
                  required
                />
              </div>
              {/* 所要時間 */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="duration" className="text-right">
                  所要時間（分）
                </Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  defaultValue={editingMenu?.duration}
                  className="col-span-3"
                  required
                />
              </div>
              {/* 画像 */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="image" className="text-right">
                  画像
                </Label>
                {editingMenu?.image_url && (
                  <div className="col-span-3">
                    <img
                      src={editingMenu.image_url}
                      alt="現在の画像"
                      className="w-32 h-32 object-cover mb-4"
                    />
                  </div>
                )}
                <Input
                  id="image"
                  name="image"
                  type="file"
                  onChange={handleImageChange}
                  className="col-span-3"
                />
              </div>
              {/* 対応不可スタッフ */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right">対応不可スタッフ</Label>
                <div className="col-span-3 grid gap-2">
                  {staffList.map((staff) => (
                    <div key={staff.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`staff-${staff.id}`}
                        checked={unavailableStaffIds.includes(staff.id)}
                        onCheckedChange={() =>
                          handleStaffCheckboxChange(staff.id)
                        }
                      />
                      <Label htmlFor={`staff-${staff.id}`}>{staff.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit">保存</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* カテゴリ管理モーダル */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カテゴリ管理</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <Label htmlFor="newCategoryName">カテゴリ名</Label>
            <Input
              id="newCategoryName"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <Button onClick={handleCreateCategory}>カテゴリ追加</Button>

            <div className="mt-4">
              <h3 className="font-semibold mb-2">登録済みカテゴリ一覧</h3>
              {categories.length === 0 ? (
                <p className="text-gray-500">
                  登録されたカテゴリはありません。
                </p>
              ) : (
                <ul className="space-y-1">
                  {categories.map((cat) => (
                    <li
                      key={cat.id}
                      className="flex items-center justify-between"
                    >
                      <span>{cat.name}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        削除
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
};

export default MenuSettingsPage;
