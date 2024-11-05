// listing-staff-view.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";

interface Staff {
  id: string;
  user_id: string;
  name: string;
  role: string;
  experience?: string;
  description?: string;
  is_published: boolean;
  image?: string | null;
  schedule_order: number; // 新しく追加したフィールド
}

interface ErrorWithMessage {
  message: string;
}

const StaffManagement: React.FC = () => {
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

  return <AuthenticatedStaffManagement userId={user.id} />;
};

const AuthenticatedStaffManagement: React.FC<{ userId: string }> = ({
  userId,
}) => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    fetchStaffList();
  }, []);

  const fetchStaffList = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/salonstaff", {
        method: "GET",
        headers: {
          "user-id": userId,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch staff");
      }
      const data: Staff[] = await response.json();
      setStaffList(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setIsModalOpen(true);
    setCurrentImageUrl(staff.image || null);
    setPreviewImage(staff.image || null);
  };

  const handleAdd = () => {
    setEditingStaff(null);
    setCurrentImageUrl(null);
    setPreviewImage(null);
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleTogglePublish = async (id: string, is_published: boolean) => {
    try {
      const formData = new FormData();
      formData.append("id", id);
      formData.append("is_published", is_published.toString());

      const response = await fetch("/api/salonstaff", {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update publish status");
      }

      const updatedStaff: Staff = await response.json();
      setStaffList((prev) =>
        prev.map((staff) => (staff.id === updatedStaff.id ? updatedStaff : staff))
      );

      toast({
        title: "成功",
        description: "公開状態を更新しました",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "公開状態の更新に失敗しました",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("スタッフを削除しますか？この操作は取り消せません。")) {
      try {
        const response = await fetch(`/api/salonstaff?id=${id}`, {
          method: "DELETE",
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          // 外部キー制約違反のエラーコードをチェック
          if (errorData.code === '23503' && errorData.message.includes('reservations')) {
            toast({
              variant: "destructive",
              title: "削除エラー",
              description: "関連する予約が残っている為このスタッフを削除できません。",
            });
            return;
          }
          throw new Error(errorData.message || "Failed to delete staff");
        }
  
        setStaffList((prev) => prev.filter((staff) => staff.id !== id));
  
        toast({
          title: "成功",
          description: "スタッフを削除しました",
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "エラー",
          description: "スタッフの削除に失敗しました",
        });
      }
    }
  };

  const handleModalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      let response: Response;
      if (editingStaff) {
        // 編集時
        if (imageFile) {
          formData.append("image", imageFile);
        }
        response = await fetch("/api/salonstaff", {
          method: "PATCH",
          body: formData,
        });
      } else {
        // 追加時
        if (imageFile) {
          formData.append("image", imageFile);
        }
        formData.append("user_id", userId); // 追加時のみ user_id を送信
        response = await fetch("/api/salonstaff", {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save staff");
      }

      const savedStaff: Staff = await response.json();

      if (editingStaff) {
        setStaffList((prev) =>
          prev.map((staff) => (staff.id === savedStaff.id ? savedStaff : staff))
        );
        toast({
          title: "成功",
          description: "スタッフ情報を更新しました",
        });
      } else {
        setStaffList((prev) => [savedStaff, ...prev]);
        toast({
          title: "成功",
          description: "新しいスタッフを追加しました",
        });
      }

      setIsModalOpen(false);
      setImageFile(null);
      setPreviewImage(null);
      setCurrentImageUrl(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: `操作に失敗しました: ${error.message}`,
      });
      console.error("Error details:", error);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setImageFile(file);
      // プレビュー用のURLを生成
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // スタッフリストを schedule_order でソート
  const sortedStaffList = useMemo(() => {
    return [...staffList].sort((a, b) => a.schedule_order - b.schedule_order);
  }, [staffList]);

  if (loading) {
    return <div>スタッフデータを読み込み中...</div>;
  }

  if (error) {
    const errorWithMessage = error as ErrorWithMessage;
    if (errorWithMessage.message === "Unauthorized") {
      return <div>認証エラーが発生しました。再度ログインしてください。</div>;
    }
    return <div>エラーが発生しました: {errorWithMessage.message}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">スタッフ掲載情報一覧</h1>
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
                {editingStaff ? "スタッフ情報編集" : "新規スタッフ追加"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleModalSubmit}>
              <div className="grid gap-4 py-4">
                {editingStaff && (
                  <input type="hidden" name="id" value={editingStaff.id} />
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    氏名
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingStaff?.name ?? ""}
                    required
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    職種
                  </Label>
                  <Input
                    id="role"
                    name="role"
                    defaultValue={editingStaff?.role ?? ""}
                    required
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="experience" className="text-right">
                    施術歴
                  </Label>
                  <Input
                    id="experience"
                    name="experience"
                    defaultValue={editingStaff?.experience ?? ""}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    キャッチ
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editingStaff?.description ?? ""}
                    className="col-span-3"
                  />
                </div>
                {/* 新しい「スケジュール表示順」フィールド */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="schedule_order" className="text-right">
                    スケジュール表示順
                  </Label>
                  <select
                    id="schedule_order"
                    name="schedule_order"
                    defaultValue={editingStaff?.schedule_order ?? 1}
                    required
                    className="col-span-3 border rounded px-3 py-2"
                  >
                    {[...Array(20)].map((_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {index + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="image" className="text-right">
                    スタッフ写真
                  </Label>
                  <div className="col-span-3">
                    {(previewImage || currentImageUrl) && (
                      <img
                        src={
                          previewImage ||
                          currentImageUrl ||
                          "/default-avatar.png"
                        }
                        alt="スタッフ写真"
                        className="w-32 h-32 object-cover mb-2 rounded-full"
                      />
                    )}
                    <Input
                      id="image"
                      name="image"
                      type="file"
                      onChange={handleImageUpload}
                      className="col-span-3"
                    />
                  </div>
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
            <TableHead>スタッフ写真</TableHead>
            <TableHead>氏名/職種/施術歴</TableHead>
            <TableHead>キャッチ</TableHead>
            <TableHead>スケジュール表示順</TableHead> {/* 新しく追加したヘッダー */}
            <TableHead>詳細</TableHead>
            <TableHead>掲載/非掲載</TableHead>
            <TableHead>削除</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStaffList.map((staff) => (
            <TableRow key={staff.id}>
              <TableCell>
                <img
                  src={staff.image || "/default-avatar.png"}
                  alt="スタッフ"
                  className="w-12 h-12 object-cover rounded-full"
                />
              </TableCell>
              <TableCell>
                <div>{staff.name}</div>
                <div>{staff.role}</div>
                <div>{staff.experience}</div>
              </TableCell>
              <TableCell>{staff.description}</TableCell>
              <TableCell>{staff.schedule_order}</TableCell> {/* 新しく追加したセル */}
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(staff)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell>
                <Switch
                  checked={staff.is_published}
                  onCheckedChange={(checked) =>
                    handleTogglePublish(staff.id, checked)
                  }
                />
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(staff.id)}
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

export default StaffManagement;
