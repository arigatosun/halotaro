"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
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

const ListingSalonMenuView: React.FC = () => {
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

  return <AuthenticatedListingSalonMenuView session={session} user={user} />;
};

const AuthenticatedListingSalonMenuView: React.FC<{
  session: any;
  user: any;
}> = ({ session, user }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | string | null>(
    null
  );

  // Select用のstateを追加
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/sales-menu-items", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        throw new Error("店販メニューの取得に失敗しました");
      }
      const data = await response.json();
      setMenuItems(data);
    } catch (error: any) {
      console.error("店販メニュー取得エラー:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (menu: MenuItem) => {
    setEditingMenu(menu);
    setImageFile(null);
    setSelectedCategory(menu.category);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingMenu(null);
    setImageFile(null);
    setSelectedCategory("");
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);

      // categoryはSelectから取得できないので手動で追加
      formData.append("category", selectedCategory);

      if (editingMenu) {
        formData.append("id", editingMenu.id.toString());
      }

      if (imageFile) {
        formData.append("image", imageFile);
      }

      // user_id はサーバー側で認証から判別できる想定ですが、
      // もし必要ならここでappendしてください
      // formData.append("user_id", user.id);

      const response = await fetch("/api/sales-menu-items", {
        method: editingMenu ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "店販メニューの保存に失敗しました"
        );
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
    } catch (error: any) {
      console.error("操作に失敗しました:", error);
      toast({
        title: "エラー",
        description:
          error.message || "メニューの操作中にエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImageFile(event.target.files[0]);
    }
  };

  const handleDelete = async (menuItemId: number | string) => {
    if (window.confirm("このメニューを削除してもよろしいですか？")) {
      setIsDeletingId(menuItemId);

      try {
        const response = await fetch("/api/sales-menu-items", {
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
      } catch (error: any) {
        console.error("店販メニュー削除エラー:", error);
        toast({
          title: "削除エラー",
          description:
            error.message || "メニューの削除中にエラーが発生しました。",
          variant: "destructive",
        });
      } finally {
        setIsDeletingId(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center">{error.message}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">店販メニュー一覧</h1>
      <div className="flex justify-between items-center mb-4">
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          店販メニュー新規追加
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No.</TableHead>
            <TableHead>商品写真</TableHead>
            <TableHead>商品名</TableHead>
            <TableHead>カテゴリ</TableHead>
            <TableHead>価格</TableHead>
            <TableHead>編集</TableHead>
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
              <TableCell>{item.category}</TableCell>
              <TableCell>¥{item.price.toLocaleString()}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(item)}
                  disabled={isSubmitting || isDeletingId === item.id}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={isDeletingId === item.id}
                >
                  {isDeletingId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMenu ? "メニュー編集" : "新規メニュー追加"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleModalSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  商品名
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingMenu?.name}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  カテゴリ
                </Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => setSelectedCategory(value)}
                  required
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="シャンプー">シャンプー</SelectItem>
                    <SelectItem value="トリートメント">
                      トリートメント
                    </SelectItem>
                    <SelectItem value="スタイリング剤">
                      スタイリング剤
                    </SelectItem>
                    <SelectItem value="アロマ">アロマ</SelectItem>
                    <SelectItem value="その他">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="image" className="text-right">
                  商品画像
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
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
};

export default ListingSalonMenuView;
