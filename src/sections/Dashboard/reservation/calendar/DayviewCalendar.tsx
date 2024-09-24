import React from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import { EventClickArg, CalendarOptions, EventInput } from '@fullcalendar/core';
import { Reservation } from '@/app/actions/reservationActions';

interface DayViewCalendarProps {
  selectedDate: Date;
  reservations: Reservation[];
  staffList: { id: string; name: string }[];
  onEventClick: (event: EventInput) => void;
}

const DayViewCalendar: React.FC<DayViewCalendarProps> = ({
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
  }));

  const handleEventClick = (clickInfo: EventClickArg) => {
    onEventClick(clickInfo.event.toPlainObject());
  };

  const calendarOptions: CalendarOptions = {
    plugins: [resourceTimelinePlugin],
    initialView: "resourceTimelineDay",
    initialDate: selectedDate,
    resources: staffList.map(staff => ({ id: staff.id, title: staff.name })),
    events: events,
    slotDuration: "00:30:00",
    headerToolbar: false,
    eventClick: handleEventClick,
    height: 'auto',
    schedulerLicenseKey: 'CC-Attribution-NonCommercial-NoDerivatives',
  };

  return <FullCalendar {...calendarOptions} />;
};

export default DayViewCalendar;