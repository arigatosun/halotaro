// CalendarView.tsx
import React, { forwardRef, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list"; // 追加
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
  isMobile: boolean; // 追加
}

const StyledFullCalendar = styled(FullCalendar)<CalendarOptions>(
  ({ theme }) => ({
    // 既存のスタイル設定
    // ...省略...
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
      isMobile, // 追加
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
            ? reservation.event
            : `${reservation.customer_name || ""} - ${
                reservation.menu_name || ""
              }`,
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
    ];

    const resources = staffList.map((staff) => ({
      id: staff.id.toString(),
      title: staff.name,
    }));

    const handleViewDidMount = (arg: { el: HTMLElement; view: any }) => {
      resourceAreaRef.current = arg.el.querySelector(".fc-resource-area");
      timelineBodyRef.current = arg.el.querySelector(".fc-timeline-body");
    };

    // プラグインの設定
    const plugins = [
      resourceTimelinePlugin,
      interactionPlugin,
      listPlugin, // 追加
    ];

    // 初期ビューの設定
    const initialView = isMobile ? "listWeek" : "resourceTimelineDay";

    // ビジネスアワーの設定
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
          dayHeaderFormat={{
            weekday: "long",
            month: "numeric",
            day: "numeric",
          }}
          slotLabelFormat={[
            { hour: "2-digit", minute: "2-digit", hour12: false },
          ]}
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
        />
      </Box>
    );
  }
);

export default CalendarView;
