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

import { MenuItem } from "@/types/menuItem"; // id, name, description, price, duration, is_reservable, etc.
import { useStaffManagement } from "@/hooks/useStaffManagement"; // スタッフ一覧を取得するカスタムフック想定

import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// ---- Supabaseクライアントを直接生成 ----
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MenuSettingsPage: React.FC = () => {
  const { user, session, loading: authLoading, refreshAuthState } = useAuth();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // ログイン状態をリトライして取得
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

  // メニュー追加・編集モーダル制御
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

  // ------------------------------------
  // カテゴリ一覧を取得 (Supabase直接)
  // ------------------------------------
  const fetchCategories = async () => {
    try {
      const { data, error: catError } = await supabase
        .from("categories")
        .select("*")
        .order("id", { ascending: true });

      if (catError) throw catError;
      setCategories(data || []);
    } catch (err: any) {
      console.error("カテゴリ取得エラー:", err.message);
    }
  };

  // ------------------------------------
  // メニュー一覧を取得 (Supabase直接)
  // ログインユーザーのメニューだけを取得したい => user_id = session.user.id で絞り込む
  // categoriesテーブルをJOINしてカテゴリ名も取得
  // ------------------------------------
  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const { data, error: menuError } = await supabase
        .from("menu_items")
        // メニューはログインユーザーのものだけに限定
        .select(`*, categories(name)`)
        .eq("user_id", session.user.id) // <= ここで自分のuser_idのメニューだけ取得
        .order("id", { ascending: true });

      if (menuError) throw menuError;
      setMenuItems(data as MenuItem[]);
    } catch (err: any) {
      console.error("Error fetching menu items:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------
  // 初期データ取得
  // ------------------------------------
  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
  }, []);

  // ------------------------------------
  // カテゴリ削除処理 (Supabase直接)
  // ------------------------------------
  const handleDeleteCategory = async (categoryId: number) => {
    if (!window.confirm("このカテゴリを削除しますか？")) return;
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (error) {
        throw new Error(error.message || "カテゴリ削除に失敗しました");
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

  // 編集メニューが変わったら、そのメニューのunavailableStaffを取得
  useEffect(() => {
    const fetchUnavailableStaff = async (menuId: number) => {
      const { data, error } = await supabase
        .from("menu_item_unavailable_staff")
        .select("staff_id")
        .eq("menu_item_id", menuId);

      if (error) {
        console.error("Error fetching unavailable staff:", error);
        setUnavailableStaffIds([]);
      } else {
        setUnavailableStaffIds(data.map((item: any) => item.staff_id));
      }
    };

    if (editingMenu) {
      fetchUnavailableStaff(editingMenu.id);
    } else {
      setUnavailableStaffIds([]);
    }
  }, [editingMenu]);

  // 「新規追加」ボタン
  const handleAdd = () => {
    setEditingMenu(null);
    setImageFile(null);
    setUnavailableStaffIds([]);
    setIsModalOpen(true);
  };

  // ------------------------------------
  // メニュー削除 (Supabase直接)
  // ------------------------------------
  const handleDelete = async (menuItemId: number | string) => {
    if (!window.confirm("このメニューを削除してもよろしいですか？")) return;
    try {
      // 1. menu_item_unavailable_staff から該当メニューのレコード削除（外部キー制約で自動deleteにしてもOK）
      await supabase
        .from("menu_item_unavailable_staff")
        .delete()
        .eq("menu_item_id", menuItemId);

      // 2. menu_itemsテーブルから削除
      const { error, data } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", menuItemId)
        // 安全策: ログインユーザーのものだけ削除
        .eq("user_id", session.user.id)
        .select("*");

      if (error) {
        throw new Error(
          error.message || "メニューの削除中にエラーが発生しました。"
        );
      }

      setMenuItems((prevItems) =>
        prevItems.filter((item) => item.id !== menuItemId)
      );

      toast({
        title: "削除成功",
        description:
          data && data.length > 0
            ? `メニューID: ${data[0].id} が削除されました`
            : `メニューID: ${menuItemId} が削除されました`,
      });
    } catch (error: any) {
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

  // ------------------------------------
  // 予約可能ステータス 切り替え (Supabase直接 + 楽観的UI)
  // ------------------------------------
  const handleToggleReservable = async (
    menuItemId: number | string,
    isReservable: boolean
  ) => {
    // 1. まずはローカルステートを先行して更新 (楽観的UI)
    const oldItems = [...menuItems];
    setMenuItems((prevItems) =>
      prevItems.map((item) =>
        item.id === menuItemId ? { ...item, is_reservable: isReservable } : item
      )
    );

    try {
      // 2. Supabaseで更新
      const { data, error } = await supabase
        .from("menu_items")
        .update({ is_reservable: isReservable })
        .eq("id", menuItemId)
        // 安全策: ログインユーザーのメニューだけ
        .eq("user_id", session.user.id)
        .select(`*, categories(name)`)
        .single();

      if (error || !data) {
        throw new Error(
          error?.message || "Failed to update menu item reservable status"
        );
      }

      // 3. 返却された最新データでローカルを再上書き
      setMenuItems((prev) =>
        prev.map((item) => (item.id === data.id ? data : item))
      );

      toast({
        title: "予約可能状態変更",
        description: `メニュー名: ${data.name} の予約可能状態が ${
          isReservable ? "可能" : "不可能"
        } に変更されました`,
      });
    } catch (err: any) {
      console.error("Error updating menu item reservable status:", err);

      // 4. エラー時はロールバック
      setMenuItems(oldItems);

      toast({
        title: "エラー",
        description: "予約可能状態の更新に失敗しました",
        variant: "destructive",
      });
    }
  };

  // ------------------------------------
  // メニュー追加/編集フォーム送信
  // Supabase直接: menu_items に insert もしくは update
  // 画像アップロードがある場合は先にStorageへアップロードし、image_urlをセット
  // menu_item_unavailable_staff も更新
  // ------------------------------------
  const handleModalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const name = formData.get("name")?.toString() || "";
    const description = formData.get("description")?.toString() || "";
    const price = Number(formData.get("price"));
    const duration = Number(formData.get("duration"));
    const categoryId = Number(formData.get("category_id")) || null;

    // 画像ファイルをSupabase Storageにアップする(例)
    let uploadedImageUrl: string | null = editingMenu?.image_url || null;
    if (imageFile) {
      // 1. 一意のファイル名
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `menu-images/${fileName}`;

      // 2. Storage にアップロード
      const { error: uploadError } = await supabase.storage
        .from("menu-images") // バケット名: "menu-images"
        .upload(filePath, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) {
        console.error("画像アップロード失敗:", uploadError);
        toast({
          title: "エラー",
          description: "画像のアップロードに失敗しました。",
          variant: "destructive",
        });
        return;
      }

      // 3. 公開URLを取得
      const { data: publicUrlData } = supabase.storage
        .from("menu-images")
        .getPublicUrl(filePath);

      uploadedImageUrl = publicUrlData?.publicUrl || null;
    }

    try {
      let newOrUpdatedItem: MenuItem | null = null;

      if (editingMenu) {
        // --- Update ---
        // 安全策: user_id も条件に入れることで、他人のメニューを更新できないようにする
        const { data, error } = await supabase
          .from("menu_items")
          .update({
            name,
            description,
            price,
            duration,
            image_url: uploadedImageUrl,
            category_id: categoryId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingMenu.id)
          .eq("user_id", session.user.id)
          .select(`*, categories(name)`)
          .single();

        if (error || !data) {
          throw new Error(error?.message || "Failed to update menu item");
        }
        newOrUpdatedItem = data as MenuItem;

        // unavailableStaffIdsの更新(一旦削除→再登録)
        await supabase
          .from("menu_item_unavailable_staff")
          .delete()
          .eq("menu_item_id", editingMenu.id);

        if (unavailableStaffIds.length > 0) {
          const insertData = unavailableStaffIds.map((staffId) => ({
            menu_item_id: editingMenu.id,
            staff_id: staffId,
          }));
          await supabase.from("menu_item_unavailable_staff").insert(insertData);
        }
      } else {
        // --- Insert ---
        const { data, error } = await supabase
          .from("menu_items")
          .insert({
            user_id: session.user.id, // 必要に応じて user_id をセット
            name,
            description,
            price,
            duration,
            image_url: uploadedImageUrl,
            category_id: categoryId,
            created_at: new Date().toISOString(),
          })
          .select(`*, categories(name)`) // 新規作成後もカテゴリ名がほしい場合はJOIN
          .single();

        if (error || !data) {
          throw new Error(error?.message || "Failed to save new menu item");
        }
        newOrUpdatedItem = data as MenuItem;

        // unavailableStaffIdsの登録
        if (unavailableStaffIds.length > 0) {
          const insertData = unavailableStaffIds.map((staffId) => ({
            menu_item_id: data.id,
            staff_id: staffId,
          }));
          await supabase.from("menu_item_unavailable_staff").insert(insertData);
        }
      }

      if (!newOrUpdatedItem) {
        throw new Error("No item returned after insert/update");
      }

      // ローカルステートを更新
      setMenuItems((prevItems) =>
        editingMenu
          ? // 更新の場合
            prevItems.map((item) =>
              item.id === newOrUpdatedItem!.id ? newOrUpdatedItem! : item
            )
          : // 新規追加の場合
            [newOrUpdatedItem, ...prevItems]
      );

      setIsModalOpen(false);
      toast({
        title: editingMenu ? "メニュー更新" : "メニュー追加",
        description: `メニューが正常に${
          editingMenu ? "更新" : "追加"
        }されました。`,
      });
    } catch (error: any) {
      console.error("操作に失敗しました:", error);
      toast({
        title: "エラー",
        description:
          error?.message || "メニューの操作中にエラーが発生しました。",
        variant: "destructive",
      });
    }
  };

  // 画像ファイル選択ハンドラ
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImageFile(event.target.files[0]);
    }
  };

  // 対応不可スタッフのチェックボックス
  const handleStaffCheckboxChange = (staffId: string) => {
    setUnavailableStaffIds((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );
  };

  // カテゴリ新規作成
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({ name: newCategoryName })
        .select("*");

      if (error) throw error;
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
              {/* メニュー写真 */}
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
              {/* カテゴリ名 */}
              <TableCell>
                {(item as any)?.categories?.name ?? "未分類"}
              </TableCell>
              <TableCell>¥{item.price.toLocaleString()}</TableCell>
              <TableCell>{item.duration}分</TableCell>
              {/* 編集ボタン */}
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(item)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
              {/* 予約可能トグル */}
              <TableCell>
                <Switch
                  checked={item.is_reservable}
                  onCheckedChange={(checked) =>
                    handleToggleReservable(item.id, checked)
                  }
                />
              </TableCell>
              {/* 削除ボタン */}
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
                  defaultValue={editingMenu?.name || ""}
                  className="col-span-3"
                  required
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
                  defaultValue={editingMenu?.description || ""}
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
                  defaultValue={editingMenu?.price || 0}
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
                  defaultValue={editingMenu?.duration || 30}
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
