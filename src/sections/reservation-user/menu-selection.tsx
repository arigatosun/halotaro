import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReservation } from "@/contexts/reservationcontext";
import { useMenuItems } from "@/hooks/useMenuItems";
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
  const { menuItems, loading, error } = useMenuItems(userId);
  const [activeTab, setActiveTab] = useState("all");

  const handleMenuSelect = (menuId: string) => {
    const selectedMenu = menuItems.find((menu) => menu.id === Number(menuId));
    if (selectedMenu) {
      setSelectedMenus([
        {
          id: selectedMenu.id.toString(),
          name: selectedMenu.name,
          price: selectedMenu.price,
        },
      ]);
      onSelectMenu(selectedMenu.id.toString(), selectedMenu.name, selectedMenu.price);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const filteredMenuItems = menuItems.filter((menu) => {
    if (activeTab === "all") return true;
    // クーポンテーブルを追加した際に置き換える
    // if (activeTab === "firstVisit") return menu.isFirstVisitCoupon;
    // if (activeTab === "repeater") return menu.isRepeaterCoupon;
    // return !menu.isFirstVisitCoupon && !menu.isRepeaterCoupon;
  });

  const renderMenuItem = (menu: MenuItem) => (
    <Card key={menu.id} className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{menu.name}</h3>
            <p className="text-sm text-gray-500">{menu.description}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold mb-2">
              ¥{menu.price.toLocaleString()}
            </p>
            <Button
              onClick={() => handleMenuSelect(menu.id.toString())}
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
          {filteredMenuItems.map(renderMenuItem)}
        </TabsContent>
        <TabsContent value="firstVisit">
          {filteredMenuItems.map(renderMenuItem)}
        </TabsContent>
        <TabsContent value="repeater">
          {filteredMenuItems.map(renderMenuItem)}
        </TabsContent>
        <TabsContent value="menu">
          {filteredMenuItems.map(renderMenuItem)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MenuSelection;