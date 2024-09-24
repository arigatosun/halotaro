import React from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import { EventClickArg, CalendarOptions, EventInput } from '@fullcalendar/core';
import { Reservation } from '@/app/actions/reservationActions';

interface WeekViewCalendarProps {
  selectedDate: Date;
  reservations: Reservation[];
  staffList: { id: string; name: string }[];
  onEventClick: (clickInfo: EventClickArg) => void; // 修正
}

const WeekViewCalendar: React.FC<WeekViewCalendarProps> = ({
  selectedDate,
  reservations,
  staffList,
  onEventClick,
}) => {
  const events: EventInput[] = reservations.map(reservation => ({
    id: reservation.id,
    resourceId: reservation.staff_id,
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
    initialView: "resourceTimelineWeek",
    initialDate: selectedDate,
    resources: staffList.map(staff => ({ id: staff.id, title: staff.name })),
    events: events,
    slotDuration: "00:30:00",
    headerToolbar: false,
    eventClick: onEventClick, // 修正
    height: 'auto',
    schedulerLicenseKey: 'CC-Attribution-NonCommercial-NoDerivatives',
  };

  return <FullCalendar {...calendarOptions} />;
};

export default WeekViewCalendar;
