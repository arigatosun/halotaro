import React, { useState, useEffect } from "react";
import Image from "next/image";
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
import { Coupon } from "@/types/coupon";

interface CouponFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: Coupon | null;
  onSubmit: (
    couponData: Omit<
      Coupon,
      "id" | "created_at" | "updated_at" | "is_reservable"
    >,
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    coupon?.image_url || null
  );

  // プレースホルダー用のテキスト例
  const placeholders = {
    name: "例: 驚きの実感☆育毛促進プレミアムヘッドスパ",
    description:
      "例: 今話題の「プロセルセラピーズ」と「育毛促進ヘッドスパ」のWメニュー♪",
    price: "例: 5000",
    duration: "例: 60",
  };

  // クーポンが変わるたびにフォームの値を初期化
  useEffect(() => {
    if (coupon) {
      setName(coupon.name);
      setCategory(coupon.category || "");
      setDescription(coupon.description || "");
      setPrice(coupon.price?.toString() || "");
      setDuration(coupon.duration?.toString() || "");
      setPreviewUrl(coupon.image_url || null);
    } else {
      setName("");
      setCategory("");
      setDescription("");
      setPrice("");
      setDuration("");
      setPreviewUrl(null);
    }
    setImageFile(null);
  }, [coupon]);

  // フォーム送信
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const couponData: Omit<
      Coupon,
      "id" | "created_at" | "updated_at" | "is_reservable"
    > = {
      user_id: userId,
      coupon_id: coupon?.coupon_id || "",
      name,
      category,
      description,
      price: price ? parseInt(price) : null,
      duration: duration ? parseInt(duration) : null,
      image_url: coupon?.image_url || null, // 既存があれば残す
    };
    onSubmit(couponData, imageFile);
  };

  // 画像選択
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* 画面からはみ出た場合にスクロールできるように */}
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {coupon ? "クーポン編集" : "クーポン新規追加"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* カテゴリ */}
          <div>
            <Label htmlFor="category">カテゴリ</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全員</SelectItem>
                <SelectItem value="new">新規</SelectItem>
                <SelectItem value="repeat">再来</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-1">
              対象となる顧客カテゴリを選択してください
            </p>
          </div>

          {/* クーポン名 */}
          <div>
            <Label htmlFor="name">クーポン名</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholders.name}
              required
            />
          </div>

          {/* 説明 */}
          <div>
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={placeholders.description}
            />
          </div>

          {/* 価格 */}
          <div>
            <Label htmlFor="price">価格（円）</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={placeholders.price}
              required
            />
          </div>

          {/* 所要時間 */}
          <div>
            <Label htmlFor="duration">所要時間（分）</Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder={placeholders.duration}
              required
            />
          </div>

          {/* 画像アップロード */}
          <div>
            <Label htmlFor="image">クーポン画像</Label>
            <Input
              id="image"
              type="file"
              onChange={handleImageChange}
              accept="image/*"
            />
            {previewUrl ? (
              <div className="mt-2">
                <p className="text-sm text-gray-500 mb-2">
                  {imageFile ? "新しい画像が選択されています" : "現在の画像"}:
                </p>
                <Image
                  src={previewUrl}
                  alt="クーポン画像プレビュー"
                  width={100}
                  height={100}
                  className="rounded-md object-cover"
                />
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-1">
                クーポンを魅力的に見せる画像をアップロードしてください
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit">保存</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CouponFormModal;
