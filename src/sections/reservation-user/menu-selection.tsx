import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useReservation } from "@/contexts/reservationcontext";
import { useMenuItems, MenuItem } from "@/hooks/useMenuItems";

interface MenuSelectionProps {
  onNext: () => void;
  userId: string;
}

const MenuSelection: React.FC<MenuSelectionProps> = ({ onNext, userId }) => {
  const { selectedMenus, setSelectedMenus } = useReservation();
  const { menuItems, loading, error } = useMenuItems(userId);

  const handleMenuSelect = (menuId: string) => {
    setSelectedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  if (menuItems.length === 0) {
    return <div>No menus available for this user.</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        クーポン・メニューを選択してください
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuItems.map((menu) => (
          <Card key={menu.id}>
            <CardHeader>
              <CardTitle>{menu.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">{menu.description}</p>
              <p className="text-lg font-bold mt-2">
                ¥{menu.price.toLocaleString()}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id={menu.id}
                  checked={selectedMenus.includes(menu.id)}
                  onCheckedChange={() => handleMenuSelect(menu.id)}
                />
                <label htmlFor={menu.id}>選択</label>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button onClick={onNext} disabled={selectedMenus.length === 0}>
        次へ
      </Button>
    </div>
  );
};

export default MenuSelection;
