import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { EventClickArg, CalendarOptions, EventInput } from '@fullcalendar/core';
import { Reservation } from '@/app/actions/reservationActions';

interface MonthViewCalendarProps {
  selectedDate: Date;
  reservations: Reservation[];
  onEventClick: (event: EventInput) => void;
}

const MonthViewCalendar: React.FC<MonthViewCalendarProps> = ({
  selectedDate,
  reservations,
  onEventClick,
}) => {
  const events: EventInput[] = reservations.map(reservation => ({
    id: reservation.id,
    start: new Date(reservation.start_time),
    end: new Date(reservation.end_time),
    title: reservation.customer_name,
  }));

  const handleEventClick = (clickInfo: EventClickArg) => {
    onEventClick(clickInfo.event.toPlainObject());
  };

  const calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin],
    initialView: "dayGridMonth",
    initialDate: selectedDate,
    events: events,
    headerToolbar: false,
    eventClick: handleEventClick,
    height: 'auto',
    schedulerLicenseKey: 'CC-Attribution-NonCommercial-NoDerivatives',
  };

  return <FullCalendar {...calendarOptions} />;
};

export default MonthViewCalendar;