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
  onSelectMenu: (menuId: string, name: string, price: number, duration: number) => void;
  userId: string;
}

export default function MenuSelection({ onSelectMenu, userId }: MenuSelectionProps) {
  const { setSelectedMenus } = useReservation();
  const { menuItems, loading: menuLoading, error: menuError } = useMenuItems(userId);
  const { coupons, loading: couponLoading, error: couponError } = useCoupons(userId);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const allItems = useMemo(() => [...menuItems, ...coupons], [menuItems, coupons]);

  const handleItemSelect = (item: MenuItem) => {
    console.log('Selected item:', item);
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

  const filteredItems = useMemo(() => {
    let items = allItems;
    switch (activeTab) {
      case "firstVisit":
        items = coupons.filter(coupon => coupon.category === "new");
        break;
      case "repeater":
        items = coupons.filter(coupon => coupon.category === "repeat");
        break;
      case "menu":
        items = menuItems;
        break;
    }
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeTab, allItems, coupons, menuItems, searchTerm]);

  if (menuLoading || couponLoading) {
    return (
      <div className="w-full max-w-md mx-auto mt-8 space-y-4">
        <div className="flex flex-col items-center justify-center space-y-4">
          <CircularProgress size={60} style={{ color: "#F9802D" }} />
          <p className="text-lg font-semibold text-[#F9802D]">メニューを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (menuError || couponError) return <div className="p-2 text-center text-sm text-red-500">エラー: {(menuError || couponError)?.message}</div>;

  const renderItem = (item: MenuItem) => (
    <Card key={item.id} className="mb-4">
      <CardContent className="p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row">
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
          <div className="flex flex-col justify-between p-4 md:w-2/3">
            <div>
              <h3 className="text-lg font-semibold mb-2">{item.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <Clock className="w-4 h-4 mr-1" />
                <span>想定所要時間: {item.duration}分</span>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-lg font-bold">
                ¥{item.price.toLocaleString()}
              </p>
              <div className="flex items-center">
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
      <div className="mb-4">
        <Input
          type="text"
          placeholder="メニューを検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full mb-4">
          <TabsTrigger value="all" className="text-xs py-2 px-1 md:text-sm">すべて</TabsTrigger>
          <TabsTrigger value="firstVisit" className="text-xs py-2 px-1 md:text-sm">初来店</TabsTrigger>
          <TabsTrigger value="repeater" className="text-xs py-2 px-1 md:text-sm">2回目以降</TabsTrigger>
          <TabsTrigger value="menu" className="text-xs py-2 px-1 md:text-sm">メニュー</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-2 md:mt-4">
          {filteredItems.map(renderItem)}
        </TabsContent>
        <TabsContent value="firstVisit" className="mt-2 md:mt-4">
          {filteredItems.map(renderItem)}
        </TabsContent>
        <TabsContent value="repeater" className="mt-2 md:mt-4">
          {filteredItems.map(renderItem)}
        </TabsContent>
        <TabsContent value="menu" className="mt-2 md:mt-4">
          {filteredItems.map(renderItem)}
        </TabsContent>
      </Tabs>
    </div>
  );
}