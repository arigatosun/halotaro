// CalendarView.tsx

import React, { forwardRef, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { styled } from "@mui/system";
import {
  EventClickArg,
  EventDropArg,
  DateSelectArg,
  CalendarOptions,
} from "@fullcalendar/core";
import { Reservation, Staff, BusinessHour } from "@/types/reservation";
import moment from "moment";
import "moment/locale/ja";
import { Box } from "@mui/material";
// 日本語ロケールをインポート
import jaLocale from "@fullcalendar/core/locales/ja";

moment.locale("ja");

interface CalendarViewProps {
  reservations: Reservation[];
  staffList: Staff[];
  closedDays: string[];
  businessHours: BusinessHour[];
  onDateSelect: (selectInfo: DateSelectArg) => void;
  onEventClick: (clickInfo: EventClickArg) => void;
  onEventDrop: (dropInfo: EventDropArg) => void;
  handleDatesSet: (arg: any) => void;
  currentDate: moment.Moment;
  onDateClick: (clickInfo: DateClickArg) => void;
  isMobile: boolean;
}

const StyledFullCalendar = styled(FullCalendar)<CalendarOptions>(
  ({ theme }) => ({
    "& .fc-timeline-event.staff-schedule": {
      backgroundColor: "#F2884B !important",
      borderColor: "#F2884B !important",
      color: "white !important",
    },
    "& .fc-timeline-event.customer-reservation": {
      backgroundColor: "#F2CA52 !important",
      borderColor: "#F2CA52 !important",
      color: "black !important",
    },
    "& .fc-timeline-slot-cushion": {
      fontSize: "0.8rem",
      color: theme.palette.text.primary,
    },
    "& .fc-timeline-event": {
      borderRadius: "4px",
      padding: "0 !important",
      fontSize: "0.8rem",
      boxSizing: "border-box",
      width: "100% !important",
      maxWidth: "100% !important",
      left: "0 !important",
      right: "0 !important",
      margin: "0 !important",
      height: "100% !important",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    "& .fc-timeline-event *": {
      height: "100% !important",
      margin: "0 !important",
      padding: "0 !important",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    "& .fc-timeline-header": {
      backgroundColor: theme.palette.background.paper,
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    "& .fc-timeline-slot": {
      minWidth: "50px !important",
    },
    "& .fc-timeline-header-row-chrono th": {
      textAlign: "center",
    },
    "& .fc-resource-timeline-divider": {
      display: "none",
    },
    "& .fc-toolbar": {
      display: "none",
    },
    "& .fc-timeline-header-row:first-child": {
      display: "none",
    },
    "& .fc-resource-area": {
      maxHeight: "calc(80vh - 50px)",
      overflowY: "auto !important",
    },
    "& .fc-resource-area table": {
      height: "100%",
    },
    "& .fc-resource-area tbody": {
      display: "flex",
      flexDirection: "column",
      height: "100%",
    },
    "& .fc-resource-area tr": {
      flex: 1,
      display: "flex",
    },
    "& .fc-resource-area td": {
      flex: 1,
      display: "flex",
      alignItems: "center",
      padding: "10px",
      boxSizing: "border-box",
      minHeight: "60px",
      height: "100px",
    },
    "& .fc-timeline-body": {
      maxHeight: "calc(80vh - 50px)",
      overflowY: "auto !important",
    },
    "& .fc-event.closed-day": {
      backgroundColor: "#ff9f89",
      border: "none",
      cursor: "default",
    },
  })
);

function hasStaffId(
  reservation: Reservation
): reservation is Reservation & { staff_id: string | number } {
  return reservation.staff_id !== undefined && reservation.staff_id !== null;
}

function hasValidStartAndEnd(
  reservation: Reservation
): reservation is Reservation & { start_time: string; end_time: string } {
  return (
    typeof reservation.start_time === "string" &&
    typeof reservation.end_time === "string"
  );
}

const CalendarView = forwardRef<FullCalendar, CalendarViewProps>(
  (
    {
      reservations,
      staffList,
      closedDays,
      businessHours,
      onDateSelect,
      onEventClick,
      onEventDrop,
      handleDatesSet,
      currentDate,
      onDateClick,
      isMobile,
    },
    ref
  ) => {
    const resourceAreaRef = useRef<HTMLDivElement | null>(null);
    const timelineBodyRef = useRef<HTMLDivElement | null>(null);

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

        resourceArea.addEventListener("scroll", syncScroll);
        timelineBody.addEventListener("scroll", syncScroll);

        return () => {
          resourceArea.removeEventListener("scroll", syncScroll);
          timelineBody.removeEventListener("scroll", syncScroll);
        };
      }
    }, []);

    if (businessHours.length === 0) {
      return <div>営業時間を読み込んでいます...</div>;
    }

    const earliestOpenTime = moment
      .min(
        businessHours
          .filter((bh) => !bh.is_holiday)
          .map((bh) => moment(bh.open_time, "HH:mm:ss"))
      )
      .format("HH:mm:ss");
    const latestCloseTime = moment
      .max(
        businessHours
          .filter((bh) => !bh.is_holiday)
          .map((bh) => moment(bh.close_time, "HH:mm:ss"))
      )
      .format("HH:mm:ss");

    const events = [
      ...reservations
        .filter(
          (reservation) =>
            hasValidStartAndEnd(reservation) && hasStaffId(reservation)
        )
        .map((reservation) => ({
          id: reservation.id,
          resourceId: reservation.staff_id.toString(),
          title: reservation.is_staff_schedule
            ? reservation.event || ''
            : `${reservation.customer_name || ""} - ${reservation.menu_name || ""}`,
          start: reservation.start_time,
          end: reservation.end_time,
          classNames: reservation.is_staff_schedule
            ? ["staff-schedule"]
            : ["customer-reservation"],
          editable: reservation.editable,
          extendedProps: reservation,
        })),
      ...businessHours
        .filter((bh) => bh.is_holiday)
        .map((bh) => ({
          id: `holiday-${bh.date}`,
          start: bh.date,
          end: moment(bh.date).add(1, "day").format("YYYY-MM-DD"),
          display: "background",
          classNames: ["closed-day"],
          allDay: true,
        })),
      ...closedDays.map((dateStr) => ({
        id: `closed-${dateStr}`,
        title: "休業日",
        start: dateStr,
        end: moment(dateStr).add(1, "day").format("YYYY-MM-DD"),
        allDay: true,
        display: "background",
        classNames: ["closed-day"],
        overlap: false,
      })),
    ];

    const resources = staffList.map((staff) => ({
      id: staff.id.toString(),
      title: staff.name,
    }));

    const handleViewDidMount = (arg: { el: HTMLElement; view: any }) => {
      resourceAreaRef.current = arg.el.querySelector(".fc-resource-area");
      timelineBodyRef.current = arg.el.querySelector(".fc-timeline-body");
    };

    const plugins = [
      resourceTimelinePlugin,
      interactionPlugin,
      listPlugin,
    ];

    // initialViewをモバイル時にはlistDayに設定
    const initialView = isMobile ? "listDay" : "resourceTimelineDay";

    const businessHoursConfig = businessHours
      .filter((bh) => !bh.is_holiday)
      .map((bh) => ({
        daysOfWeek: [moment(bh.date).day()],
        startTime: bh.open_time || "00:00",
        endTime: bh.close_time || "24:00",
      }));

    return (
      <Box
        sx={{
          backgroundColor: "background.paper",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: 3,
          height: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <StyledFullCalendar
          expandRows={true}
          ref={ref}
          plugins={plugins}
          datesSet={handleDatesSet}
          initialView={initialView}
          initialDate={currentDate.format("YYYY-MM-DD")}
          editable={false}
          selectable={true}
          selectConstraint="businessHours"
          select={onDateSelect}
          schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
          events={events}
          resources={resources}
          eventClick={onEventClick}
          eventDrop={onEventDrop}
          slotDuration="00:30:00"
          slotMinWidth={50}
          slotMinTime={earliestOpenTime}
          slotMaxTime={latestCloseTime}
          timeZone="local"
          height="100%"
          headerToolbar={false}
          dayHeaderFormat={
            isMobile
              ? { weekday: 'long', month: 'short', day: 'numeric', omitCommas: true }
              : undefined
          }
          slotLabelFormat={
            isMobile
              ? [{ hour: '2-digit', minute: '2-digit', hour12: false }]
              : undefined
          }
          resourceAreaHeaderContent=""
          resourceAreaWidth="200px"
          resourcesInitiallyExpanded={false}
          scrollTimeReset={false}
          viewDidMount={handleViewDidMount}
          eventDisplay="block"
          eventOverlap={false}
          selectMinDistance={10}
          eventDidMount={(info) => {
            console.log("Event mounted:", info.event.toPlainObject());
          }}
          businessHours={businessHoursConfig}
          dateClick={onDateClick}
          // 日本語ロケールをモバイル時に適用
          locale={isMobile ? 'ja' : undefined}
          visibleRange={
            isMobile
              ? {
                  start: currentDate.format('YYYY-MM-DD'),
                  end: currentDate.clone().add(1, 'day').format('YYYY-MM-DD'),
                }
              : undefined
          }
          eventContent={(eventInfo) => {
            const reservation = eventInfo.event.extendedProps as Reservation;
            const staffName = reservation.staff_id
              ? staffList.find(
                  (staff) =>
                    staff.id.toString() === reservation.staff_id?.toString()
                )?.name || ''
              : '';
            if (reservation.is_staff_schedule) {
              if (isMobile) {
                return {
                  html: `
                    <div class="fc-event-title">
                      <strong>${staffName}</strong><br>
                      ${reservation.event || ""}
                    </div>
                  `,
                };
              } else {
                return {
                  html: `<div class="fc-event-title">${reservation.event || ""}</div>`,
                };
              }
            }
            if (isMobile) {
              return {
                html: `
                  <div class="fc-event-title">
                    <strong>${staffName}</strong><br>
                    ${reservation.customer_name || ""}<br>
                    ${reservation.menu_name || ""}
                  </div>
                `,
              };
            } else {
              return {
                html: `
                  <div class="fc-event-title">
                    ${reservation.customer_name || ""}<br>
                    ${reservation.menu_name || ""}
                  </div>
                `,
              };
            }
          }}
        />
      </Box>
    );
  }
);

export default CalendarView;
