"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/authcontext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
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
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { useMenuItems } from "@/hooks/useMenuItems";
import { MenuItem } from "@/types/menuItem";

const MenuSettingsPage: React.FC = () => {
  const { user, loading: authLoading, refreshAuthState } = useAuth();
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

  if (!user) {
    return <div>認証に失敗しました。ページをリロードしてください。</div>;
  }

  return <AuthenticatedMenuSettingsPage userId={user.id} />;
};

const AuthenticatedMenuSettingsPage: React.FC<{ userId: string }> = ({
  userId,
}) => {
  const {
    menuItems,
    loading,
    error,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleReservable,
  } = useMenuItems(userId);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);

  const handleEdit = (menu: MenuItem) => {
    setEditingMenu(menu);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingMenu(null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries()) as unknown as Omit<
      MenuItem,
      "id" | "user_id"
    >;

    try {
      if (editingMenu) {
        await updateMenuItem({ ...editingMenu, ...values });
      } else {
        await addMenuItem({ ...values, user_id: userId });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("操作に失敗しました:", error);
      // エラーメッセージをユーザーに表示
    }
  };

  if (loading) return <div>メニューデータを読み込み中...</div>;
  if (error) {
    if (error.message === "Unauthorized") {
      return <div>認証エラーが発生しました。再度ログインしてください。</div>;
    }
    return <div>エラーが発生しました: {error.message}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">メニュー設定</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd}>
              <PlusCircle className="mr-2 h-4 w-4" />
              新規追加
            </Button>
          </DialogTrigger>
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
                    メニュー名
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingMenu?.name}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    カテゴリ
                  </Label>
                  <Select name="category" defaultValue={editingMenu?.category}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="カテゴリを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="リラクゼーション">
                        リラクゼーション
                      </SelectItem>
                      <SelectItem value="ヘッドスパ">ヘッドスパ</SelectItem>
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
                  />
                </div>
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
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit">保存</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>メニュー名</TableHead>
            <TableHead>カテゴリ</TableHead>
            <TableHead>価格</TableHead>
            <TableHead>所要時間</TableHead>
            <TableHead>予約可否</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {menuItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell>¥{item.price.toLocaleString()}</TableCell>
              <TableCell>{item.duration}分</TableCell>
              <TableCell>
                <Switch
                  checked={item.is_reservable}
                  onCheckedChange={(checked) =>
                    toggleReservable(item.id, checked)
                  }
                />
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(item)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMenuItem(item.id)}
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Toaster />
    </div>
  );
};

export default MenuSettingsPage;
