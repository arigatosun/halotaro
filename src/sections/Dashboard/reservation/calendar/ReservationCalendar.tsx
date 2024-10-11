// src/sections/Dashboard/reservation/calendar/ReservationCalendar.tsx

"use client";

import React, { useState, useRef, useEffect } from "react";
import { Box } from "@mui/material";
import moment from "moment";
import "moment/locale/ja";
import CalendarView from "./CalendarView";
import NavigationControls from "./NavigationControls";
import NotificationSnackbar from "./NotificationSnackbar";
import ReservationForm from "./ReservationForm";
import ReservationDetails from "./ReservationDetails";
import StaffScheduleForm from "./StaffScheduleForm";
import StaffScheduleDetails from "./StaffScheduleDetails";
import ReservationEditForm from "./ReservationEditForm";
import useReservationCalendar from "./useReservationCalendar";
import { EventClickArg, EventDropArg, DateSelectArg } from "@fullcalendar/core";
import { DateClickArg } from "@fullcalendar/interaction";
import { Reservation } from "@/types/reservation";
import { useAuth } from "@/contexts/authcontext";
import FullCalendar from "@fullcalendar/react";
// サーバーアクションのインポート
import {
  getCalendarData,
  createReservation,
  updateReservation,
  deleteReservation,
} from "@/app/actions/reservationCalendarActions";

moment.locale("ja"); // 日本語ロケールを設定

const ReservationCalendar: React.FC = () => {
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isNewReservation, setIsNewReservation] = useState(false);
  const [isStaffScheduleFormOpen, setIsStaffScheduleFormOpen] = useState(false);
  const [selectedStaffSchedule, setSelectedStaffSchedule] =
    useState<Reservation | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(moment());
  const [isCreatingFromButton, setIsCreatingFromButton] = useState(false);

  // useReservationCalendar を呼び出す
  const {
    reservations,
    staffList,
    menuList,
    closedDays,
    businessHours,
    loadData,
    setReservations,
    setStaffList,
    setMenuList,
    setClosedDays,
    setBusinessHours,
    setDateRange,
    snackbar,
    setSnackbar,
  } = useReservationCalendar();

  useEffect(() => {
    const today = moment();
    const startDate = today.startOf("day").format("YYYY-MM-DD");
    const endDate = today.endOf("day").format("YYYY-MM-DD"); // 1日分に変更
    setDateRange({ start: startDate, end: endDate });

    // データをロード
    loadData();
  }, []);

  const calendarRef = useRef<FullCalendar>(null);

  const { user, session } = useAuth();

  // 日付クリックハンドラ（予約追加）
  const handleDateClick = (dateClickInfo: DateClickArg) => {
    const { date, resource } = dateClickInfo;

    if (!resource) {
      setSnackbar({
        message: "スタッフを選択してください",
        severity: "error",
      });
      return;
    }

    const newReservation: Partial<Reservation> = {
      start_time: date.toISOString(),
      end_time: moment(date).add(1, "hours").toISOString(), // デフォルトの予約時間を1時間に設定
      staff_id: resource.id,
      is_staff_schedule: false,
    };

    setSelectedReservation(newReservation as Reservation);
    setIsNewReservation(true);
    setIsFormOpen(true);
    setIsCreatingFromButton(false);
  };

  // 日付選択ハンドラ（スタッフスケジュール追加）
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const { start, end, resource } = selectInfo;

    // 開始時間と終了時間が同じ場合は処理をスキップ
    if (start.getTime() == end.getTime()) {
      return;
    }

    if (!resource) {
      setSnackbar({
        message: "スタッフを選択してください",
        severity: "error",
      });
      return;
    }

    const newStaffSchedule: Partial<Reservation> = {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      staff_id: resource.id,
      is_staff_schedule: true,
    };

    setSelectedStaffSchedule(newStaffSchedule as Reservation);
    setIsStaffScheduleFormOpen(true);
  };

  // イベントクリックハンドラ
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventData = clickInfo.event.extendedProps as Reservation;
    if (eventData.is_staff_schedule) {
      setSelectedStaffSchedule(eventData);
    } else if (eventData.is_closed_day) {
      // 休業日イベントの場合は何もしない
      return;
    } else {
      setSelectedReservation(eventData);
      setIsNewReservation(false);
      setIsDetailsOpen(true);
    }
  };

  // 新規予約クリックハンドラ
  const handleAddReservation = () => {
    setSelectedReservation(null);
    setIsNewReservation(true);
    setIsFormOpen(true);
    setIsCreatingFromButton(true);
  };

  // 重複チェック関数
  const isSlotOverlapping = (
    start: Date | null,
    end: Date | null,
    staffId: string,
    excludeReservationId?: string
  ): boolean => {
    if (!start || !end) return false;

    return reservations.some((res) => {
      if (!res.staff_id || res.staff_id !== staffId) return false;
      if (excludeReservationId && res.id === excludeReservationId) return false;
      // キャンセルされた予約を除外
      const excludedStatuses = [
        "cancelled",
        "salon_cancelled",
        "same_day_cancelled",
        "no_show",
      ];
      if (res.status && excludedStatuses.includes(res.status)) return false;
      const resStart = moment.utc(res.start_time).local();
      const resEnd = moment.utc(res.end_time).local();
      const newStart = moment(start).local();
      const newEnd = moment(end).local();
      return newStart.isBefore(resEnd) && newEnd.isAfter(resStart);
    });
  };

  // イベントドロップハンドラ
  const handleEventDrop = async (dropInfo: EventDropArg) => {
    if (!user) return;

    const eventData = dropInfo.event.extendedProps as Reservation;
    const newStart = dropInfo.event.start;
    const newEnd = dropInfo.event.end;
    const staffId =
      dropInfo.newResource?.id || dropInfo.event.getResources()[0]?.id;
    const reservationId = eventData.id;

    // 重複チェック
    if (isSlotOverlapping(newStart, newEnd, staffId, reservationId)) {
      dropInfo.revert();
      setSnackbar({
        message: "この時間帯は既に予約が入っています",
        severity: "error",
      });
      return;
    }

    try {
      const updatedReservation = {
        ...eventData,
        start_time: newStart?.toISOString(),
        end_time: newEnd?.toISOString(),
        staff_id: staffId,
        user_id: user.id,
      };
      // サーバーアクションを呼び出す
      const response = await updateReservation(updatedReservation);
      await loadData();

      const message = eventData.is_staff_schedule
        ? "スタッフスケジュールが更新されました"
        : "予約が更新されました";

      setSnackbar({ message, severity: "success" });
    } catch (error) {
      const errorMessage = eventData.is_staff_schedule
        ? "スタッフスケジュールの更新に失敗しました"
        : "予約の更新に失敗しました";
      setSnackbar({ message: errorMessage, severity: "error" });
    }
  };

  // フォーム送信ハンドラ
  const handleFormSubmit = async (
    data: Partial<Reservation>,
    isNew: boolean
  ) => {
    if (!session || !user) {
      setSnackbar({
        message: "セッションが無効です。再度ログインしてください。",
        severity: "error",
      });
      return;
    }

    try {
      if (isNew) {
        // サーバーアクションを呼び出す
        await createReservation(data);
      } else {
        // サーバーアクションを呼び出す
        await updateReservation(data);
      }
      await loadData();
      setIsFormOpen(false);
      setSnackbar({
        message: `予約が${isNew ? "作成" : "更新"}されました`,
        severity: "success",
      });
    } catch (error: any) {
      console.error("handleFormSubmit エラー:", error);
      setSnackbar({
        message: `予約の${isNew ? "作成" : "更新"}に失敗しました`,
        severity: "error",
      });
    }
  };

  // 予約編集ハンドラ
  const handleEditFormSubmit = async (
    updatedReservation: Partial<Reservation>
  ) => {
    console.log("Calendar: Edit form submit received", updatedReservation);
    if (!session || !user) {
      console.log("Calendar: No session or user");
      setSnackbar({
        message: "セッションが無効です。再度ログインしてください。",
        severity: "error",
      });
      return;
    }

    try {
      console.log("Calendar: Sending update request");
      await updateReservation(updatedReservation);
      await loadData();

      setIsEditFormOpen(false);
      setSnackbar({
        message: "予約が更新されました",
        severity: "success",
      });
    } catch (error) {
      console.error("Calendar: Error in handleEditFormSubmit", error);
      setSnackbar({
        message: "予約の更新に失敗しました",
        severity: "error",
      });
    }
  };

  // 予約キャンセルハンドラ
  const handleCancelReservation = async (
    reservationId: string,
    cancellationType: string
  ) => {
    if (!session || !user) {
      setSnackbar({
        message: "セッションが無効です。再度ログインしてください。",
        severity: "error",
      });
      return;
    }

    try {
      // サーバーアクションを呼び出す
      const result = await deleteReservation(reservationId);

      if (result.success) {
        await loadData();
        setIsFormOpen(false);
        setIsDetailsOpen(false);
        setSnackbar({
          message: "予約がキャンセルされました",
          severity: "success",
        });
      } else {
        throw new Error("予約のキャンセルに失敗しました");
      }
    } catch (error) {
      console.error("Error in handleCancelReservation:", error);
      setSnackbar({
        message: "予約のキャンセルに失敗しました",
        severity: "error",
      });
    }
  };

  // 予約削除ハンドラ（キャンセル処理）
  const handleDeleteReservation = async (id: string) => {
    if (!session || !user) {
      setSnackbar({
        message: "セッションが無効です。再度ログインしてください。",
        severity: "error",
      });
      return;
    }

    try {
      // サーバーアクションを呼び出す
      const result = await deleteReservation(id);
      if (result.success) {
        await loadData();
        setIsFormOpen(false);
        setIsDetailsOpen(false);
        setSnackbar({
          message: "予約がキャンセルされました",
          severity: "success",
        });
      } else {
        throw new Error("予約のキャンセルに失敗しました");
      }
    } catch (error) {
      console.error("Error in handleDeleteReservation:", error);
      setSnackbar({
        message: "予約のキャンセルに失敗しました",
        severity: "error",
      });
    }
  };

  // スタッフスケジュール追加ボタンハンドラ
  const handleAddStaffSchedule = () => {
    setSelectedStaffSchedule(null);
    setIsStaffScheduleFormOpen(true);
  };

  // スタッフスケジュールフォーム送信ハンドラ
  const handleStaffScheduleFormSubmit = async (
    data: Partial<Reservation>,
    isNew: boolean
  ) => {
    if (!session || !user) {
      setSnackbar({
        message: "セッションが無効です。再度ログインしてください。",
        severity: "error",
      });
      return;
    }

    try {
      // サーバーアクションを呼び出す
      await createReservation({ ...data, is_staff_schedule: true });
      await loadData();
      setIsStaffScheduleFormOpen(false);
      setSelectedStaffSchedule(null);
      setSnackbar({
        message: `スタッフスケジュールが${isNew ? "作成" : "更新"}されました`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error in handleStaffScheduleFormSubmit:", error);
      setSnackbar({
        message: `スタッフスケジュールの${
          isNew ? "作成" : "更新"
        }に失敗しました`,
        severity: "error",
      });
    }
  };

  // スタッフスケジュール削除ハンドラ
  const handleDeleteStaffSchedule = async (id: string) => {
    if (!session || !user) {
      setSnackbar({
        message: "セッションが無効です。再度ログインしてください。",
        severity: "error",
      });
      return;
    }

    try {
      // サーバーアクションを呼び出す
      const result = await deleteReservation(id);
      if (result.success) {
        await loadData();
        setSelectedStaffSchedule(null);
        setIsStaffScheduleFormOpen(false);
        setSnackbar({
          message: "スタッフスケジュールが削除されました",
          severity: "success",
        });
      } else {
        throw new Error("スタッフスケジュールの削除に失敗しました");
      }
    } catch (error) {
      console.error("Error in handleDeleteStaffSchedule:", error);
      setSnackbar({
        message: "スタッフスケジュールの削除に失敗しました",
        severity: "error",
      });
    }
  };

  // 予約編集ハンドラ
  const handleEditReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsEditFormOpen(true);
    setIsDetailsOpen(false);
  };

  // 日付ナビゲーションハンドラ
  const handlePrevDay = () => {
    const newDate = moment(currentDate).subtract(1, "day");
    setCurrentDate(newDate);
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.prev();
    }
  };

  const handleNextDay = () => {
    const newDate = moment(currentDate).add(1, "day");
    setCurrentDate(newDate);
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.next();
    }
  };

  const handleToday = () => {
    const today = moment();
    setCurrentDate(today);
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.today();
    }
  };

  // カレンダーの日付レンダリング時に休業日をマークする
  const handleDatesSet = (arg: any) => {
    const calendarApi = arg.view.calendar;

    // 表示範囲の開始日と終了日を取得
    const startDate = moment(arg.start).format("YYYY-MM-DD");
    const endDate = moment(arg.end).subtract(1, "days").format("YYYY-MM-DD"); // FullCalendar の end は翌日を指すため

    // dateRange を更新
    setDateRange({ start: startDate, end: endDate });

    // currentDate を更新
    setCurrentDate(moment(arg.start));

    // 具体的な日付に基づいて休業日をマーク
    if (closedDays && closedDays.length > 0) {
      closedDays.forEach((dateStr: string) => {
        calendarApi.addEvent({
          title: "休業日",
          start: dateStr,
          end: moment(dateStr).add(1, "day").format("YYYY-MM-DD"),
          allDay: true,
          display: "background",
          classNames: ["closed-day"],
          overlap: false,
        });
      });
    }
  };

  if (!staffList.length || !businessHours.length) {
    return <div>データを読み込んでいます...</div>;
  }

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default" }}>
      {/* ナビゲーションセクション */}
      <NavigationControls
        currentDate={currentDate}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        onToday={handleToday}
        onAddReservation={handleAddReservation}
        onAddStaffSchedule={handleAddStaffSchedule}
      />

      {/* カレンダーセクション */}
      <CalendarView
        key={currentDate.format("YYYY-MM-DD")}
        reservations={reservations}
        staffList={staffList}
        closedDays={closedDays}
        businessHours={businessHours}
        onDateClick={handleDateClick} // この行を追加
        onDateSelect={handleDateSelect}
        onEventClick={handleEventClick}
        onEventDrop={handleEventDrop}
        handleDatesSet={handleDatesSet}
        ref={calendarRef}
        currentDate={currentDate}
      />

      {/* 予約フォームモーダル */}
      {isFormOpen && (
        <ReservationForm
          reservation={selectedReservation}
          isNew={isNewReservation}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          onDelete={handleDeleteReservation}
          staffList={staffList}
          menuList={menuList}
          reservations={reservations} // 既存の予約データを渡す
          hideReservationType={isCreatingFromButton} // 新規予約時に予約タイプを非表示
          isCreatingFromButton={isCreatingFromButton}
          businessHours={businessHours}
        />
      )}

      {/* スタッフスケジュールフォームモーダル */}
      {isStaffScheduleFormOpen && (
        <StaffScheduleForm
          staffSchedule={selectedStaffSchedule}
          isNew={!selectedStaffSchedule}
          onClose={() => {
            setIsStaffScheduleFormOpen(false);
            setSelectedStaffSchedule(null);
          }}
          onSubmit={handleStaffScheduleFormSubmit}
          onDelete={handleDeleteStaffSchedule}
          staffList={staffList}
        />
      )}

      {/* スタッフスケジュール詳細モーダル */}
      {selectedStaffSchedule && !isStaffScheduleFormOpen && (
        <StaffScheduleDetails
          staffSchedule={selectedStaffSchedule}
          onClose={() => setSelectedStaffSchedule(null)}
          onEdit={() => {
            setIsStaffScheduleFormOpen(true);
          }}
        />
      )}

      {/* 予約詳細モーダル */}
      {isDetailsOpen && selectedReservation && (
        <ReservationDetails
          reservation={selectedReservation}
          onClose={() => setIsDetailsOpen(false)}
          onEdit={() => handleEditReservation(selectedReservation)}
          onCancel={handleCancelReservation}
        />
      )}

      {/* 予約編集フォームモーダル */}
      {isEditFormOpen && selectedReservation && (
        <ReservationEditForm
          reservation={selectedReservation}
          onClose={() => setIsEditFormOpen(false)}
          onSubmit={handleEditFormSubmit}
          onDelete={handleDeleteReservation}
          staffList={staffList}
          menuList={menuList}
          reservations={reservations}
          businessHours={businessHours}
        />
      )}

      {/* スナックバー */}
      <NotificationSnackbar
        snackbar={snackbar}
        onClose={() => setSnackbar(null)}
      />
    </Box>
  );
};

export default ReservationCalendar;
