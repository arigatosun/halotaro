import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReservation } from "@/contexts/reservationcontext";
import { useMenuItems } from "@/hooks/useMenuItems";
import { useCoupons } from "@/hooks/useCoupons";
import { MenuItem } from "@/types/menuItem";

interface MenuSelectionProps {
  onSelectMenu: (menuId: string, name: string, price: number) => void;
  userId: string;
}

const MenuSelection: React.FC<MenuSelectionProps> = ({
  onSelectMenu,
  userId,
}) => {
  const { setSelectedMenus } = useReservation();
  const { menuItems, loading: menuLoading, error: menuError } = useMenuItems(userId);
  const { coupons, loading: couponLoading, error: couponError } = useCoupons(userId);
  const [activeTab, setActiveTab] = useState("all");

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
    switch (activeTab) {
      case "all":
        return allItems;
      case "firstVisit":
        return coupons.filter(coupon => coupon.category === "new");
      case "repeater":
        return coupons.filter(coupon => coupon.category === "repeat");
      case "menu":
        return menuItems;
      default:
        return allItems;
    }
  }, [activeTab, allItems, coupons, menuItems]);

  if (menuLoading || couponLoading) return <div>Loading...</div>;
  if (menuError || couponError) return <div>Error: {(menuError || couponError)?.message}</div>;

  const renderItem = (item: MenuItem) => (
    <Card key={item.id} className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{item.name}</h3>
            <p className="text-sm text-gray-500">{item.description}</p>
            {item.isCoupon && (
              <p className="text-xs text-blue-500">クーポン</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold mb-2">
              ¥{item.price.toLocaleString()}
            </p>
            <Button
              onClick={() => handleItemSelect(item)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              選択する
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        クーポン・メニューを選択してください
      </h2>
      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="firstVisit">初来店時クーポン</TabsTrigger>
          <TabsTrigger value="repeater">2回目以降クーポン</TabsTrigger>
          <TabsTrigger value="menu">メニュー</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          {filteredItems.map(renderItem)}
        </TabsContent>
        <TabsContent value="firstVisit">
          {filteredItems.map(renderItem)}
        </TabsContent>
        <TabsContent value="repeater">
          {filteredItems.map(renderItem)}
        </TabsContent>
        <TabsContent value="menu">
          {filteredItems.map(renderItem)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MenuSelection;