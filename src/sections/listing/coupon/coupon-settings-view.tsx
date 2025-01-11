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
import { Chip } from "@/components/ui/chip";

// ★ 追加: Supabaseクライアントをクライアントサイドで生成
import { createClient } from "@supabase/supabase-js";

// ★ こちらは「Anon Key」を使用。NEXT_PUBLIC_... で環境変数を設定しておく
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * カテゴリの表示設定サンプル
 * 例: 'new' => "新規" (緑), 'repeat' => "再来" (オレンジ), 'all' => "全員" (グレー), null => "未分類"
 */
const getCategoryDisplay = (
  category: string | null
): { text: string; variant: "default" | "success" | "warning" } => {
  if (category === null) return { text: "未分類", variant: "default" };
  switch (category) {
    case "new":
      return { text: "新規", variant: "success" };
    case "repeat":
      return { text: "再来", variant: "warning" };
    case "all":
      return { text: "全員", variant: "default" };
    default:
      return { text: category, variant: "default" };
  }
};

const CouponManagement: React.FC = () => {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フォームモーダルの開閉管理
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // 予約可能スイッチをクリックしたときの押下中ID (連打防止, UI制御用などに使う)
  const [updatingCouponId, setUpdatingCouponId] = useState<string | null>(null);

  // --------------------------------------------
  // クーポン一覧を Supabase から直接取得
  // --------------------------------------------
  const fetchCoupons = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      // 「coupons」テーブルから、user_id = ログインユーザー だけ取得
      const { data, error: supaError } = await supabase
        .from("coupons")
        .select("*")
        .eq("user_id", user.id);

      if (supaError) {
        throw new Error(supaError.message || "Failed to fetch coupons");
      }

      setCoupons(data || []);
    } catch (err) {
      console.error("Error fetching coupons:", err);
      setError(
        err instanceof Error ? err.message : "クーポンの取得に失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 初回＆ユーザー認証完了後にクーポン一覧を読み込み
  useEffect(() => {
    if (user) {
      fetchCoupons();
    }
  }, [user]);

  /**
   * 新規追加ボタン
   */
  const handleAddNew = () => {
    setEditingCoupon(null);
    setIsModalOpen(true);
  };

  /**
   * 編集ボタン
   */
  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsModalOpen(true);
  };

  /**
   * 削除 (Supabase の coupons テーブルを直接操作)
   */
  const handleDelete = async (couponId: string) => {
    if (!window.confirm("このクーポンを削除してもよろしいですか？")) return;
    try {
      const { error: deleteError } = await supabase
        .from("coupons")
        .delete()
        .eq("id", couponId);

      if (deleteError) {
        throw new Error(
          deleteError.message || "クーポンの削除中にエラーが発生しました"
        );
      }

      // 成功した場合、ローカルの状態を更新
      setCoupons((prev) => prev.filter((coupon) => coupon.id !== couponId));

      toast({
        title: "削除成功",
        description: `クーポンID: ${couponId} が削除されました`,
      });
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast({
        title: "削除エラー",
        description:
          error instanceof Error
            ? error.message
            : "クーポンの削除中にエラーが発生しました。",
        variant: "destructive",
      });
    }
  };

  /**
   * 予約可能トグル (Supabase 直接更新)
   */
  const handleToggleReservable = async (
    couponId: string,
    isReservable: boolean
  ) => {
    setUpdatingCouponId(couponId);

    // 楽観的UIのため、先にローカルステートを更新
    const oldCoupons = [...coupons]; // ロールバック用
    setCoupons((prevCoupons) =>
      prevCoupons.map((coupon) =>
        coupon.id === couponId
          ? { ...coupon, is_reservable: isReservable }
          : coupon
      )
    );

    try {
      const { error: updateError } = await supabase
        .from("coupons")
        .update({ is_reservable: isReservable })
        .eq("id", couponId);

      if (updateError) {
        throw new Error(updateError.message || "Failed to update coupon");
      }

      toast({
        title: "予約可能状態変更",
        description: `クーポンID: ${couponId} の予約可能状態が ${
          isReservable ? "可能" : "不可能"
        } に変更されました`,
      });
    } catch (error) {
      console.error("Error updating coupon reservable status:", error);

      // エラー時はロールバック
      setCoupons(oldCoupons);

      toast({
        title: "エラー",
        description: "予約可能状態の更新に失敗しました",
        variant: "destructive",
      });
    } finally {
      setUpdatingCouponId(null);
    }
  };

  /**
   * モーダルを閉じる
   */
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCoupon(null);
  };

  /**
   * フォーム送信（追加 or 更新）: CouponFormModal から呼ばれる
   *  - 画像ファイルがあれば Supabase Storage にアップロード → publicUrl を取得
   *  - テーブルに insert or update
   */
  const handleSubmit = async (
    couponData: Omit<
      Coupon,
      "id" | "created_at" | "updated_at" | "is_reservable"
    >,
    imageFile: File | null
  ) => {
    try {
      // 1. 画像アップロード (あれば)
      let uploadedImageUrl: string | null = editingCoupon?.image_url || null;

      if (imageFile) {
        // ファイル名を一意に
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;

        // Storage にアップロード
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("coupon-images") // バケット名: coupon-images
          .upload(fileName, imageFile);

        if (uploadError) {
          throw new Error(
            uploadError.message || "クーポン画像のアップロードに失敗しました"
          );
        }

        // アップロードしたファイルの公開URLを取得
        const { data: publicUrlData } = supabase.storage
          .from("coupon-images")
          .getPublicUrl(fileName);

        uploadedImageUrl = publicUrlData?.publicUrl || null;
      }

      // 2. 新規作成 or 更新
      if (editingCoupon) {
        // --- 更新 ---
        const { data: updateRes, error: updateError } = await supabase
          .from("coupons")
          .update({
            user_id: couponData.user_id,
            name: couponData.name,
            category: couponData.category,
            description: couponData.description,
            price: couponData.price,
            duration: couponData.duration,
            image_url: uploadedImageUrl,
            // updated_at を更新するなら
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCoupon.id)
          .select("*")
          .single();

        if (updateError || !updateRes) {
          throw new Error(
            updateError?.message || "クーポンの更新に失敗しました"
          );
        }

        // ローカルステート置き換え
        setCoupons((prev) =>
          prev.map((c) => (c.id === editingCoupon.id ? updateRes : c))
        );

        toast({
          title: "更新成功",
          description: `クーポン「${updateRes.name}」が更新されました`,
        });
      } else {
        // --- 新規追加 ---
        const { data: insertRes, error: insertError } = await supabase
          .from("coupons")
          .insert({
            user_id: couponData.user_id,
            name: couponData.name,
            category: couponData.category,
            description: couponData.description,
            price: couponData.price,
            duration: couponData.duration,
            image_url: uploadedImageUrl,
            // 初期値
            is_reservable: true,
            created_at: new Date().toISOString(),
          })
          .select("*")
          .single();

        if (insertError || !insertRes) {
          throw new Error(
            insertError?.message || "クーポンの追加に失敗しました"
          );
        }

        // 先頭に追加
        setCoupons((prev) => [insertRes, ...prev]);

        toast({
          title: "追加成功",
          description: `クーポン「${insertRes.name}」が追加されました`,
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: editingCoupon ? "更新エラー" : "追加エラー",
        description:
          err instanceof Error
            ? err.message
            : "クーポンの操作中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsModalOpen(false);
      setEditingCoupon(null);
    }
  };

  // --------------------------------------------
  // レンダリング
  // --------------------------------------------
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

      {/* クーポン作成/編集モーダル */}
      <CouponFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        coupon={editingCoupon}
        onSubmit={handleSubmit}
        userId={user?.id || ""}
      />

      <Toaster />
    </div>
  );
};

export default CouponManagement;
