"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/authcontext";
import { supabase } from "@/lib/supabaseClient";
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
import { toast, useToast } from "@/components/ui/use-toast";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";

interface MenuItem {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  is_reservable: boolean;
  user_id: string;
}

const MenuSettingsPage: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchMenuItems();
    }
  }, [user]);

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("user_id", user?.id)
      .order("id", { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "メニュー項目の取得に失敗しました",
      });
    } else {
      setMenuItems(data || []);
    }
  };

  const handleToggleReservable = async (id: number, is_reservable: boolean) => {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_reservable })
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "予約可否の更新に失敗しました",
      });
    } else {
      setMenuItems(
        menuItems.map((item) =>
          item.id === id ? { ...item, is_reservable } : item
        )
      );
      toast({
        title: "成功",
        description: "予約可否を更新しました",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("このメニューを削除してもよろしいですか？")) {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);

      if (error) {
        toast({
          variant: "destructive",
          title: "エラー",
          description: "メニューの削除に失敗しました",
        });
      } else {
        setMenuItems(menuItems.filter((item) => item.id !== id));
        toast({
          title: "成功",
          description: "メニューを削除しました",
        });
      }
    }
  };

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
    const values = Object.fromEntries(formData.entries());

    try {
      if (editingMenu) {
        const { error } = await supabase
          .from("menu_items")
          .update({ ...values, user_id: user?.id })
          .eq("id", editingMenu.id);

        if (error) throw error;

        setMenuItems(
          menuItems.map((item) =>
            item.id === editingMenu.id ? { ...item, ...values } : item
          )
        );
        toast({
          title: "成功",
          description: "メニューを更新しました",
        });
      } else {
        const { data, error } = await supabase
          .from("menu_items")
          .insert({ ...values, user_id: user?.id, is_reservable: true })
          .select();

        if (error) throw error;

        if (data) {
          setMenuItems([...menuItems, data[0]]);
          toast({
            title: "成功",
            description: "新しいメニューを追加しました",
          });
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "操作に失敗しました",
      });
    }
  };

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
                    handleToggleReservable(item.id, checked)
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
                  onClick={() => handleDelete(item.id)}
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
