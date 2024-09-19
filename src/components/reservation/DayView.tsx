import React from 'react';
import { format, eachHourOfInterval, startOfDay, endOfDay } from 'date-fns';
import { CalendarReservation } from "@/types/reservation";

interface DayViewProps {
  currentDate: Date;
  calendarReservations: CalendarReservation[];
  onReservationClick: (reservation: CalendarReservation) => void;
  staffList: string[];
}

export default function DayView({
  currentDate,
  calendarReservations,
  onReservationClick,
  staffList
}: DayViewProps) {
  const hours = eachHourOfInterval({
    start: startOfDay(currentDate),
    end: endOfDay(currentDate)
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 w-24"></th>
              {staffList.map(staff => (
                <th key={staff} className="border p-2">{staff}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour, index) => (
              <tr key={index}>
                <td className="border p-2 text-right">
                  {format(hour, 'HH:mm')}
                </td>
                {staffList.map(staff => (
                  <td key={`${staff}-${index}`} className="border p-2">
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