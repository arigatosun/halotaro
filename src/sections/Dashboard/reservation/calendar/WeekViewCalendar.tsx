import React from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import { EventClickArg, CalendarOptions, EventInput } from '@fullcalendar/core';
import { Reservation } from '@/app/actions/reservationActions';

interface DayViewCalendarProps {
  selectedDate: Date;
  reservations: Reservation[];
  staffList: { id: string; name: string }[];
  onEventClick: (clickInfo: EventClickArg) => void;
}

const DayViewCalendar: React.FC<DayViewCalendarProps> = ({
  selectedDate,
  reservations,
  staffList,
  onEventClick,
}) => {
  const events: EventInput[] = reservations.map(reservation => {
    // メニュー名を取得
    const menuName = reservation.menu_name;
    
    return {
      id: reservation.id,
      resourceId: reservation.staff_id ?? undefined, // null の場合は undefined に変換
      start: new Date(reservation.start_time),
      end: new Date(reservation.end_time),
      title: reservation.customer_name,
      extendedProps: {
        menuName: menuName,
        staffName: reservation.staff_name,
        // その他の必要な情報
      },
    };
  });

  const calendarOptions: CalendarOptions = {
    plugins: [resourceTimelinePlugin],
    initialView: "resourceTimelineDay",
    initialDate: selectedDate,
    resources: staffList.map(staff => ({ id: staff.id, title: staff.name })),
    events: events,
    slotDuration: "00:30:00",
    headerToolbar: false,
    eventClick: onEventClick,
    height: 'auto',
    schedulerLicenseKey: 'CC-Attribution-NonCommercial-NoDerivatives',
  };

  return <FullCalendar {...calendarOptions} />;
};

export default DayViewCalendar;