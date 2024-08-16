import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Coupon } from "@/hooks/useCouponManagement";

interface CouponFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: Coupon | null;
  onSubmit: (coupon: Omit<Coupon, "id">, imageFile: File | null) => void;
  userId: string;
}

const CouponFormModal: React.FC<CouponFormModalProps> = ({
  isOpen,
  onClose,
  coupon,
  onSubmit,
  userId,
}) => {
  const [name, setName] = useState(coupon?.name || "");
  const [type, setType] = useState(coupon?.type || "service");
  const [description, setDescription] = useState(coupon?.description || "");
  const [searchCategory, setSearchCategory] = useState(
    coupon?.searchCategory || ""
  );
  const [price, setPrice] = useState(coupon?.price?.toString() || "");
  const [duration, setDuration] = useState(coupon?.duration?.toString() || "");
  const [discountType, setDiscountType] = useState(
    coupon?.discountType || "amount"
  );
  const [discountValue, setDiscountValue] = useState(
    coupon?.discountValue?.toString() || ""
  );
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const couponData: Omit<Coupon, "id"> = {
      name,
      type,
      description,
      searchCategory,
      price: price ? parseInt(price) : 0,
      duration: duration ? parseInt(duration) : 0,
      discountType,
      discountValue: discountValue ? parseInt(discountValue) : 0,
      image: coupon?.image || null,
      isPublished: coupon?.isPublished || false,
      isValid: true,
      user_id: userId,
      applicableMenu: coupon?.applicableMenu || "",
    };
    onSubmit(couponData, imageFile);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const RequiredLabel: React.FC<{
    htmlFor: string;
    children: React.ReactNode;
  }> = ({ htmlFor, children }) => (
    <Label htmlFor={htmlFor} className="flex items-center">
      {children}
      <span className="text-red-500 ml-1">*</span>
    </Label>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>クーポン掲載情報編集</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 mb-4">
          <span className="text-red-500">*</span> の付いた項目は必須です
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <RequiredLabel htmlFor="type">種別</RequiredLabel>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discount">割引</SelectItem>
                <SelectItem value="service">サービス</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <RequiredLabel htmlFor="name">クーポン名</RequiredLabel>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={36}
              required
            />
            <span className="text-xs text-gray-500">{name.length}/36</span>
          </div>

          <div>
            <RequiredLabel htmlFor="description">クーポン内容</RequiredLabel>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={90}
              required
            />
            <span className="text-xs text-gray-500">
              {description.length}/90
            </span>
          </div>

          <div>
            <RequiredLabel htmlFor="searchCategory">
              検索用カテゴリ
            </RequiredLabel>
            <Select value={searchCategory} onValueChange={setSearchCategory}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>{/* カテゴリオプションを追加 */}</SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <RequiredLabel htmlFor="price">価格（税込）</RequiredLabel>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <RequiredLabel htmlFor="duration">所要目安時間</RequiredLabel>
              <div className="flex items-center space-x-2">
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
                <span className="text-xs">分</span>
              </div>
            </div>
          </div>

          <div>
            <RequiredLabel htmlFor="discountType">割引方法</RequiredLabel>
            <div className="flex space-x-4 mb-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="amount"
                  checked={discountType === "amount"}
                  onChange={() => setDiscountType("amount")}
                  required
                />
                <span className="ml-2">円引き（総額）</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="percentage"
                  checked={discountType === "percentage"}
                  onChange={() => setDiscountType("percentage")}
                  required
                />
                <span className="ml-2">%オフ（総額）</span>
              </label>
            </div>
            <Input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="image">クーポン画像</Label>
            <Input
              id="image"
              type="file"
              onChange={handleImageChange}
              accept="image/*"
            />
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit">登録</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CouponFormModal;
