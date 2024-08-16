"use client";
import React, { useState } from "react";
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
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import CouponFormModal from "@/components/CouponFormModal";
import { Coupon } from "@/hooks/useCouponManagement";

// 仮のクーポンデータ
// 更新されたモックデータ
const mockCoupons: Coupon[] = [
  {
    id: "1",
    name: "春の特別クーポン",
    type: "割引",
    description: "全メニュー20%オフ",
    searchCategory: "割引",
    price: 0,
    duration: 60,
    discountType: "percentage",
    discountValue: 20,
    image: "/mock-coupon-1.jpg",
    isPublished: true,
    isValid: true,
    user_id: "mock-user-id",
    applicableMenu: "全メニュー", // 追加
  },
  {
    id: "2",
    name: "新規顧客限定",
    type: "無料サービス",
    description: "ヘッドスパ10分無料",
    searchCategory: "サービス",
    price: 0,
    duration: 10,
    discountType: "amount",
    discountValue: 0,
    image: "/mock-coupon-2.jpg",
    isPublished: false,
    isValid: true,
    user_id: "mock-user-id",
    applicableMenu: "ヘッドスパ", // 追加
  },
];

const CouponManagement: React.FC = () => {
  const [coupons] = useState<Coupon[]>(mockCoupons);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const handleEdit = (coupon: (typeof mockCoupons)[0]) => {
    setEditingCoupon(coupon);
    setIsModalOpen(true);
  };

  const handleDelete = (couponId: string) => {
    toast({
      title: "削除",
      description: `クーポンID: ${couponId} の削除がクリックされました`,
    });
  };

  const handleTogglePublish = (couponId: string, isPublished: boolean) => {
    toast({
      title: "公開状態変更",
      description: `クーポンID: ${couponId} の公開状態が ${
        isPublished ? "公開" : "非公開"
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

  const handleSubmit = (
    couponData: Omit<Coupon, "id">,
    imageFile: File | null
  ) => {
    // ここでは仮の実装としてトースト通知を表示
    toast({
      title: editingCoupon ? "更新" : "追加",
      description: `クーポンが${editingCoupon ? "更新" : "追加"}されました`,
    });
    setIsModalOpen(false);
  };

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
            <TableHead>適用先メニュー</TableHead>
            <TableHead>チェック</TableHead>
            <TableHead>詳細</TableHead>
            <TableHead>公開/非公開</TableHead>
            <TableHead>削除</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((coupon, index) => (
            <TableRow key={coupon.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                {coupon.image ? (
                  <img
                    src={coupon.image}
                    alt={coupon.name}
                    className="w-16 h-16 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-gray-500">
                    No Image
                  </div>
                )}
              </TableCell>
              <TableCell>{coupon.type}</TableCell>
              <TableCell>{coupon.name}</TableCell>
              <TableCell>{coupon.applicableMenu}</TableCell>
              <TableCell>{coupon.isValid ? "OK" : "NG"}</TableCell>
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
                  checked={coupon.isPublished}
                  onCheckedChange={(checked) =>
                    handleTogglePublish(coupon.id, checked)
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
        userId="mock-user-id" // 仮のユーザーID
      />
      <Toaster />
    </div>
  );
};

export default CouponManagement;
