import React from 'react';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, eachHourOfInterval, startOfDay, endOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarReservation } from "@/types/reservation";

interface WeekViewProps {
  currentDate: Date;
  calendarReservations: CalendarReservation[];
  onReservationClick: (reservation: CalendarReservation) => void;
  staffList: string[];
}

export default function WeekView({
  currentDate,
  calendarReservations,
  onReservationClick,
  staffList
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = eachHourOfInterval({ start: startOfDay(weekStart), end: endOfDay(weekStart) });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 w-24"></th>
              {days.map(day => (
                <th key={day.toISOString()} className="border p-2">
                  {format(day, 'M/d (EEE)', { locale: ja })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour, index) => (
              <tr key={index}>
                <td className="border p-2 text-right">
                  {format(hour, 'HH:mm')}
                </td>
                {days.map(day => (
                  <td key={`${day.toISOString()}-${index}`} className="border p-2">
                    {/* ここに予約を表示するロジックを追加 */}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}