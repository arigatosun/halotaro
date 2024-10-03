import React, { forwardRef, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';
import { styled } from '@mui/system';
import { EventClickArg, EventDropArg, DateSelectArg, CalendarOptions } from '@fullcalendar/core';
import { Reservation, Staff } from '@/types/reservation';
import moment from 'moment';
import 'moment/locale/ja';
import { Box } from '@mui/material';

moment.locale('ja');

interface BusinessHour {
    date: string;
    open_time: string;
    close_time: string;
  }

interface CalendarViewProps {
  reservations: Reservation[];
  staffList: Staff[];
  closedDays: string[];
  businessHours: BusinessHour[];
  onDateSelect: (selectInfo: DateSelectArg) => void;
  onEventClick: (clickInfo: EventClickArg) => void;
  onEventDrop: (dropInfo: EventDropArg) => void;
  handleDatesSet: (arg: any) => void;
}

const StyledFullCalendar = styled(FullCalendar)<CalendarOptions>(({ theme }) => ({
    '& .fc-timeline-event.staff-schedule': {
      backgroundColor: '#F2884B !important',
      borderColor: '#F2884B !important',
      color: 'white !important',
    },
    '& .fc-timeline-event.customer-reservation': {
      backgroundColor: '#F2CA52 !important',
      borderColor: '#F2CA52 !important',
      color: 'black !important',
    },
    '& .fc-timeline-slot-cushion': {
      fontSize: '0.8rem',
      color: theme.palette.text.primary,
    },
    '& .fc-timeline-event': {
      borderRadius: '4px',
      padding: '0 !important', // パディングを0に設定
      fontSize: '0.8rem',
      boxSizing: 'border-box',
      width: '100% !important', // 幅を100%に設定
      maxWidth: '100% !important', // 最大幅も100%に設定
      left: '0 !important', // 左端を0に設定
      right: '0 !important', // 右端を0に設定
      margin: '0 !important',
      height: '100% !important', // 高さを100%に設定
      display: 'flex', // Flexboxを適用
      alignItems: 'center', // 縦方向の中央揃え
      justifyContent: 'center', // 横方向の中央揃え
    },
    '& .fc-timeline-event *': {
      height: '100% !important',
      margin: '0 !important',
      padding: '0 !important',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    '& .fc-timeline-header': {
      backgroundColor: theme.palette.background.paper,
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    '& .fc-timeline-slot': {
      minWidth: '50px !important',
    },
    '& .fc-timeline-header-row-chrono th': {
      textAlign: 'center',
    },
    '& .fc-resource-timeline-divider': {
      display: 'none',
    },
    '& .fc-toolbar': {
      display: 'none',
    },
    '& .fc-timeline-header-row:first-child': {
      display: 'none',
    },
    '& .fc-resource-area': {
      maxHeight: 'calc(80vh - 50px)',
      overflowY: 'auto !important',
    },
    '& .fc-resource-area table': {
      height: '100%',
    },
    '& .fc-resource-area tbody': {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    },
    '& .fc-resource-area tr': {
      flex: 1,
      display: 'flex',
    },
    '& .fc-resource-area td': {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '10px',
      boxSizing: 'border-box',
      minHeight: '60px', // 最小の高さを設定
      height: '100px', // 固定高さ
    },
    '& .fc-timeline-body': {
      maxHeight: 'calc(80vh - 50px)',
      overflowY: 'auto !important',
    },
    '& .fc-event.closed-day': {
      backgroundColor: '#ff9f89',
      border: 'none',
      cursor: 'default',
    },
  }));
  

  function hasValidStartAndEnd(
    reservation: Reservation
  ): reservation is Reservation & { start_time: string; end_time: string } {
    return (
      typeof reservation.start_time === 'string' &&
      typeof reservation.end_time === 'string'
    );
  }

  const CalendarView = forwardRef<FullCalendar, CalendarViewProps>(({
    reservations,
    staffList,
    closedDays,
    businessHours,
    onDateSelect,
    onEventClick,
    onEventDrop,
    handleDatesSet,
  }, ref) => {
  const resourceAreaRef = useRef<HTMLDivElement | null>(null);
  const timelineBodyRef = useRef<HTMLDivElement | null>(null);

  const handleViewDidMount = (arg: { el: HTMLElement; view: any }) => {
    resourceAreaRef.current = arg.el.querySelector('.fc-resource-area');
    timelineBodyRef.current = arg.el.querySelector('.fc-timeline-body');
  };

  useEffect(() => {
    const resourceArea = resourceAreaRef.current;
    const timelineBody = timelineBodyRef.current;

    if (resourceArea && timelineBody) {
      const syncScroll = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target === resourceArea) {
          timelineBody.scrollTop = resourceArea.scrollTop;
        } else if (target === timelineBody) {
          resourceArea.scrollTop = timelineBody.scrollTop;
        }
      };

      resourceArea.addEventListener('scroll', syncScroll);
      timelineBody.addEventListener('scroll', syncScroll);

      return () => {
        resourceArea.removeEventListener('scroll', syncScroll);
        timelineBody.removeEventListener('scroll', syncScroll);
      };
    }
  }, []);

  const earliestOpenTime = moment.min(businessHours.map(bh => moment(bh.open_time, 'HH:mm:ss'))).format('HH:mm:ss');
  const latestCloseTime = moment.max(businessHours.map(bh => moment(bh.close_time, 'HH:mm:ss'))).format('HH:mm:ss');

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 3,
        height: '80vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <StyledFullCalendar
      expandRows={true}
        ref={ref}
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineDay"
        editable={true}
        selectable={true}
        select={onDateSelect}
        schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
        events={
            reservations
            .filter((reservation) => hasValidStartAndEnd(reservation) && reservation.staff_id)
            .map((reservation) => ({
              id: reservation.id,
              resourceId: reservation.staff_id,
              title: reservation.is_staff_schedule
                ? reservation.event
                : `${reservation.customer_name || ''} - ${reservation.menu_name || ''}`,
              start: reservation.start_time,
              end: reservation.end_time,
              className: reservation.is_staff_schedule ? 'staff-schedule' : 'customer-reservation',
              extendedProps: reservation,
              }))
            }
        resources={staffList.map((staff) => ({
          id: staff.id.toString(),
          title: staff.name,
        }))}
        eventClick={onEventClick}
        eventDrop={onEventDrop}
        slotDuration="00:30:00"
        slotMinWidth={50}
        slotMinTime="09:00:00"
        slotMaxTime="21:00:00"
        height="100%"
        headerToolbar={false}
        dayHeaderFormat={{ weekday: 'long', month: 'numeric', day: 'numeric' }}
        slotLabelFormat={[
          { hour: '2-digit', minute: '2-digit', hour12: false },
        ]}
        resourceAreaHeaderContent=""
        datesSet={handleDatesSet}
        resourceAreaWidth="200px"
        resourcesInitiallyExpanded={false}
        scrollTimeReset={false}
        viewDidMount={handleViewDidMount}
      />
    </Box>
  );
});

export default CalendarView;