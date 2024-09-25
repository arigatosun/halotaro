'use client'

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
import { Chip } from "@/components/ui/chip";

const getCategoryDisplay = (category: string | null): { text: string; variant: "default" | "success" | "warning" } => {
  if (category === null) return { text: '未分類', variant: "default" };
  switch (category) {
    case 'new':
      return { text: '新規', variant: "success" };
    case 'repeat':
      return { text: '再来', variant: "warning" };
    case 'all':
      return { text: '全員', variant: "default" };
    default:
      return { text: category, variant: "default" };
  }
};

const CouponManagement: React.FC = () => {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [updatingCouponId, setUpdatingCouponId] = useState<string | null>(null);

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
    if (window.confirm("このクーポンを削除してもよろしいですか？")) {
      try {
        const response = await fetch("/api/delete-coupon", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ couponId }),
        });
  
        const data = await response.json();
  
        if (!response.ok) {
          throw new Error(data.message || "クーポンの削除中にエラーが発生しました。");
        }
  
        // 成功した場合、ローカルの状態を更新
        setCoupons(coupons.filter((coupon) => coupon.id !== couponId));
  
        toast({
          title: "削除成功",
          description: data.message || `クーポンID: ${couponId} が削除されました`,
        });
      } catch (error) {
        console.error("Error deleting coupon:", error);
        toast({
          title: "削除エラー",
          description: error instanceof Error ? error.message : "クーポンの削除中にエラーが発生しました。",
          variant: "destructive",
        });
      }
    }
  };
  
  const handleToggleReservable = async (
    couponId: string,
    isReservable: boolean
  ) => {
    setUpdatingCouponId(couponId);
    setCoupons((prevCoupons) =>
      prevCoupons.map((coupon) =>
        coupon.id === couponId ? { ...coupon, is_reservable: isReservable } : coupon
      )
    );

    try {
      const response = await fetch("/api/update-coupon-reservable", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ couponId, isReservable }),
      });

      if (!response.ok) {
        throw new Error("Failed to update coupon reservable status");
      }

      toast({
        title: "予約可能状態変更",
        description: `クーポンID: ${couponId} の予約可能状態が ${
          isReservable ? "可能" : "不可能"
        } に変更されました`,
      });
    } catch (error) {
      console.error("Error updating coupon reservable status:", error);
      
      setCoupons((prevCoupons) =>
        prevCoupons.map((coupon) =>
          coupon.id === couponId ? { ...coupon, is_reservable: !isReservable } : coupon
        )
      );

      toast({
        title: "エラー",
        description: "予約可能状態の更新に失敗しました",
        variant: "destructive",
      });
    } finally {
      setUpdatingCouponId(null);
    }
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
    couponData: Omit<Coupon, "id" | "created_at" | "updated_at" | "is_reservable">,
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
        ? `/api/update-coupon-reservable`
        : "/api/post-coupons";
      const method = editingCoupon ? "PATCH" : "POST";
  
      if (editingCoupon) {
        formData.append("id", editingCoupon.id);
      }
  
      const response = await fetch(url, {
        method,
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error(editingCoupon ? "クーポンの更新に失敗しました" : "クーポンの追加に失敗しました");
      }
  
      const updatedCoupon = await response.json();
  
      toast({
        title: editingCoupon ? "更新成功" : "追加成功",
        description: `クーポンが${editingCoupon ? "更新" : "追加"}されました`,
      });
      setIsModalOpen(false);
      
      if (editingCoupon) {
        setCoupons(coupons.map(c => c.id === updatedCoupon.id ? updatedCoupon : c));
      } else {
        setCoupons([...coupons, updatedCoupon]);
      }
    } catch (err) {
      toast({
        title: editingCoupon ? "更新エラー" : "追加エラー",
        description: err instanceof Error ? err.message : "エラーが発生しました",
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
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No.</TableHead>
            <TableHead>クーポン写真</TableHead>
            <TableHead>種別</TableHead>
            <TableHead>クーポン名</TableHead>
            <TableHead>価格</TableHead>
            <TableHead>所要時間</TableHead>
            <TableHead>編集</TableHead>
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
              <TableCell>
                {(() => {
                  const { text, variant } = getCategoryDisplay(coupon.category);
                  return <Chip variant={variant}>{text}</Chip>;
                })()}
              </TableCell>
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
                  disabled={updatingCouponId === coupon.id}
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
        userId={user?.id || ''}
      />
      <Toaster />
    </div>
  );
};

export default CouponManagement;