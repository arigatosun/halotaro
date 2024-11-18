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
  DateSpanApi,
} from "@fullcalendar/core";
import { Reservation, Staff, BusinessHour } from "@/types/reservation";
import moment from "moment-timezone";
import "moment/locale/ja";
import { Box } from "@mui/material";

moment.locale("ja");

interface StaffShift {
  id: string;
  staff_id: string;
  date: string;
  shift_status: string; // "出勤" または "休日"
  start_time?: string;
  end_time?: string;
  memo?: string;
}

interface CalendarEventProps extends Reservation {
  is_closed_day?: boolean;
  is_staff_holiday?: boolean;
}

interface CalendarViewProps {
  reservations: Reservation[];
  staffList: Staff[];
  closedDays: string[];
  businessHours: BusinessHour[];
  staffShifts: StaffShift[];
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
      staffShifts,
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
    }, []);

    if (businessHours.length === 0) {
      return <div>営業時間を読み込んでいます...</div>;
    }

    // 営業時間の計算
    const currentDateStr = currentDate.tz("Asia/Tokyo").format("YYYY-MM-DD");
    const currentBusinessHours = businessHours.filter(
      (bh) => bh.date === currentDateStr && !bh.is_holiday
    );

    // 営業時間がない場合のデフォルト値を設定
    const defaultOpenTime = "09:00:00";
    const defaultCloseTime = "18:00:00";

    const earliestOpenTime = currentBusinessHours.length
      ? moment
          .min(
            currentBusinessHours.map((bh) => moment(bh.open_time, "HH:mm:ss"))
          )
          .format("HH:mm:ss")
      : defaultOpenTime;

    const latestCloseTime = currentBusinessHours.length
      ? moment
          .max(
            currentBusinessHours.map((bh) => moment(bh.close_time, "HH:mm:ss"))
          )
          .format("HH:mm:ss")
      : defaultCloseTime;

    const resources = staffList.map((staff) => ({
      id: staff.id.toString(),
      title: staff.name,
    }));

    // スタッフ休日イベントを作成
    const staffHolidayEvents = staffShifts
      .filter((shift) => shift.shift_status === "休日")
      .map((shift) => ({
        id: `staff-holiday-${shift.staff_id}-${shift.date}`,
        title: "スタッフ休日",
        start: `${shift.date}T00:00:00`,
        end: `${shift.date}T23:59:59`,
        resourceId: shift.staff_id.toString(),
        classNames: ["staff-holiday"],
        editable: false,
        extendedProps: {
          is_staff_holiday: true,
        },
      }));

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
      // 休業日イベントを追加
      ...businessHours
        .filter((bh) => bh.is_holiday)
        .map((bh) => ({
          id: `holiday-${bh.date}`,
          title: "サロン休業日",
          start: `${bh.date}T00:00:00`,
          end: `${bh.date}T23:59:59`,
          classNames: ["closed-day"],
          editable: false,
          resourceIds: resources.map((resource) => resource.id),
          extendedProps: {
            is_closed_day: true,
          },
        })),
      // スタッフ休日イベントを追加
      ...staffHolidayEvents,
    ];

    const handleViewDidMount = (arg: { el: HTMLElement; view: any }) => {
      resourceAreaRef.current = arg.el.querySelector(".fc-resource-area");
      timelineBodyRef.current = arg.el.querySelector(".fc-timeline-body");
    };

    const plugins = [resourceTimelinePlugin, interactionPlugin, listPlugin];
    const initialView = isMobile ? "listDay" : "resourceTimelineDay";

    // businessHoursConfigを元に戻す
    const businessHoursConfig = currentBusinessHours.length
      ? currentBusinessHours.map((bh) => ({
          daysOfWeek: [moment(bh.date).day()],
          startTime: bh.open_time || "00:00",
          endTime: bh.close_time || "24:00",
        }))
      : [
          {
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            startTime: defaultOpenTime,
            endTime: defaultCloseTime,
          },
        ];

    // 選択やイベントの移動を制限するための関数
    const isDateAllowed = (date: Date, resourceId?: string) => {
      const dateStr = moment(date).format("YYYY-MM-DD");
      const isHoliday = businessHours.some(
        (bh) => bh.date === dateStr && bh.is_holiday
      );

      // スタッフの休日を確認
      const isStaffHoliday = staffShifts.some(
        (shift) =>
          shift.staff_id === resourceId &&
          shift.shift_status === "休日" &&
          shift.date === dateStr
      );

      return !isHoliday && !isStaffHoliday;
    };

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
          "& .closed-day": {
            backgroundColor: "rgba(244, 67, 54, 0.1) !important",
            borderLeft: "4px solid #f44336",
            "& .fc-event-title": {
              color: "#f44336",
              fontWeight: "bold",
              textAlign: "center",
              padding: "8px",
              fontSize: "1rem",
            },
          },
          "& .staff-holiday": {
            backgroundColor: "rgba(255, 193, 7, 0.1) !important",
            borderLeft: "4px solid #FFC107",
            "& .fc-event-title": {
              color: "#FFC107",
              fontWeight: "bold",
              textAlign: "center",
              padding: "8px",
              fontSize: "1rem",
            },
          },
          // 他のスタイル設定
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
          },
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
          select={(selectInfo: DateSelectArg) => {
            onDateSelect(selectInfo);
          }}
          selectMinDistance={50}
          selectLongPressDelay={500}
          schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
          events={events}
          resources={resources}
          resourceOrder={() => 0}
          eventClick={onEventClick}
          eventDrop={onEventDrop}
          slotDuration="00:30:00"
          slotMinWidth={20}
          slotMinTime={earliestOpenTime}
          slotMaxTime={latestCloseTime}
          timeZone="local"
          height="auto"
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
          eventOverlap={(stillEvent, movingEvent) => {
            if (!movingEvent) return false;
            const isOverlapAllowed =
              !stillEvent.extendedProps.is_closed_day &&
              !stillEvent.extendedProps.is_staff_holiday &&
              !movingEvent.extendedProps.is_closed_day &&
              !movingEvent.extendedProps.is_staff_holiday;
            return isOverlapAllowed;
          }}
          selectOverlap={(event) => {
            return (
              !event.extendedProps.is_closed_day &&
              !event.extendedProps.is_staff_holiday
            );
          }}
          selectAllow={(span: DateSpanApi) => {
            const resourceId = span.resource?.id;
            return isDateAllowed(span.start, resourceId);
          }}
          eventAllow={(span, movingEvent) => {
            const resourceId =
              span.resource?.id || movingEvent?.getResources()[0]?.id;
            return isDateAllowed(span.start, resourceId);
          }}
          resourceLabelDidMount={(info) => {
            info.el.style.height = "auto";
          }}
          eventDidMount={(info) => {
            const reservation = info.event.extendedProps as CalendarEventProps;
            if (reservation.is_closed_day) {
              info.el.classList.add("closed-day");
            } else if (reservation.is_staff_holiday) {
              info.el.classList.add("staff-holiday");
            } else if (reservation.is_staff_schedule) {
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
            const reservation = eventInfo.event
              .extendedProps as CalendarEventProps;
            if (reservation.is_closed_day) {
              return {
                html: `<div class="fc-event-title">サロン休業日</div>`,
              };
            }

            if (reservation.is_staff_holiday) {
              return {
                html: `<div class="fc-event-title">スタッフ休日</div>`,
              };
            }

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
