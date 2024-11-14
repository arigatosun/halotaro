// CalendarView.tsx
"use client";

import React, { forwardRef, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import {
  EventClickArg,
  EventDropArg,
  DateSelectArg,
  CalendarOptions,
} from "@fullcalendar/core";
import { Reservation, Staff, BusinessHour } from "@/types/reservation";
import moment from "moment-timezone";
import "moment/locale/ja";
import { Box } from "@mui/material";

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
  isUpdating: boolean;
}

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
      isUpdating,
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

      const style = document.createElement('style');
style.textContent = `
  .fc .fc-timeline-lane-frame {
    padding: 0;
    margin: 0;
  }
  .fc .fc-timeline-body {
    min-height: auto;
  }
  .fc .fc-timeline-lane {
    min-height: 40px;
    margin: 0;
  }
  .fc-resource-timeline .fc-datagrid-cell-frame {
    padding: 4px 8px;
    margin: 0;
  }
  .fc-timeline-slot {
    height: auto;
    margin: 0;
  }
  .fc-resource-timeline table {
    border-spacing: 0;
    margin: 0;
  }
  .fc-timeline-slots td {
    height: auto;
    margin: 0;
  }
  .fc-scroller {
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .fc-scroller-liquid-absolute {
    position: static !important;
    margin: 0 !important;
  }
  .fc .fc-daygrid-body {
    position: relative !important;
    margin: 0 !important;
  }
  .fc .fc-timeline-body {
    position: relative !important;
    margin: 0 !important;
  }
  .fc-view-harness {
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
    min-height: 0 !important;
  }
  .fc .fc-view {
    padding: 0 !important;
    margin: 0 !important;
  }
  .fc-timeline-body .fc-scrollgrid {
    margin: 0 !important;
    padding: 0 !important;
  }
  .fc .fc-scrollgrid {
    border-bottom: none !important;
  }
  .fc .fc-scrollgrid-section-body > td {
    border-bottom: none !important;
  }
  .fc-timeline-event {
    margin: 0 !important;
    padding: 2px 4px !important;
  }
  .fc .fc-timeline-slot-cushion {
    padding: 4px !important;
  }
  .fc-timeline-body .fc-timeline-slots {
    padding: 0 !important;
  }
  .fc-timeline-body .fc-timeline-slots table {
    margin-bottom: 0 !important;
  }
  .fc .fc-scrollgrid-liquid {
    height: auto !important;
  }
  .fc-scrollgrid-sync-table {
    height: auto !important;
  }
  .fc-timeline-slots table {
    margin: 0 !important;
    padding: 0 !important;
  }
  .fc .fc-timeline-slots td {
    border-bottom: none !important;
  }
  .fc-scrollgrid-section {
    height: auto !important;
  }
  .fc-scroller-harness {
    height: auto !important;
  }
  `;
  document.head.appendChild(style);

  return () => {
    document.head.removeChild(style);
  };
}, []);

    if (businessHours.length === 0) {
      return <div>営業時間を読み込んでいます...</div>;
    }

    const currentDateStr = currentDate.tz("Asia/Tokyo").format("YYYY-MM-DD");
    const currentBusinessHours = businessHours.filter(
      (bh) => bh.date === currentDateStr && !bh.is_holiday
    );

    const earliestOpenTime = moment
      .min(currentBusinessHours.map((bh) => moment(bh.open_time, "HH:mm:ss")))
      .format("HH:mm:ss");

    const latestCloseTime = moment
      .max(currentBusinessHours.map((bh) => moment(bh.close_time, "HH:mm:ss")))
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
            ? reservation.event || ""
            : `${reservation.customer_name || ""} - ${
                reservation.menu_name || ""
              }`,
          start: reservation.start_time,
          end: reservation.end_time,
          classNames: reservation.is_staff_schedule
            ? ["staff-schedule"]
            : reservation.is_hair_sync
            ? ["hair-reservation"]
            : ["customer-reservation"],
          editable: !reservation.is_closed_day && !reservation.is_hair_sync,
          resourceEditable:
            !reservation.is_closed_day && !reservation.is_hair_sync,
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
          editable: false,
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
        editable: false,
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

    const plugins = [resourceTimelinePlugin, interactionPlugin, listPlugin];

    const initialView = isMobile ? "listDay" : "resourceTimelineDay";

    const businessHoursConfig = currentBusinessHours.map((bh) => ({
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
        height: "auto",
        minHeight: "100px",
        display: "flex",
        flexDirection: "column",
        padding: 0,
        margin: 0,
        "& .fc": {
          height: "auto !important",
          minHeight: "100px",
          margin: "0 !important",
          padding: "0 !important",
        },
        "& .fc-timeline-lane-frame": {
          padding: 0,
          margin: 0,
        },
        "& .fc-event": {
          margin: 0,
          padding: "2px 4px",
        },
        "& .fc-timeline-slot": {
          height: "auto",
          margin: 0,
        },
        "& .fc-timeline-slots td": {
          height: "auto",
          margin: 0,
          borderBottom: "none",
        },
        "& .fc-resource-timeline table": {
          borderSpacing: 0,
          margin: 0,
        },
        "& .fc-scroller": {
          height: "auto !important",
          maxHeight: "none !important",
          overflow: "visible !important",
          margin: "0 !important",
          padding: "0 !important",
        },
        "& .fc-scroller-liquid-absolute": {
          position: "static !important",
          top: "auto !important",
          right: "auto !important",
          bottom: "auto !important",
          left: "auto !important",
          margin: "0 !important",
        },
        "& .fc-timeline-body": {
          position: "relative !important",
          margin: "0 !important",
        },
        "& .fc-view-harness": {
          margin: 0,
          padding: 0,
          height: "auto !important",
          minHeight: "0 !important",
        },
        "& .fc-scrollgrid": {
          margin: 0,
          padding: 0,
          borderBottom: "none",
        },
        "& .fc-scrollgrid-section-body > td": {
          borderBottom: "none",
        },
        "& .fc-resource-timeline .fc-resource-group": {
          margin: 0,
          padding: 0,
        },
        "& .fc-timeline-header": {
          margin: 0,
          padding: 0,
        },
        "& .fc-timeline-slot-cushion": {
          padding: "4px !important",
        },
        "& .fc-scrollgrid-liquid": {
          height: "auto !important",
        },
        "& .fc-scrollgrid-sync-table": {
          height: "auto !important",
        },
        "& .fc-scroller-harness": {
          height: "auto !important",
        },
        "& .fc-scrollgrid-section": {
          height: "auto !important",
        }
      }}
      >
        <FullCalendar
          expandRows={false}
          ref={ref}
          plugins={plugins}
          datesSet={handleDatesSet}
          initialView={initialView}
          initialDate={currentDate.format("YYYY-MM-DD")}
          editable={!isUpdating}
          eventStartEditable={!isUpdating}
          eventDurationEditable={!isUpdating}
          droppable={true}
          selectable={!isUpdating}
          selectConstraint="businessHours"
          eventConstraint="businessHours"
          eventResourceEditable={!isUpdating}
          dragRevertDuration={0}
          select={onDateSelect}
          schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
          events={events}
          resources={resources}
          resourceOrder={() => 0}
          eventClick={onEventClick}
          eventDrop={onEventDrop}
          slotDuration="00:30:00"
          slotMinWidth={50}
          slotMinTime={earliestOpenTime}
          slotMaxTime={latestCloseTime}
          timeZone="local"
          height="auto"  // 固定の400pxから自動に変更
          contentHeight="auto"
          stickyHeaderDates={false}
          handleWindowResize={true}
          headerToolbar={false}
          dayHeaderFormat={{
            weekday: "long",
            month: "short",
            day: "numeric",
            omitCommas: true,
          }}
          slotLabelFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          resourceAreaHeaderContent=""
          resourceAreaWidth="200px"
          resourcesInitiallyExpanded={false}
          scrollTimeReset={false}
          viewDidMount={handleViewDidMount}
          eventDisplay="block"
          eventOverlap={true}
          selectOverlap={true}
          selectMinDistance={10}
          resourceLabelDidMount={(info) => {
            info.el.style.height = 'auto';
          }}
          eventDidMount={(info) => {
            const reservation = info.event.extendedProps as Reservation;

            if (reservation.is_staff_schedule) {
              info.el.parentElement?.classList.add("staff-schedule");
            } else if (reservation.is_hair_sync) {
              info.el.parentElement?.classList.add("hair-reservation");
            } else {
              info.el.parentElement?.classList.add("customer-reservation");
            }
          }}
          businessHours={businessHoursConfig}
          dateClick={onDateClick}
          locale={isMobile ? "ja" : undefined}
          visibleRange={
            isMobile
              ? {
                  start: currentDate.format("YYYY-MM-DD"),
                  end: currentDate.clone().add(1, "day").format("YYYY-MM-DD"),
                }
              : undefined
          }
          eventContent={(eventInfo) => {
            const reservation = eventInfo.event.extendedProps as Reservation;
            const staffName = reservation.staff_id
              ? staffList.find(
                  (staff) =>
                    staff.id.toString() === reservation.staff_id?.toString()
                )?.name || ""
              : "";

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
                  html: `<div class="fc-event-title">${
                    reservation.event || ""
                  }</div>`,
                };
              }
            }

            const customerName =
              reservation.customer_name ||
              reservation.customer_name_kana ||
              "Unknown";

            if (isMobile) {
              return {
                html: `
                  <div class="fc-event-title">
                    <strong>${staffName}</strong><br>
                    ${customerName}<br>
                    ${reservation.menu_name || ""}
                  </div>
                `,
              };
            } else {
              return {
                html: `
                  <div class="fc-event-title">
                    ${customerName}<br>
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

CalendarView.displayName = "CalendarView";

export default CalendarView;