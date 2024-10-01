import React from "react";
import Image from "next/image";
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

  const renderStaff = (staff: Staff) => (
    <Card key={staff.id} className="mb-4">
      <CardContent className="p-4 relative min-h-[180px]">
        <div className="flex flex-col sm:flex-row sm:items-start">
          <div className="flex-grow pr-24 sm:pr-4 mb-4 sm:mb-0">
            <h3 className="text-lg font-semibold mb-1">{staff.name}</h3>
            <p className="text-sm text-gray-600 mb-1">{staff.role}</p>
            {staff.experience && (
              <p className="text-sm text-gray-600 mb-1">{staff.experience}</p>
            )}
            <p className="text-sm text-gray-700">{staff.description}</p>
          </div>
          <div className="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 sm:flex sm:flex-col sm:items-end">
            <div className="w-20 h-20 relative mb-2">
              <Image
                src={staff.image || "/default-avatar.png"}
                alt={staff.name}
                layout="fill"
                objectFit="cover"
                className="rounded-full"
              />
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 right-4">
          <Button
            onClick={() => handleStaffSelect(staff)}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs py-1 px-2 h-auto sm:text-sm sm:py-2 sm:px-4 w-20"
          >
            選択
            <ChevronRight className="ml-1 w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <h2 className="text-2xl font-bold mb-4 whitespace-nowrap">
        スタッフを選択してください
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {staffList
          .filter((staff) => staff.is_published)
          .map(renderStaff)}
      </div>
      <div className="text-center mt-8">
        <Button 
          onClick={onBack} 
          variant="outline" 
          className="text-base"
        >
          戻る
        </Button>
      </div>
    </div>
  );
}