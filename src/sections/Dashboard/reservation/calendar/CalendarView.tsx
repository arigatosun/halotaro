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
import { Box } from "@mui/material";
import moment from "moment-timezone";
import "moment/locale/ja";

// ------------------ 型定義 ------------------
interface CaldendarViewReservation {
  id: string;
  staff_id?: string | number;
  start_time?: string;
  end_time?: string;
  is_staff_schedule?: boolean;
  is_closed_day?: boolean;
  is_hair_sync?: boolean;
  customer_name?: string;
  menu_id?: number | string;
  menu_name?: string;
  customer_name_kana?: string;
  coupon_id?: string;
  coupons?: { name: string };
  scraped_menu?: string;
  event?: string; // スタッフスケジュールの場合の予定名など
}

interface Staff {
  id: string | number;
  name: string;
}

interface BusinessHour {
  date: string; // "YYYY-MM-DD"
  is_holiday: boolean;
  open_time?: string; // "HH:mm:ss"
  close_time?: string; // "HH:mm:ss"
}

interface StaffShift {
  id: string;
  staff_id: string;
  date: string; // "YYYY-MM-DD"
  shift_status: string; // "出勤" or "休日"
  start_time?: string; // "HH:mm:ss"
  end_time?: string; // "HH:mm:ss"
  memo?: string;
}

// カレンダー表示用のプロップス
interface CalendarViewProps {
  reservations: CaldendarViewReservation[]; // 予約 or スタッフスケジュールの一覧
  staffList: Staff[]; // スタッフ一覧
  closedDays: string[]; // ※使用していない？（不要なら削除してOK）
  businessHours: BusinessHour[]; // サロン営業時間 + 休業日
  staffShifts: StaffShift[]; // スタッフシフト一覧
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

// フルカレンダーのイベント拡張用
interface CalendarEventProps extends CaldendarViewReservation {
  is_closed_day?: boolean;
  is_staff_holiday?: boolean; // スタッフ不在 or 休日
}

// 型ガード：staff_id があるか
function hasStaffId(
  reservation: CaldendarViewReservation
): reservation is CaldendarViewReservation & { staff_id: string | number } {
  return reservation.staff_id !== undefined && reservation.staff_id !== null;
}

// 型ガード：start_time/end_time が文字列か
function hasValidStartAndEnd(
  reservation: CaldendarViewReservation
): reservation is CaldendarViewReservation & {
  start_time: string;
  end_time: string;
} {
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

    // ----- 1) カレンダー最小/最大表示時間の決定 -----
    // 現在の日付（currentDate）でサロン営業時間を取得
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

    // ----- 2) FullCalendar resource（スタッフ一覧） -----
    const resources = staffList.map((staff) => ({
      id: staff.id.toString(),
      title: staff.name,
    }));

    // ---------------------------------------------------
    // 3) スタッフ休日イベント (shift_status = "休日" は終日不在)
    // ---------------------------------------------------
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

    // ---------------------------------------------------
    // 4) 部分的な不在時間をイベント化 (シフトがサロン営業時間より短い場合)
    // ---------------------------------------------------
    // シフトレコードで "出勤" となっているが、start_time, end_time が
    // サロン営業時間より狭い場合、その前後を「不在」イベントとする
    function createPartialHolidayEvents(shift: StaffShift): any[] {
      // まずサロンが営業しているかどうか
      const storeDayHours = businessHours.find(
        (bh) => bh.date === shift.date && !bh.is_holiday
      );
      if (!storeDayHours) {
        // サロン自体が休日 → スタッフ不在は別に作らない (サロン休業イベントが既にある)
        return [];
      }

      const storeOpen = storeDayHours.open_time || "00:00:00";
      const storeClose = storeDayHours.close_time || "23:59:59";

      // シフト開始/終了
      // ※ null や空文字の場合はサロン営業時間全て出勤扱いにする or 逆に不在扱いにするなど要件次第
      const staffStart = shift.start_time || storeOpen;
      const staffEnd = shift.end_time || storeClose;

      // partial holidayイベントを作る
      const events: any[] = [];

      // staffStart より前
      if (staffStart > storeOpen) {
        events.push({
          id: `partial-holiday-1-${shift.staff_id}-${shift.date}`,
          title: "スタッフ不在",
          start: `${shift.date}T${storeOpen}`,
          end: `${shift.date}T${staffStart}`,
          resourceId: shift.staff_id.toString(),
          classNames: ["staff-holiday"],
          editable: false,
          extendedProps: {
            is_staff_holiday: true,
          },
        });
      }

      // staffEnd より後
      if (staffEnd < storeClose) {
        events.push({
          id: `partial-holiday-2-${shift.staff_id}-${shift.date}`,
          title: "スタッフ不在",
          start: `${shift.date}T${staffEnd}`,
          end: `${shift.date}T${storeClose}`,
          resourceId: shift.staff_id.toString(),
          classNames: ["staff-holiday"],
          editable: false,
          extendedProps: {
            is_staff_holiday: true,
          },
        });
      }
      return events;
    }

    const partialHolidayEvents = staffShifts
      .filter((shift) => shift.shift_status === "出勤")
      .flatMap((shift) => createPartialHolidayEvents(shift));

    // ---------------------------------------------------
    // 5) シフトが無い日 = 終日不在 (サロンが営業している日だけ)
    // ---------------------------------------------------
    const noShiftHolidayEvents: any[] = [];
    for (const staff of staffList) {
      const staffId = staff.id.toString();
      const staffShiftsForThisStaff = staffShifts.filter(
        (s) => s.staff_id === staffId
      );

      // 営業日だけループ
      businessHours.forEach((bh) => {
        if (bh.is_holiday) return; // サロン休業ならスキップ
        const yyyymmdd = bh.date;
        // この日付のスタッフシフトがあるか?
        const shiftOfTheDay = staffShiftsForThisStaff.find(
          (s) => s.date === yyyymmdd
        );
        if (!shiftOfTheDay) {
          // シフト未登録 → 終日不在
          noShiftHolidayEvents.push({
            id: `staff-noshift-${staffId}-${yyyymmdd}`,
            title: "スタッフ不在（シフトなし）",
            start: `${yyyymmdd}T00:00:00`,
            end: `${yyyymmdd}T23:59:59`,
            resourceId: staffId,
            classNames: ["staff-holiday"],
            editable: false,
            extendedProps: {
              is_staff_holiday: true,
            },
          });
        }
      });
    }

    // まとめて「スタッフ休日/不在」イベント
    const allStaffHolidayEvents = [
      ...staffHolidayEvents, // shift_status = "休日"
      ...partialHolidayEvents, // 出勤時間外を不在に
      ...noShiftHolidayEvents, // シフトなしの日は終日不在
    ];

    // ---------------------------------------------------
    // 6) 通常の予約/スケジュール + サロン休業日 + スタッフ不在
    // ---------------------------------------------------
    // (A) 通常予約 or スタッフスケジュール
    const normalEvents = reservations
      .filter((r) => hasValidStartAndEnd(r) && hasStaffId(r))
      .map((r) => {
        let displayedTitle = "";
        if (r.is_staff_schedule) {
          // スタッフスケジュール
          displayedTitle = r.event || "";
        } else {
          // 通常予約
          const customerDisplay =
            r.customer_name || r.customer_name_kana || "Unknown";
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
          extendedProps: r,
        };
      });

    // (B) サロン休業日イベント
    const salonClosedEvents = businessHours
      .filter((bh) => bh.is_holiday)
      .map((bh) => ({
        id: `holiday-${bh.date}`,
        title: "サロン休業日",
        start: `${bh.date}T00:00:00`,
        end: `${bh.date}T23:59:59`,
        classNames: ["closed-day"],
        editable: false,
        // 全スタッフに対して休業
        resourceIds: resources.map((res) => res.id),
        extendedProps: {
          is_closed_day: true,
        },
      }));

    // 全イベント合体
    const events = [
      ...normalEvents,
      ...salonClosedEvents,
      ...allStaffHolidayEvents,
    ];

    // ---------------------------------------------------
    // 7) FullCalendar 設定
    // ---------------------------------------------------
    const plugins = [resourceTimelinePlugin, interactionPlugin, listPlugin];
    const initialView = "resourceTimelineDay";

    // businessHoursConfig：サロンの営業日時を FullCalendar の businessHours に設定
    const currentDayBH = businessHours.filter((bh) => !bh.is_holiday);
    const businessHoursConfig = currentDayBH.length
      ? currentDayBH.map((bh) => ({
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

    // 予約/ドラッグを許可するか判断する関数
    const isDateAllowed = (date: Date, resourceId?: string) => {
      const dateStr = moment(date).format("YYYY-MM-DD");
      // サロン休業日
      const isHoliday = businessHours.some(
        (bh) => bh.date === dateStr && bh.is_holiday
      );
      // スタッフ休日 (終日)
      const isStaffFullHoliday = staffShifts.some(
        (shift) =>
          shift.staff_id === resourceId &&
          shift.shift_status === "休日" &&
          shift.date === dateStr
      );
      // シフトなし日 → noShiftHolidayEvents で終日不在
      // ※ ここでさらに厳密に「時間内に partialHoliday が入っているか」チェックしてもOK
      //   ただし eventOverlap / selectOverlap でもブロックするので最低限でOK
      return !isHoliday && !isStaffFullHoliday;
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
          // サロン休業日
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
          // スタッフ不在/休日
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
          // イベント同士の重なりを許可するかどうか
          eventOverlap={(stillEvent, movingEvent) => {
            if (!movingEvent) return false;
            // どちらかがサロン休業 or スタッフ不在なら重なり不可
            const isOverlapAllowed =
              !stillEvent.extendedProps.is_closed_day &&
              !stillEvent.extendedProps.is_staff_holiday &&
              !movingEvent.extendedProps.is_closed_day &&
              !movingEvent.extendedProps.is_staff_holiday;
            return isOverlapAllowed;
          }}
          // 選択時に「サロン休業 or スタッフ不在」を除外
          selectOverlap={(event) => {
            return (
              !event.extendedProps.is_closed_day &&
              !event.extendedProps.is_staff_holiday
            );
          }}
          // ドラッグ選択を許可するかどうか
          selectAllow={(span: DateSpanApi) => {
            const resourceId = span.resource?.id;
            return isDateAllowed(span.start, resourceId);
          }}
          // イベントを移動/リサイズしていいかどうか
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
            // カスタムクラスの付与
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
            // スタッフ休日/不在
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

            // メニュー or クーポン名
            const menuOrCouponName = reservation.menu_id
              ? reservation.menu_name
              : reservation.coupon_id
              ? reservation.coupons?.name
              : reservation.scraped_menu || "";

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
