"use client"
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { getReservations, Reservation } from "@/app/actions/reservationActions";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReservationCalendar from "@/components/ReservationCalendar";
import { useStaffManagement } from "@/hooks/useStaffManagement";
import { useAuth } from "@/contexts/authcontext";  // AuthコンテキストをインポートElse

const ReservationView: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();  // AuthコンテキストからUserとLoadingの状態を取得
  const { staffList, loading: staffLoading, error: staffError } = useStaffManagement(user?.id || "");

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

  if (authLoading) return <div>認証情報を読み込み中...</div>;
  if (!user) return <div>ログインしてください</div>;
  if (staffLoading) return <div>スタッフ情報を読み込み中...</div>;
  if (staffError) return <div className="text-red-500">スタッフ情報の取得に失敗しました。</div>;

  return (
    <div className="p-4">
      <div className="mb-4 flex space-x-4">
        <Input
          type="date"
          value={format(selectedDate, "yyyy-MM-dd")}
          onChange={(e) => handleDateChange(new Date(e.target.value))}
        />
        <Select value={selectedStaff} onValueChange={handleStaffChange}>
          <SelectTrigger>
            <SelectValue placeholder="スタッフを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全てのスタッフ</SelectItem>
            {staffList.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                {staff.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && <div>予約情報を読み込み中...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && (
        <ReservationCalendar
          selectedDate={selectedDate}
          selectedStaff={selectedStaff}
          reservations={reservations}
          onDateChange={handleDateChange}
          onStaffChange={handleStaffChange}
        />
      )}
    </div>
  );
};

export default ReservationView;