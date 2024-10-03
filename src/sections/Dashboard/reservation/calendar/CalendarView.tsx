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

interface CalendarViewProps {
  reservations: Reservation[];
  staffList: Staff[];
  closedDays: string[];
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
    fontWeight: 'bold',
    color: theme.palette.text.primary,
  },
  '& .fc-timeline-event': {
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    width: 'calc(100% - 2px) !important', // グリッドの幅に合わせる
    left: '1px !important', // 左端に1pxの余白を残す
    right: '1px !important', // 右端に1pxの余白を残す
  },
  '& .staff-schedule': {
    backgroundColor: '#F2884B',
    borderColor: theme.palette.primary.main,
    color: 'white !important',
  },
  '& .customer-reservation': {
    backgroundColor: '#F2CA52',
    borderColor: theme.palette.secondary.main,
    color: 'black !important',
  },
  '& .fc-timeline-header': {
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  '& .fc-timeline-slot': {
    minWidth: '120px !important',
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
        slotMinWidth={120}
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
        resourceAreaWidth="150px"
        resourcesInitiallyExpanded={false}
        scrollTimeReset={false}
        viewDidMount={handleViewDidMount}
      />
    </Box>
  );
});

export default CalendarView;