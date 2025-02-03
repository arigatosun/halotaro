import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReservation } from "@/contexts/reservationcontext";
import { useMenuItems } from "@/hooks/useMenuItems";
import { useCoupons } from "@/hooks/useCoupons";
import { MenuItem } from "@/types/menuItem";
import { Search, Tag, ChevronRight, ImageOff, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CircularProgress } from "@mui/material";

interface MenuSelectionProps {
  onSelectMenu: (
    menuId: string,
    name: string,
    price: number,
    duration: number
  ) => void;
  userId: string;
}

export default function MenuSelection({
  onSelectMenu,
  userId,
}: MenuSelectionProps) {
  const { setSelectedMenus } = useReservation();
  const {
    menuItems,
    loading: menuLoading,
    error: menuError,
  } = useMenuItems(userId);
  const {
    coupons,
    loading: couponLoading,
    error: couponError,
  } = useCoupons(userId);

  // タブの状態 ("all" | "coupon" | "menu")
  const [activeTab, setActiveTab] = useState("all");

  // 検索ワード
  const [searchTerm, setSearchTerm] = useState("");

  // メニュー + クーポンをまとめる
  const allItems = useMemo(() => {
    // もしクーポン側のアイテムに "isCoupon = true" などを付与しておきたい場合は、フック内などで付与するか、
    // ここで map して付与することもできます
    // 例: coupons.map(item => ({ ...item, isCoupon: true }))
    // ただし useCoupons の実装によって変わります
    const mappedCoupons = coupons.map((c) => ({
      ...c,
      isCoupon: true, // クーポンを判別するために付与
    }));
    // メニュー側は isCoupon を false としておく
    const mappedMenus = menuItems.map((m) => ({
      ...m,
      isCoupon: false, // メニューを判別
    }));
    return [...mappedMenus, ...mappedCoupons];
  }, [menuItems, coupons]);

  // メニュー or クーポンを選択したときのハンドラ
  const handleItemSelect = (item: MenuItem) => {
    console.log("Selected item:", item);
    setSelectedMenus([
      {
        id: item.id.toString(),
        name: item.name,
        price: item.price,
        duration: item.duration,
      },
    ]);
    onSelectMenu(item.id.toString(), item.name, item.price, item.duration);
  };

  // タブや検索ワードに応じて表示するリストをフィルタリング
  const filteredItems = useMemo(() => {
    let items = allItems;

    // タブ切り替えによる絞り込み
    switch (activeTab) {
      case "coupon":
        items = items.filter((it) => it.isCoupon === true);
        break;
      case "menu":
        items = items.filter((it) => it.isCoupon === false);
        break;
      // default の "all" はそのまま全件
    }

    // 予約不可能(is_reservable === false)は除外
    items = items.filter((it) => it.is_reservable === true);

    // 検索ワードによる絞り込み
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeTab, allItems, searchTerm]);

  // ローディング表示
  if (menuLoading || couponLoading) {
    return (
      <div className="w-full max-w-md mx-auto mt-8 space-y-4">
        <div className="flex flex-col items-center justify-center space-y-4">
          <CircularProgress size={60} style={{ color: "#F9802D" }} />
          <p className="text-lg font-semibold text-[#F9802D]">
            メニューを読み込み中...
          </p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (menuError || couponError) {
    return (
      <div className="p-2 text-center text-sm text-red-500">
        エラー: {(menuError || couponError)?.message}
      </div>
    );
  }

  // 個別のメニュー/クーポンカードを描画する関数
  const renderItem = (item: MenuItem) => (
    <Card key={item.id} className="mb-4">
      <CardContent className="p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* 画像部分 */}
          <div className="relative w-full md:w-1/3 h-48 md:h-auto bg-gray-100">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                layout="fill"
                objectFit="cover"
                loading="lazy"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <ImageOff className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
          {/* テキスト部分 */}
          <div className="flex flex-col justify-between p-4 md:w-2/3">
            <div>
              <h3 className="text-lg font-semibold mb-2">{item.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <Clock className="w-4 h-4 mr-1" />
                <span>想定所要時間: {item.duration}分</span>
              </div>
            </div>
            {/* 価格・選択ボタン */}
            <div className="flex justify-between items-center mt-2">
              <p className="text-lg font-bold">
                ¥{item.price.toLocaleString()}
              </p>
              <div className="flex items-center">
                {/* クーポンならタグ表示 */}
                {item.isCoupon && (
                  <span className="inline-flex items-center px-2 py-1 mr-2 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                    <Tag className="w-3 h-3 mr-1" />
                    クーポン
                  </span>
                )}
                <Button
                  onClick={() => handleItemSelect(item)}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs py-1 px-2 h-auto md:text-sm md:py-2 md:px-4"
                >
                  選択
                  <ChevronRight className="ml-1 w-3 h-3 md:w-4 md:h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 p-2 md:p-4">
      <h2 className="text-2xl font-bold mb-4">
        クーポン・メニューを選択してください
      </h2>

      {/* 検索入力 */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="メニューを検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* タブ表示 */}
      <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-4">
          <TabsTrigger value="all" className="text-xs py-2 px-1 md:text-sm">
            すべて
          </TabsTrigger>
          <TabsTrigger value="coupon" className="text-xs py-2 px-1 md:text-sm">
            クーポン
          </TabsTrigger>
          <TabsTrigger value="menu" className="text-xs py-2 px-1 md:text-sm">
            メニュー
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-2 md:mt-4">
          {filteredItems.map(renderItem)}
        </TabsContent>
        <TabsContent value="coupon" className="mt-2 md:mt-4">
          {filteredItems.map(renderItem)}
        </TabsContent>
        <TabsContent value="menu" className="mt-2 md:mt-4">
          {filteredItems.map(renderItem)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
