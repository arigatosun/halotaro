import React, { useState, useMemo } from "react";
import Image from "next/image";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReservation } from "@/contexts/reservationcontext";
import { useMenuItems } from "@/hooks/useMenuItems";
import { useCoupons } from "@/hooks/useCoupons";
import { MenuItem } from "@/types/menuItem";
import { Search, Tag, ChevronRight, ImageOff, Clock, Plus, X, ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CircularProgress } from "@mui/material";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SelectedMenuItem } from "@/lib/types";

interface MenuSelectionProps {
  onNext: () => void;
  onBack?: () => void;
  userId: string;
}

export default function MenuSelection({
  onNext,
  onBack,
  userId,
}: MenuSelectionProps) {
  const { selectedMenus, setSelectedMenus, calculateTotalAmount } = useReservation();
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

  // 合計時間を計算する関数
  const calculateTotalDuration = (menus: SelectedMenuItem[]) => {
    return menus.reduce((total, menu) => total + menu.duration, 0);
  };

  // メニュー + クーポンをまとめる
  const allItems = useMemo(() => {
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
    setSelectedMenus(prev => [...prev, {
      id: item.id.toString(),
      name: item.name,
      price: item.price,
      duration: item.duration,
    }]);
  };

  // メニューを削除するハンドラ
  const handleRemoveItem = (index: number) => {
    setSelectedMenus(prev => prev.filter((_, i) => i !== index));
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

  // 選択したメニュー一覧コンポーネント（モバイルとPC向け）
  const SelectedMenusList = () => (
    <Card className="mb-6 border-orange-200 shadow-md">
      <CardHeader className="bg-orange-50 pb-2">
        <CardTitle className="text-lg flex items-center">
          <ShoppingCart className="mr-2 h-5 w-5 text-orange-500" />
          選択したメニュー
          {selectedMenus.length > 0 && (
            <Badge className="ml-2 bg-orange-500">{selectedMenus.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {selectedMenus.length === 0 ? (
          <p className="text-gray-500 text-center py-2">メニューを選択してください</p>
        ) : (
          <div className="space-y-3">
            {selectedMenus.map((menu, index) => (
              <div key={index} className="flex justify-between items-center pb-2 border-b last:border-b-0">
                <div className="flex-1">
                  <p className="font-medium">{menu.name}</p>
                  <p className="text-sm text-gray-500">{menu.duration}分</p>
                </div>
                <div className="flex items-center">
                  <p className="font-semibold mr-3">¥{menu.price.toLocaleString()}</p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <Separator className="my-3" />
            
            <div className="space-y-1">
              <div className="flex justify-between font-bold">
                <span>合計金額</span>
                <span className="text-orange-600">¥{calculateTotalAmount(selectedMenus).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>合計時間</span>
                <span>{calculateTotalDuration(selectedMenus)}分</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-gray-50">
        <Button 
          className="w-full bg-orange-500 hover:bg-orange-600"
          disabled={selectedMenus.length === 0}
          onClick={onNext}
        >
          選択を完了して次へ進む
          <ChevronRight className="ml-1 w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
  
  // 固定メニュー選択バー（画面下部に固定表示）
  const FixedMenuSelectionBar = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // メニューが選択されていなければ表示しない
    if (selectedMenus.length === 0) return null;
    
    return (
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg z-50">
        {/* 常に表示される部分 */}
        <div className="flex items-center justify-between p-3 md:p-4">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-gray-700"
          >
            <ShoppingCart className="h-5 w-5 text-orange-500" />
            <Badge className="ml-2 bg-orange-500">{selectedMenus.length}</Badge>
            <span className="font-medium hidden md:inline ml-2">選択済みメニュー</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 ml-1" />
            ) : (
              <ChevronUp className="h-4 w-4 ml-1" />
            )}
          </button>
          
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="text-right">
              <p className="text-xs md:text-sm text-gray-500">{calculateTotalDuration(selectedMenus)}分</p>
              <p className="font-bold text-orange-600 text-sm md:text-base">¥{calculateTotalAmount(selectedMenus).toLocaleString()}</p>
            </div>
            
            <Button 
              className="bg-orange-500 hover:bg-orange-600 text-xs md:text-sm py-1 px-3 md:py-2 md:px-4 h-auto"
              onClick={onNext}
            >
              次へ進む
              <ChevronRight className="ml-1 w-3 h-3 md:w-4 md:h-4" />
            </Button>
          </div>
        </div>
        
        {/* 展開したときのみ表示される詳細 */}
        {isExpanded && (
          <div className="px-3 md:px-4 pb-3 md:pb-4 max-h-60 overflow-y-auto bg-gray-50">
            <Separator className="my-2" />
            <div className="space-y-2">
              {selectedMenus.map((menu, index) => (
                <div key={index} className="flex justify-between items-center py-1">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{menu.name}</p>
                    <p className="text-xs text-gray-500">{menu.duration}分</p>
                  </div>
                  <div className="flex items-center">
                    <p className="font-semibold mr-2 text-sm">¥{menu.price.toLocaleString()}</p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 個別のメニュー/クーポンカードを描画する関数
  const renderItem = (item: MenuItem) => (
    <Card key={item.id} className="mb-4 hover:shadow-md transition-shadow duration-200">
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
                  追加
                  <Plus className="ml-1 w-3 h-3 md:w-4 md:h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 p-2 md:p-4 pb-28">
      <h2 className="text-2xl font-bold mb-4">
        クーポン・メニューを選択してください
      </h2>

      {/* 選択済みメニュー一覧 */}
      <SelectedMenusList />

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
      
      {/* 固定メニュー選択バー */}
      <FixedMenuSelectionBar />
    </div>
  );
}
