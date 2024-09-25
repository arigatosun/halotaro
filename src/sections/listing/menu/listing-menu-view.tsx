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
import { toast } from "@/components/ui/use-toast";
import { PlusCircle, Pencil, Trash2, Loader2, ImageOff } from "lucide-react";
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
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/get-menu-items", {
        method: "GET",
        headers: {
          "user-id": userId,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch menu items");
      }
      const data = await response.json();
      setMenuItems(data);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (menu: MenuItem) => {
    setEditingMenu(menu);
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingMenu(null);
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append("user_id", userId);
    
    if (editingMenu) {
      formData.append("id", editingMenu.id.toString());
    }

    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      const response = await fetch(editingMenu ? "/api/update-menu-item" : "/api/post-menu-item", {
        method: editingMenu ? "PATCH" : "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to save menu item");
      }

      const updatedMenuItem = await response.json();

      setMenuItems(prevItems => 
        editingMenu
          ? prevItems.map(item => item.id === updatedMenuItem.id ? updatedMenuItem : item)
          : [updatedMenuItem, ...prevItems] // Add new item to the top of the list
      );

      setIsModalOpen(false);
      toast({
        title: editingMenu ? "メニュー更新" : "メニュー追加",
        description: `メニューが正常に${editingMenu ? "更新" : "追加"}されました。`,
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
    if (window.confirm("このメニューを削除してもよろしいですか？")) {
      try {
        const response = await fetch("/api/delete-menu-item", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ menuItemId }),
        });
  
        const data = await response.json();
  
        if (!response.ok) {
          throw new Error(data.message || "メニューの削除中にエラーが発生しました。");
        }
  
        setMenuItems(prevItems => prevItems.filter(item => item.id !== menuItemId));
  
        toast({
          title: "削除成功",
          description: data.message || `メニューID: ${menuItemId} が削除されました`,
        });
      } catch (error) {
        console.error("Error deleting menu item:", error);
        toast({
          title: "削除エラー",
          description: error instanceof Error ? error.message : "メニューの削除中にエラーが発生しました。",
          variant: "destructive",
        });
      }
    }
  };

  const handleToggleReservable = async (menuItemId: number | string, isReservable: boolean) => {
  try {
    const response = await fetch("/api/update-menu-item-reservable", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ menuItemId, isReservable }),
    });

    if (!response.ok) {
      throw new Error("Failed to update menu item reservable status");
    }

    const updatedMenuItem = await response.json();

    setMenuItems(prevItems =>
      prevItems.map(item => item.id === updatedMenuItem.id ? updatedMenuItem : item)
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
    <h1 className="text-2xl font-bold mb-4">メニュー掲載情報一覧</h1>
    <div className="flex justify-between items-center mb-4">
      <Button onClick={handleAdd}>
        <PlusCircle className="mr-2 h-4 w-4" />
        メニュー新規追加
      </Button>
    </div>
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
            <TableCell>{item.category}</TableCell>
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
            <div className="grid grid-cols-4 items-center gap-4">
  <Label htmlFor="image" className="text-right">
    現在の画像
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
            <Button type="submit">保存</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    <Toaster />
  </div>
);
};

export default MenuSettingsPage;