import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReservation } from "@/contexts/reservationcontext";
import { Staff, useStaffManagement } from "@/hooks/useStaffManagement";

interface StaffSelectionProps {
  onSelectStaff: (staff: Staff | null) => void;
  onBack: () => void;
  selectedMenuId: string;
  userId: string;
}

const StaffSelection: React.FC<StaffSelectionProps> = ({
  onSelectStaff,
  onBack,
  selectedMenuId,
  userId,
}) => {
  const { setSelectedStaff } = useReservation();
  const { staffList, loading, error } = useStaffManagement(userId);

  const handleStaffSelect = (staff: Staff | null) => {
    if (staff) {
      setSelectedStaff({ id: staff.id, name: staff.name });
    } else {
      setSelectedStaff(null);
    }
    onSelectStaff(staff);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

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
      {staffList
        .filter((staff) => staff.is_published)
        .map((staff) => (
          <Card key={staff.id} className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold">{staff.name}</span>
                  <p className="text-sm text-gray-500">{staff.role}</p>
                </div>
                <Button
                  onClick={() => handleStaffSelect(staff)}
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
