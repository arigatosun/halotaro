import React, { useState } from 'react';
import { Calendar as BigCalendar, CalendarProps, momentLocalizer, Views, SlotInfo } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

moment.locale('ja');
const localizer = momentLocalizer(moment);

declare module 'react-big-calendar' {
  interface CalendarProps<TEvent, TResource> {
    onEventDrop?: (args: {
      event: TEvent;
      start: Date;
      end: Date;
      allDay: boolean;
      resourceId?: string;
    }) => void;
    onEventResize?: (args: {
      event: TEvent;
      start: Date;
      end: Date;
      allDay: boolean;
    }) => void;
  }
}

export interface Reservation {
  id: string;
  time: string;
  client: string;
  service: string;
  staff: string;
  date: string;
}


interface ReservationCalendarProps {
    reservations: Reservation[]; // 追加
    onReservationSelect: (reservation: Reservation) => void;
    onReservationUpdate: (reservation: Reservation) => void;
    onReservationCreate: (reservation: Partial<Reservation>) => void;
  }

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: string;
}

// サンプルデータ
const sampleReservations: Reservation[] = [
  { id: '1', date: '2024-08-22', time: '10:00', client: '山田花子', service: 'カット', staff: '斉藤 恵司' },
  { id: '2', date: '2024-08-22', time: '14:00', client: '鈴木一郎', service: 'カラー', staff: '徳 美加' },
  { id: '3', date: '2024-08-22', time: '16:00', client: '佐藤美咲', service: 'パーマ', staff: '田原 誠基' },
];

const ReservationCalendar: React.FC<ReservationCalendarProps> = ({
    onReservationSelect,
    onReservationUpdate,
    onReservationCreate,
    reservations,
  }) => {
    const [view, setView] = useState<string>(Views.DAY);
    const [date, setDate] = useState(new Date());

  const events: CalendarEvent[] = sampleReservations.map(reservation => ({
    id: reservation.id,
    title: `${reservation.client} - ${reservation.service}`,
    start: new Date(`${reservation.date}T${reservation.time}`),
    end: moment(`${reservation.date}T${reservation.time}`).add(1, 'hour').toDate(),
    resource: reservation.staff,
  }));

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const newReservation = {
      date: moment(slotInfo.start).format('YYYY-MM-DD'),
      time: moment(slotInfo.start).format('HH:mm'),
      staff: slotInfo.resourceId as string,
    };
    onReservationCreate(newReservation);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    const reservation = sampleReservations.find(r => r.id === event.id);
    if (reservation) {
      onReservationSelect(reservation);
    }
  };

  const handleEventChange = (args: {
    event: CalendarEvent;
    start: Date;
    end: Date;
    allDay: boolean;
    resourceId?: string;
  }) => {
    const { event, start, end, resourceId } = args;
    if (event && start && end) {
      const updatedReservation = {
        ...sampleReservations.find(r => r.id === event.id),
        date: moment(start).format('YYYY-MM-DD'),
        time: moment(start).format('HH:mm'),
        staff: resourceId,
      };
      onReservationUpdate(updatedReservation as Reservation);
    }
  };

  return (
    <BigCalendar<CalendarEvent, { id: string; title: string }>
      localizer={localizer}
      events={events}
      startAccessor="start"
      endAccessor="end"
      view={view as any}
      onView={(newView) => setView(newView)}
      date={date}
      onNavigate={setDate}
      selectable
      resources={[
        { id: '窪塚洋介', title: '窪塚洋介' },
        { id: '槇原敬之', title: '槇原敬之' },
        { id: '田原 誠基', title: '田原 誠基' },
        { id: '田中大地', title: '田中大地' },
        { id: 'カリスマTSUCHIGA!', title: 'カリスマTSUCHIGA!' },
      ]}
      resourceIdAccessor="id"
      resourceTitleAccessor="title"
      onSelectSlot={handleSelectSlot}
      onSelectEvent={handleSelectEvent}
      onEventDrop={handleEventChange}
      onEventResize={handleEventChange}
      step={15}
      timeslots={4}
      min={new Date(0, 0, 0, 10, 0, 0)}
      max={new Date(0, 0, 0, 21, 0, 0)}
      formats={{
        timeGutterFormat: (date: Date, culture?: string, localizer?: { format: (date: Date, format: string, culture?: string) => string }) => 
          localizer?.format(date, 'HH:mm', culture) ?? '',
        dayFormat: (date: Date, culture?: string, localizer?: { format: (date: Date, format: string, culture?: string) => string }) => 
          localizer?.format(date, 'M月D日(ddd)', culture) ?? '',
        dayHeaderFormat: (date: Date, culture?: string, localizer?: { format: (date: Date, format: string, culture?: string) => string }) => 
          localizer?.format(date, 'YYYY年M月D日(ddd)', culture) ?? '',
        dayRangeHeaderFormat: ({ start, end }: { start: Date, end: Date }, culture?: string, localizer?: { format: (date: Date, format: string, culture?: string) => string }) => 
          `${localizer?.format(start, 'YYYY年M月D日', culture)} - ${localizer?.format(end, 'YYYY年M月D日', culture)}`,
      }}
      style={{ height: 'calc(100vh - 200px)' }}
      messages={{
        today: '今日',
        previous: '前へ',
        next: '次へ',
        month: '月',
        week: '週',
        day: '日',
        agenda: 'アジェンダ',
        date: '日付',
        time: '時間',
        event: 'イベント',
        allDay: '終日',
        work_week: '稼働週',
        yesterday: '昨日',
        tomorrow: '明日',
        noEventsInRange: 'この期間には予約はありません。',
      }}
    />
  );
};

export default ReservationCalendar;