import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReservation } from "@/contexts/reservationcontext";

interface StaffSelectionProps {
  onSelectStaff: (staffId: string | null) => void;
  onBack: () => void;
  selectedMenuId: string;
}

const StaffSelection: React.FC<StaffSelectionProps> = ({
  onSelectStaff,
  onBack,
  selectedMenuId,
}) => {
  const { setSelectedStaff } = useReservation();

  // TODO: スタッフデータをAPIから取得するロジックを実装
  const staffList = [
    { id: "1", name: "斉藤憲司" },
    { id: "2", name: "徳 美加" },
    { id: "3", name: "鳥山 洋花" },
  ];

  const handleStaffSelect = (staffId: string | null) => {
    setSelectedStaff(staffId);
    onSelectStaff(staffId);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">スタッフの選択</h2>
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span>指定しない</span>
            <Button
              onClick={() => handleStaffSelect(null)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              選択する
            </Button>
          </div>
        </CardContent>
      </Card>
      {staffList.map((staff) => (
        <Card key={staff.id} className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span>{staff.name}</span>
              <Button
                onClick={() => handleStaffSelect(staff.id)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                選択する
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button onClick={onBack} variant="outline">
        戻る
      </Button>
    </div>
  );
};

export default StaffSelection;
