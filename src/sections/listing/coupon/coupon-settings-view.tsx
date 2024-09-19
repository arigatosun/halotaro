"use client";
import React, { useState, useEffect } from "react";
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
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { PlusCircle, Pencil, Trash2, Loader2 } from "lucide-react";
import CouponFormModal from "@/components/CouponFormModal";
import { Coupon } from "@/types/coupon";
import { useAuth } from "@/contexts/authcontext";

const CouponManagement: React.FC = () => {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const response = await fetch("/api/get-coupons", {
        method: "GET",
        headers: {
          "user-id": user.id,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch coupons");
      }
      const data = await response.json();
      setCoupons(data);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch coupons"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsModalOpen(true);
  };

  const handleDelete = async (couponId: string) => {
    // 削除ロジックを実装
    toast({
      title: "削除",
      description: `クーポンID: ${couponId} の削除がクリックされました`,
    });
  };

  const handleToggleReservable = async (
    couponId: string,
    isReservable: boolean
  ) => {
    // 予約可能状態の切り替えロジックを実装
    toast({
      title: "予約可能状態変更",
      description: `クーポンID: ${couponId} の予約可能状態が ${
        isReservable ? "可能" : "不可能"
      } に変更されました`,
    });
  };

  const handleAddNew = () => {
    setEditingCoupon(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCoupon(null);
  };

  const handleSubmit = async (
    couponData: Omit<Coupon, "id" | "created_at" | "updated_at">,
    imageFile: File | null
  ) => {
    try {
      const formData = new FormData();
      Object.entries(couponData).forEach(([key, value]) => {
        if (value !== null) {
          formData.append(key, value.toString());
        }
      });
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const url = editingCoupon
        ? `/api/coupons/${editingCoupon.id}`
        : "/api/coupons";
      const method = editingCoupon ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          `クーポンの${editingCoupon ? "更新" : "追加"}に失敗しました`
        );
      }

      toast({
        title: editingCoupon ? "更新成功" : "追加成功",
        description: `クーポンが${editingCoupon ? "更新" : "追加"}されました`,
      });
      setIsModalOpen(false);
      fetchCoupons(); // クーポンリストを再取得
    } catch (err) {
      toast({
        title: `${editingCoupon ? "更新" : "追加"}エラー`,
        description:
          err instanceof Error ? err.message : "エラーが発生しました",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">クーポン掲載情報一覧</h1>
      <div className="flex justify-between items-center mb-4">
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          クーポン新規追加
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast({
              title: "並び替え",
              description: "クーポン並び替え登録がクリックされました",
            })
          }
        >
          クーポン並び替え登録
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>順番</TableHead>
            <TableHead>クーポン写真</TableHead>
            <TableHead>種別</TableHead>
            <TableHead>クーポン名</TableHead>
            <TableHead>価格</TableHead>
            <TableHead>所要時間</TableHead>
            <TableHead>詳細</TableHead>
            <TableHead>予約可能</TableHead>
            <TableHead>削除</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((coupon, index) => (
            <TableRow key={coupon.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                {coupon.image_url ? (
                  <img
                    src={coupon.image_url}
                    alt={coupon.name}
                    className="w-16 h-16 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-gray-500">
                    No Image
                  </div>
                )}
              </TableCell>
              <TableCell>{coupon.category}</TableCell>
              <TableCell>{coupon.name}</TableCell>
              <TableCell>
                {coupon.price !== null
                  ? `¥${coupon.price.toLocaleString()}`
                  : "-"}
              </TableCell>
              <TableCell>
                {coupon.duration !== null ? `${coupon.duration}分` : "-"}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(coupon)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell>
                <Switch
                  checked={coupon.is_reservable || false}
                  onCheckedChange={(checked) =>
                    handleToggleReservable(coupon.id, checked)
                  }
                />
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(coupon.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CouponFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        coupon={editingCoupon}
        onSubmit={handleSubmit}
        userId="mock-user-id"
      />
      <Toaster />
    </div>
  );
};

export default CouponManagement;
