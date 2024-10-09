import React from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import { EventClickArg, CalendarOptions, EventInput } from '@fullcalendar/core';
import { Reservation } from '@/app/actions/reservationActions';

interface MonthViewCalendarProps {
  selectedDate: Date;
  reservations: Reservation[];
  staffList: { id: string; name: string }[];
  onEventClick: (clickInfo: EventClickArg) => void;
}

const MonthViewCalendar: React.FC<MonthViewCalendarProps> = ({
  selectedDate,
  reservations,
  staffList,
  onEventClick,
}) => {
  const events: EventInput[] = reservations.map(reservation => ({
    id: reservation.id,
    resourceId: reservation.staff_id || undefined, // null の場合は undefined に変換
    start: new Date(reservation.start_time),
    end: new Date(reservation.end_time),
    title: reservation.customer_name,
    extendedProps: {
      menuName: reservation.menu_name,
      staffName: reservation.staff_name,
      // その他の必要な情報
    },
  }));

  const calendarOptions: CalendarOptions = {
    plugins: [resourceTimelinePlugin],
    initialView: "resourceTimelineMonth",
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

export default MonthViewCalendar;