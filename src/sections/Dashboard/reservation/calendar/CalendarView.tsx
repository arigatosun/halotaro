// CalendarView.tsx
"use client";

import React, { forwardRef, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import interactionPlugin, {
  DateClickArg,
  EventResizeDoneArg,
} from "@fullcalendar/interaction";
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
  shift_status: string; // "出勤" or "休日"
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
  onEventResize: (resizeInfo: EventResizeDoneArg) => void; // ★ 追加
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
      onEventResize,
      handleDatesSet,
      currentDate,
      onDateClick,
      isMobile,
      isUpdating,
    },
    ref
  ) => {
    console.log("reservations from calendarview", reservations);
    // スクロール同期用
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

    // 現在の日付の営業時間を取得
    const currentDateStr = currentDate.tz("Asia/Tokyo").format("YYYY-MM-DD");
    const currentBusinessHours = businessHours.filter(
      (bh) => bh.date === currentDateStr && !bh.is_holiday
    );

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

    // スタッフ休日イベント
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

    // 予約 (通常 or スタッフスケジュール) + サロン休業日 + スタッフ休日 をまとめた events
    const events = [
      // 予約・スタッフスケジュール
      ...reservations
        .filter((r) => hasValidStartAndEnd(r) && hasStaffId(r))
        .map((r) => {
          // メニューorクーポンをタイトルに反映 (表示を調整したい場合はお好みで)
          let displayedTitle = "";
          if (r.is_staff_schedule) {
            // スタッフスケジュール
            displayedTitle = r.event || "";
          } else {
            // 通常予約 (メニュー or クーポン)
            const customerDisplay =
              r.customer_name || r.customer_name_kana || "Unknown";
            // ここで、menu_id があれば menu_name、coupon_id があれば coupon_name を表示
            const menuOrCouponName = r.menu_id
              ? r.menu_name
              : r.coupon_id
              ? r.coupons?.name
              : r.scraped_menu || "";
            displayedTitle = `${customerDisplay} - ${menuOrCouponName || ""}`;
          }

          return {
            id: r.id,
            resourceId: r.staff_id.toString(),
            title: displayedTitle,
            start: r.start_time,
            end: r.end_time,
            classNames: r.is_staff_schedule
              ? ["staff-schedule"]
              : r.is_hair_sync
              ? ["hair-reservation"]
              : ["customer-reservation"],
            editable: !r.is_closed_day && !r.is_hair_sync,
            resourceEditable: !r.is_closed_day && !r.is_hair_sync,
            extendedProps: r, // ← coupon_id, coupon_nameなどもここに含まれる
          };
        }),

      // サロン休業日
      ...businessHours
        .filter((bh) => bh.is_holiday)
        .map((bh) => ({
          id: `holiday-${bh.date}`,
          title: "サロン休業日",
          start: `${bh.date}T00:00:00`,
          end: `${bh.date}T23:59:59`,
          classNames: ["closed-day"],
          editable: false,
          resourceIds: resources.map((res) => res.id),
          extendedProps: {
            is_closed_day: true,
          },
        })),

      // スタッフ休日
      ...staffHolidayEvents,
    ];

    // FullCalendar 設定
    const plugins = [resourceTimelinePlugin, interactionPlugin, listPlugin];
    const initialView = "resourceTimelineDay";

    // businessHours 設定
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

    // 選択・移動制限のヘルパー
    const isDateAllowed = (date: Date, resourceId?: string) => {
      const dateStr = moment(date).format("YYYY-MM-DD");
      // サロン休業日チェック
      const isHoliday = businessHours.some(
        (bh) => bh.date === dateStr && bh.is_holiday
      );
      // スタッフ休日チェック
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
          minWidth: 600,
          "& .fc": {
            minHeight: "100px",
            margin: 0,
            padding: 0,
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
          "& .fc-scroller": {
            maxHeight: "none !important",
            overflow: "visible !important",
          },
        }}
      >
        <FullCalendar
          ref={ref}
          plugins={plugins}
          datesSet={handleDatesSet}
          initialView={initialView}
          initialDate={currentDate.format("YYYY-MM-DD")}
          editable={!isUpdating}
          eventStartEditable={!isUpdating}
          eventDurationEditable={!isUpdating}
          eventResourceEditable={!isUpdating}
          droppable={true}
          selectable={!isUpdating}
          selectConstraint="businessHours"
          eventConstraint="businessHours"
          dragRevertDuration={0}
          select={onDateSelect}
          selectMinDistance={50}
          selectLongPressDelay={500}
          schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
          resources={resources}
          events={events}
          resourceOrder={() => 0}
          eventClick={onEventClick}
          eventDrop={onEventDrop}
          eventResize={onEventResize}
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
          viewDidMount={(arg) => {
            resourceAreaRef.current = arg.el.querySelector(".fc-resource-area");
            timelineBodyRef.current = arg.el.querySelector(".fc-timeline-body");
          }}
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
            // スタッフ名セルの高さを調整
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
          locale="ja"
          // --------------------------------
          // イベントの見た目を独自に構築
          // --------------------------------
          eventContent={(eventInfo) => {
            const reservation = eventInfo.event
              .extendedProps as CalendarEventProps;

            // サロン休業日
            if (reservation.is_closed_day) {
              return {
                html: `<div class="fc-event-title">サロン休業日</div>`,
              };
            }
            // スタッフ休日
            if (reservation.is_staff_holiday) {
              return {
                html: `<div class="fc-event-title">スタッフ休日</div>`,
              };
            }
            // スタッフスケジュール
            if (reservation.is_staff_schedule) {
              const staffName = staffList.find(
                (s) => s.id.toString() === reservation.staff_id?.toString()
              )?.name;
              return {
                html: isMobile
                  ? `
                    <div class="fc-event-title">
                      <strong>${staffName || ""}</strong><br>
                      ${reservation.event || ""}
                    </div>
                  `
                  : `
                    <div class="fc-event-title">
                      ${reservation.event || ""}
                    </div>
                  `,
              };
            }

            // ----- 通常の予約イベント -----
            const staffName = staffList.find(
              (s) => s.id.toString() === reservation.staff_id?.toString()
            )?.name;
            const customerName =
              reservation.customer_name ||
              reservation.customer_name_kana ||
              "Unknown";

            // メニューかクーポンか判定してタイトルを作る
            const menuOrCouponName = reservation.menu_id
              ? reservation.menu_name // メニュー
              : reservation.coupon_id
              ? reservation.coupons?.name // クーポン
              : reservation.scraped_menu || ""; // どちらも無ければ空

            if (isMobile) {
              return {
                html: `
                  <div class="fc-event-title">
                    <strong>${staffName || ""}</strong><br>
                    ${customerName}<br>
                    ${menuOrCouponName}
                  </div>
                `,
              };
            } else {
              return {
                html: `
                  <div class="fc-event-title">
                    ${customerName}<br>
                    ${menuOrCouponName}
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
