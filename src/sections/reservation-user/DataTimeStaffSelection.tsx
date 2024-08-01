import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/datepicker";
import { useReservation } from "@/contexts/reservationcontext";

interface Staff {
  id: string;
  name: string;
}

interface DateTimeStaffSelectionProps {
  onNext: () => void;
  onBack: () => void;
}

const DateTimeStaffSelection: React.FC<DateTimeStaffSelectionProps> = ({
  onNext,
  onBack,
}) => {
  const {
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    selectedStaff,
    setSelectedStaff,
  } = useReservation();

  const staffList: Staff[] = [
    { id: "1", name: "佐藤" },
    { id: "2", name: "田中" },
    // 他のスタッフも追加
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">日時とスタッフを選択してください</h2>
      <div className="space-y-4">
        <DatePicker selected={selectedDate} onSelect={setSelectedDate} />
        <Select value={selectedTime} onValueChange={setSelectedTime}>
          <SelectTrigger>
            <SelectValue placeholder="時間を選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10:00">10:00</SelectItem>
            <SelectItem value="11:00">11:00</SelectItem>
            {/* 他の時間枠も追加 */}
          </SelectContent>
        </Select>
        <Select value={selectedStaff} onValueChange={setSelectedStaff}>
          <SelectTrigger>
            <SelectValue placeholder="スタッフを選択" />
          </SelectTrigger>
          <SelectContent>
            {staffList.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                {staff.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-x-4">
        <Button onClick={onBack} variant="outline">
          戻る
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedDate || !selectedTime || !selectedStaff}
        >
          次へ
        </Button>
      </div>
    </div>
  );
};

export default DateTimeStaffSelection;
