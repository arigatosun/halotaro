import React, { useState } from 'react';
import { format, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarReservation } from "@/types/reservation";
import DayView from './DayView';
import WeekView from './WeekView';
import ReservationModal from './ReservationModal';

interface ReservationCalendarProps {
  calendarReservations: CalendarReservation[];
  onReservationCreate: (reservation: CalendarReservation) => void;
  onReservationUpdate: (reservation: CalendarReservation) => void;
  onReservationDelete: (id: string) => void;
  staffList: string[];
}

export default function ReservationCalendar({
  calendarReservations,
  onReservationCreate,
  onReservationUpdate,
  onReservationDelete,
  staffList
}: ReservationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<CalendarReservation | null>(null);

  const handleDateChange = (amount: number) => {
    setCurrentDate(prevDate => {
      if (view === 'week') {
        return amount > 0 ? addDays(prevDate, 7) : subDays(prevDate, 7);
      }
      return amount > 0 ? addDays(prevDate, amount) : subDays(prevDate, Math.abs(amount));
    });
  };

  const handleReservationClick = (reservation: CalendarReservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };

  const handleModalSave = (reservation: CalendarReservation) => {
    if (reservation.id) {
      onReservationUpdate(reservation);
    } else {
      onReservationCreate(reservation);
    }
    setIsModalOpen(false);
  };

  const handleModalDelete = () => {
    if (selectedReservation) {
      onReservationDelete(selectedReservation.id);
      setIsModalOpen(false);
    }
  };

  const renderView = () => {
    switch (view) {
      case 'day':
        return <DayView 
          currentDate={currentDate}
          calendarReservations={calendarReservations}
          onReservationClick={handleReservationClick}
          staffList={staffList}
        />;
      case 'week':
        return <WeekView 
          currentDate={currentDate}
          calendarReservations={calendarReservations}
          onReservationClick={handleReservationClick}
          staffList={staffList}
        />;
      case 'month':
        return <div>月表示はまだ実装されていません。</div>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-7xl mx-auto">
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold mb-4">予約管理</h1>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="icon" onClick={() => handleDateChange(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold">
              {view === 'week'
                ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy年M月d日', { locale: ja })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'M月d日', { locale: ja })}`
                : format(currentDate, 'yyyy年M月d日', { locale: ja })}
            </h2>
            <Button variant="outline" size="icon" onClick={() => handleDateChange(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant={view === 'day' ? 'default' : 'outline'} onClick={() => setView('day')}>日</Button>
            <Button variant={view === 'week' ? 'default' : 'outline'} onClick={() => setView('week')}>週</Button>
            <Button variant={view === 'month' ? 'default' : 'outline'} onClick={() => setView('month')}>月</Button>
          </div>
        </div>
        {renderView()}
      </CardContent>
      <ReservationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
        onDelete={handleModalDelete}
        reservation={selectedReservation || undefined}
        staffList={staffList}
      />
    </Card>
  );
}