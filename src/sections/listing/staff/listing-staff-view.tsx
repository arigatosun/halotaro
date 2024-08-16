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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { PlusCircle, Pencil, Trash2, Upload } from "lucide-react";
import { Staff, useStaffManagement } from "@/hooks/useStaffManagement";

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
  const {
    staffList,
    setStaffList,
    loading,
    error,
    addStaff,
    updateStaff,
    deleteStaff,
    toggleStaffPublish,
    refreshStaff,
  } = useStaffManagement(userId);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
      await toggleStaffPublish(id, is_published);
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

  const handleDelete = (id: string) => {
    if (confirm("スタッフを削除しますか？この操作は取り消せません。")) {
      deleteStaff(id)
        .then(() => {
          toast({
            title: "成功",
            description: "スタッフを削除しました",
          });
        })
        .catch(() => {
          toast({
            variant: "destructive",
            title: "エラー",
            description: "スタッフの削除に失敗しました",
          });
        });
    }
  };

  const handleModalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries()) as unknown as Omit<
      Staff,
      "id"
    >;

    try {
      if (editingStaff) {
        const updatedStaff = await updateStaff(
          { ...editingStaff, ...values, image: currentImageUrl },
          imageFile
        );
        setStaffList(
          staffList.map((staff) =>
            staff.id === updatedStaff.id ? updatedStaff : staff
          )
        );
        toast({
          title: "成功",
          description: "スタッフ情報を更新しました",
        });
      } else {
        const newStaff = await addStaff(
          { ...values, user_id: userId },
          imageFile
        );
        setStaffList([...staffList, newStaff]);
        toast({
          title: "成功",
          description: "新しいスタッフを追加しました",
        });
      }
      setIsModalOpen(false);
      setImageFile(null);
      setPreviewImage(null);
      setCurrentImageUrl(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "操作に失敗しました",
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
  if (loading) return <div>スタッフデータを読み込み中...</div>;
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    氏名
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingStaff?.name ?? undefined}
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
                    defaultValue={editingStaff?.role ?? undefined}
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
                    defaultValue={editingStaff?.experience ?? undefined}
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
                    defaultValue={editingStaff?.description ?? undefined}
                    className="col-span-3"
                  />
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
            <TableHead>詳細</TableHead>
            <TableHead>掲載/非掲載</TableHead>
            <TableHead>削除</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffList.map((staff) => (
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
