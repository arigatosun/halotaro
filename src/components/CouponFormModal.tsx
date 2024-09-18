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
import { Switch } from "@/components/ui/switch";
import { Coupon } from "@/types/coupon";

interface CouponFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: Coupon | null;
  onSubmit: (
    coupon: Omit<Coupon, "id" | "created_at" | "updated_at">,
    imageFile: File | null
  ) => void;
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
  const [category, setCategory] = useState(coupon?.category || "");
  const [description, setDescription] = useState(coupon?.description || "");
  const [price, setPrice] = useState(coupon?.price?.toString() || "");
  const [duration, setDuration] = useState(coupon?.duration?.toString() || "");
  const [isReservable, setIsReservable] = useState(
    coupon?.is_reservable || false
  );
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const couponData: Omit<Coupon, "id" | "created_at" | "updated_at"> = {
      user_id: userId,
      coupon_id: coupon?.coupon_id || "",
      name,
      category,
      description,
      price: price ? parseInt(price) : null,
      duration: duration ? parseInt(duration) : null,
      is_reservable: isReservable,
      image_url: coupon?.image_url || null,
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
            <RequiredLabel htmlFor="category">カテゴリ</RequiredLabel>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discount">割引</SelectItem>
                <SelectItem value="service">サービス</SelectItem>
                {/* 必要に応じて他のカテゴリを追加 */}
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
            <Label htmlFor="isReservable">予約可能</Label>
            <Switch
              id="isReservable"
              checked={isReservable}
              onCheckedChange={setIsReservable}
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
