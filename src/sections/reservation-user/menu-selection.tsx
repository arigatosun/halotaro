import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReservation } from "@/contexts/reservationcontext";
import { useMenuItems } from "@/hooks/useMenuItems";
import { useCoupons } from "@/hooks/useCoupons";
import { MenuItem } from "@/types/menuItem";
import { Search, Tag, ChevronRight } from "lucide-react";

interface MenuSelectionProps {
  onSelectMenu: (menuId: string, name: string, price: number) => void;
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
    setSelectedMenus([
      {
        id: item.id.toString(),
        name: item.name,
        price: item.price,
      },
    ]);
    onSelectMenu(item.id.toString(), item.name, item.price);
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

  if (menuLoading || couponLoading) return <div className="p-2 text-center text-sm">読み込み中...</div>;
  if (menuError || couponError) return <div className="p-2 text-center text-sm text-red-500">エラー: {(menuError || couponError)?.message}</div>;

  const renderItem = (item: MenuItem) => (
    <Card key={item.id} className="mb-2">
      <CardContent className="p-3">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-base font-semibold">{item.name}</h3>
            <p className="text-base font-bold">
              ¥{item.price.toLocaleString()}
            </p>
          </div>
          <p className="text-xs text-gray-500 mb-1">{item.description}</p>
          <div className="flex justify-between items-end mt-auto">
            {item.isCoupon && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                <Tag className="w-3 h-3 mr-1" />
                クーポン
              </span>
            )}
            <Button
              onClick={() => handleItemSelect(item)}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs py-1 px-2 h-auto ml-auto md:text-sm md:py-2 md:px-4"
            >
              選択
              <ChevronRight className="ml-1 w-3 h-3 md:w-4 md:h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-3 p-2 md:p-4">
      <h2 className="text-lg font-bold md:text-xl">
        クーポン・メニューを選択してください
      </h2>
      <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="all" className="text-xs py-1 px-0 md:text-sm md:py-2">すべて</TabsTrigger>
          <TabsTrigger value="firstVisit" className="text-xs py-1 px-0 md:text-sm md:py-2">初来店</TabsTrigger>
          <TabsTrigger value="repeater" className="text-xs py-1 px-0 md:text-sm md:py-2">2回目以降</TabsTrigger>
          <TabsTrigger value="menu" className="text-xs py-1 px-0 md:text-sm md:py-2">メニュー</TabsTrigger>
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