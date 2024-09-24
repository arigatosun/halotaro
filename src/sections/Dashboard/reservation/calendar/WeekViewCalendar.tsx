import React from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { EventClickArg, CalendarOptions, EventInput } from '@fullcalendar/core';
import { Reservation } from '@/app/actions/reservationActions';

interface WeekViewCalendarProps {
  selectedDate: Date;
  reservations: Reservation[];
  onEventClick: (event: EventInput) => void;
}

const WeekViewCalendar: React.FC<WeekViewCalendarProps> = ({
  selectedDate,
  reservations,
  onEventClick,
}) => {
  const events: EventInput[] = reservations.map(reservation => ({
    id: reservation.id,
    start: new Date(reservation.start_time),
    end: new Date(reservation.end_time),
    title: `${reservation.customer_name} (${reservation.staff_name})`,
  }));

  const handleEventClick = (clickInfo: EventClickArg) => {
    onEventClick(clickInfo.event.toPlainObject());
  };

  const calendarOptions: CalendarOptions = {
    plugins: [timeGridPlugin],
    initialView: "timeGridWeek",
    initialDate: selectedDate,
    events: events,
    headerToolbar: false,
    eventClick: handleEventClick,
    height: 'auto',
    schedulerLicenseKey: 'CC-Attribution-NonCommercial-NoDerivatives',
  };

  return <FullCalendar {...calendarOptions} />;
};

export default WeekViewCalendar;