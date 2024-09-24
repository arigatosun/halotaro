import React, { useState } from 'react';
import { Reservation } from '@/app/actions/reservationActions';
import { useStaffManagement } from '@/hooks/useStaffManagement';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DayViewCalendar from '@/sections/Dashboard/reservation/calendar/DayviewCalendar';
import WeekViewCalendar from '@/sections/Dashboard/reservation/calendar/WeekViewCalendar';
import MonthViewCalendar from '@/sections/Dashboard/reservation/calendar/MonthViewCalendar';
import { EventInput } from '@fullcalendar/core';
import { addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, format, getWeek } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ReservationCalendarProps {
  selectedDate: Date;
  selectedStaff: string;
  reservations: Reservation[];
  onDateChange: (date: Date) => void;
  onStaffChange: (staff: string) => void;
}

type CalendarView = 'day' | 'week' | 'month';

const ReservationCalendar: React.FC<ReservationCalendarProps> = ({
  selectedDate,
  reservations,
  onDateChange,
}) => {
  const [view, setView] = useState<CalendarView>('day');
  const [selectedEvent, setSelectedEvent] = useState<EventInput | null>(null);
  const { staffList } = useStaffManagement();

  const handleEventClick = (event: EventInput) => {
    setSelectedEvent(event);
    setView('day');
    onDateChange(new Date(event.start as string));
  };

  const handlePrevious = () => {
    switch (view) {
      case 'day':
        onDateChange(subDays(selectedDate, 1));
        break;
      case 'week':
        onDateChange(subWeeks(selectedDate, 1));
        break;
      case 'month':
        onDateChange(subMonths(selectedDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case 'day':
        onDateChange(addDays(selectedDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(selectedDate, 1));
        break;
      case 'month':
        onDateChange(addMonths(selectedDate, 1));
        break;
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const renderCalendar = () => {
    switch (view) {
      case 'day':
        return (
          <DayViewCalendar
            selectedDate={selectedDate}
            reservations={reservations}
            staffList={staffList}
            onEventClick={handleEventClick}
          />
        );
      case 'week':
        return (
          <WeekViewCalendar
            selectedDate={selectedDate}
            reservations={reservations}
            onEventClick={handleEventClick}
          />
        );
      case 'month':
        return (
          <MonthViewCalendar
            selectedDate={selectedDate}
            reservations={reservations}
            onEventClick={handleEventClick}
          />
        );
    }
  };

  const renderNavigationButtons = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <Button onClick={handlePrevious}>前へ</Button>
        <div className="text-lg font-bold">
          {view === 'day' && format(selectedDate, 'yyyy年M月d日(E)', { locale: ja })}
          {view === 'week' && `${format(startOfWeek(selectedDate), 'yyyy年M月d日', { locale: ja })} - ${format(endOfWeek(selectedDate), 'M月d日', { locale: ja })}`}
          {view === 'month' && format(selectedDate, 'yyyy年M月', { locale: ja })}
        </div>
        <Button onClick={handleNext}>次へ</Button>
      </div>
    );
  };

  const renderWeekSelector = () => {
    if (view !== 'week') return null;

    const currentWeek = getWeek(selectedDate);
    const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

    return (
      <Select
        value={currentWeek.toString()}
        onValueChange={(value) => {
          const newDate = addWeeks(startOfWeek(new Date(selectedDate.getFullYear(), 0, 1)), parseInt(value) - 1);
          onDateChange(newDate);
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="週を選択" />
        </SelectTrigger>
        <SelectContent>
          {weeks.map((week) => (
            <SelectItem key={week} value={week.toString()}>
              {week}週目
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const renderMonthSelector = () => {
    if (view !== 'month') return null;

    const months = Array.from({ length: 12 }, (_, i) => new Date(selectedDate.getFullYear(), i, 1));

    return (
      <Select
        value={selectedDate.getMonth().toString()}
        onValueChange={(value) => onDateChange(new Date(selectedDate.getFullYear(), parseInt(value), 1))}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="月を選択" />
        </SelectTrigger>
        <SelectContent>
          {months.map((date, index) => (
            <SelectItem key={index} value={index.toString()}>
              {format(date, 'M月', { locale: ja })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center space-x-2">
        <Button onClick={() => setView('day')} variant={view === 'day' ? 'default' : 'outline'}>日</Button>
        <Button onClick={() => setView('week')} variant={view === 'week' ? 'default' : 'outline'}>週</Button>
        <Button onClick={() => setView('month')} variant={view === 'month' ? 'default' : 'outline'}>月</Button>
      </div>
      {renderNavigationButtons()}
      {view === 'week' && renderWeekSelector()}
      {view === 'month' && renderMonthSelector()}
      {view === 'day' && <Button onClick={handleToday}>今日</Button>}
      {renderCalendar()}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約詳細</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div>
              <p>顧客名: {selectedEvent.title}</p>
              <p>開始時間: {new Date(selectedEvent.start as string).toLocaleString()}</p>
              <p>終了時間: {new Date(selectedEvent.end as string).toLocaleString()}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReservationCalendar;