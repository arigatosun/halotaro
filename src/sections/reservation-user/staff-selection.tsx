import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReservation } from "@/contexts/reservationcontext";
import { Staff, useStaffManagement } from "@/hooks/useStaffManagement";
import { ChevronRight } from "lucide-react";

interface StaffSelectionProps {
  onSelectStaff: (staff: Staff | null) => void;
  onBack: () => void;
  selectedMenuId: string;
  userId: string;
}

export default function StaffSelection({
  onSelectStaff,
  onBack,
  selectedMenuId,
  userId,
}: StaffSelectionProps) {
  const { setSelectedStaff } = useReservation();
  const { staffList, loading, error } = useStaffManagement(userId);

  const fetchReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, count } = await getReservations(
        format(selectedDate, "yyyy-MM-dd"),
        selectedStaff
      );
      setReservations(data);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      setError("予約の取得中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchReservations();
    }
  }, [selectedDate, selectedStaff, user, authLoading]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleStaffChange = (value: string) => {
    setSelectedStaff(value);
  };

  if (loading) return <div className="p-2 text-center text-sm">読み込み中...</div>;
  if (error) return <div className="p-2 text-center text-sm text-red-500">エラー: {error.message}</div>;

  return (
    <div className="space-y-3 p-2 md:p-4">
      <h2 className="text-lg font-bold md:text-xl">スタッフを選択してください</h2>
      {staffList
        .filter((staff) => staff.is_published)
        .map((staff) => (
          <Card key={staff.id} className="mb-2">
            <CardContent className="p-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-semibold">{staff.name}</h3>
                  <p className="text-xs text-gray-500">{staff.role}</p>
                </div>
                <Button
                  onClick={() => handleStaffSelect(staff)}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs py-1 px-2 h-auto ml-auto md:text-sm md:py-2 md:px-4"
                >
                  選択
                  <ChevronRight className="ml-1 w-3 h-3 md:w-4 md:h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      <Button 
        onClick={onBack} 
        variant="outline" 
        className="text-sm md:text-base"
      >
        戻る
      </Button>
    </div>
  );
}