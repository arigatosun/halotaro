// ReservationCalendar.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from "@mui/material";
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
import { Reservation, Staff } from "@/types/reservation";
import { useAuth } from "@/contexts/authcontext";
import FullCalendar from "@fullcalendar/react";
import { useMediaQuery } from "react-responsive";

moment.locale("ja");

const ReservationCalendar: React.FC = () => {
  const [isNewStaffSchedule, setIsNewStaffSchedule] = useState(false);
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
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");

  const isMobile = useMediaQuery({ maxWidth: 767 });

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
    dateRange,
    setDateRange,
    snackbar,
    setSnackbar,
  } = useReservationCalendar();

  useEffect(() => {
    const today = moment();
    const startDate = today.startOf("day").format("YYYY-MM-DD");
    const endDate = today.endOf("day").format("YYYY-MM-DD");
    setDateRange({ start: startDate, end: endDate });
  }, [setDateRange]);

  const calendarRef = useRef<FullCalendar>(null);

  const { user, session } = useAuth();

  const handleStaffChange = (event: SelectChangeEvent<string>) => {
    setSelectedStaffId(event.target.value as string);
  };

  const filteredReservations = reservations.filter((reservation) => {
    if (selectedStaffId === "all") {
      return true;
    }
    return reservation.staff_id === selectedStaffId;
  });

  // スタッフリストのソート処理を追加
  const sortedStaffList = useMemo(() => {
    return [...staffList].sort((a, b) => {
      if (a.name === "フリー") return 1;
      if (b.name === "フリー") return -1;
      return a.schedule_order - b.schedule_order;
    });
  }, [staffList]);

  const filteredStaffList =
    selectedStaffId === "all"
      ? sortedStaffList
      : sortedStaffList.filter((staff) => staff.id === selectedStaffId);

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
      end_time: moment(date).add(1, "hours").toISOString(),
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

    // 開始時間と終了時間の差を計算（ミリ秒単位）
    const duration = end.getTime() - start.getTime();

    // 1分未満の場合は処理をスキップ
    if (duration < 60000) {
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
    setIsNewStaffSchedule(true);
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
    excludeReservationId?: string,
    isStaffSchedule?: boolean
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

      // スタッフスケジュールを移動する場合、他のスタッフスケジュールとの重複は無視
      if (isStaffSchedule && res.is_staff_schedule) return false;
      // 通常の予約を移動する場合、スタッフスケジュールとの重複を無視するかどうか
      if (!isStaffSchedule && res.is_staff_schedule) return false;

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
    const isStaffSchedule = eventData.is_staff_schedule;
    const newStart = dropInfo.event.start;
    const newEnd = dropInfo.event.end;
    const staffId =
      dropInfo.newResource?.id || dropInfo.event.getResources()[0]?.id;
    const reservationId = eventData.id;

    // 重複チェック
    if (
      isSlotOverlapping(
        newStart,
        newEnd,
        staffId,
        reservationId,
        isStaffSchedule
      )
    ) {
      dropInfo.revert();
      setSnackbar({
        message: "この時間帯は既に予約が入っています",
        severity: "error",
      });
      return;
    }

    try {
      // 更新データの準備
      const updatedReservation = {
        id: eventData.id,
        start_time: newStart?.toISOString(),
        end_time: newEnd?.toISOString(),
        staff_id: staffId,
        user_id: user.id,
        // 以下の重要なフィールドを保持
        menu_id: eventData.menu_id,
        customer_name: eventData.customer_name,
        customer_email: eventData.customer_email,
        customer_phone: eventData.customer_phone,
        customer_name_kana: eventData.customer_name_kana,
        total_price: eventData.total_price,
        status: eventData.status,
        is_staff_schedule: eventData.is_staff_schedule,
        event: eventData.event,
        is_hair_sync: eventData.is_hair_sync,
      };

      // APIリクエスト
      const response = await fetch("/api/calendar-data", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(updatedReservation),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update reservation");
      }

      const updatedData = await response.json();

      // ローカルの予約データを更新
      setReservations((prevReservations) =>
        prevReservations.map((res) =>
          res.id === updatedData.id ? { ...res, ...updatedData } : res
        )
      );

      const message = eventData.is_staff_schedule
        ? "スタッフスケジュールが更新されました"
        : "予約が更新されました";

      setSnackbar({ message, severity: "success" });
    } catch (error) {
      console.error("Error in handleEventDrop:", error);
      dropInfo.revert(); // エラー時は元の位置に戻す
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
      const method = isNew ? "POST" : "PUT";
      const reservationData = {
        ...data,
        user_id: user.id,
      };

      console.log("Sending reservation data:", reservationData);

      const response = await fetch("/api/calendar-data", {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(reservationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error:", errorData);
        throw new Error(
          `Failed to ${isNew ? "create" : "update"} reservation`
        );
      }

      const newReservation = await response.json();

      // ローカルの予約データを更新
      setReservations((prevReservations) =>
        isNew
          ? [...prevReservations, newReservation]
          : prevReservations.map((res) =>
              res.id === newReservation.id ? { ...res, ...newReservation } : res
            )
      );

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
      const response = await fetch("/api/calendar-data", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updatedReservation),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Calendar: API error", errorData);
        throw new Error("予約の更新に失敗しました");
      }

      const updatedData = await response.json();
      console.log("Calendar: 更新成功", updatedData);

      // ローカルの予約データを更新
      setReservations((prevReservations) =>
        prevReservations.map((res) =>
          res.id === updatedData.id ? { ...res, ...updatedData } : res
        )
      );

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
      const response = await fetch(`/api/calendar-data?id=${reservationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error cancelling reservation:", errorData);
        throw new Error("予約のキャンセルに失敗しました");
      }

      const data = await response.json();

      if (data.success) {
        // ローカルの予約データを更新
        setReservations((prevReservations) =>
          prevReservations.filter((res) => res.id !== reservationId)
        );
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
      // キャンセルAPIを呼び出す
      const response = await fetch("/api/cancel-reservation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reservationId: id,
          cancellationType: "cancelled",
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error cancelling reservation:", errorData);
        throw new Error("予約のキャンセルに失敗しました");
      }

      // ローカルの予約データを更新
      setReservations((prevReservations) =>
        prevReservations.filter((res) => res.id !== id)
      );

      setIsFormOpen(false);
      setIsDetailsOpen(false);
      setSnackbar({
        message: "予約がキャンセルされました",
        severity: "success",
      });
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
    setIsNewStaffSchedule(true);
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
      const method = isNew ? "POST" : "PUT";
      const scheduleData = {
        ...data,
        user_id: user.id,
        is_staff_schedule: true,
        total_price: 0,
      };
      console.log("Sending staff schedule data:", scheduleData);

      const response = await fetch("/api/calendar-data", {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error:", errorData);
        throw new Error(
          `Failed to ${isNew ? "create" : "update"} staff schedule`
        );
      }

      const newSchedule = await response.json();

      // ローカルの予約データを更新
      setReservations((prevReservations) =>
        isNew
          ? [...prevReservations, newSchedule]
          : prevReservations.map((res) =>
              res.id === newSchedule.id ? { ...res, ...newSchedule } : res
            )
      );

      setIsStaffScheduleFormOpen(false);
      setSelectedStaffSchedule(null);
      setIsNewStaffSchedule(false);
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
      const response = await fetch(`/api/calendar-data?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error deleting staff schedule:", errorData);
        throw new Error("スタッフスケジュールの削除に失敗しました");
      }

      // ローカルの予約データを更新
      setReservations((prevReservations) =>
        prevReservations.filter((res) => res.id !== id)
      );

      setSelectedStaffSchedule(null);
      setIsStaffScheduleFormOpen(false);
      setSnackbar({
        message: "スタッフスケジュールが削除されました",
        severity: "success",
      });
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

  // handleDatesSet関数を修正
  const handleDatesSet = useCallback(
    (arg: any) => {
      // 表示範囲の開始日と終了日を取得
      const startDate = moment(arg.start).format("YYYY-MM-DD");
      const endDate = moment(arg.end)
        .subtract(1, "days")
        .format("YYYY-MM-DD");

      // dateRange を更新 (値が変わった場合のみ)
      if (
        !dateRange ||
        dateRange.start !== startDate ||
        dateRange.end !== endDate
      ) {
        setDateRange({ start: startDate, end: endDate });
      }

      // currentDate を更新 (値が変わった場合のみ)
      const newCurrentDate = moment(arg.start);
      if (!newCurrentDate.isSame(currentDate, "day")) {
        setCurrentDate(newCurrentDate);
      }
    },
    [dateRange, setDateRange, currentDate, setCurrentDate]
  );

  if (!staffList.length || !businessHours.length) {
    return <div>データを読み込んでいます...</div>;
  }

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default" }}>
      {isMobile && (
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="staff-select-label">スタッフ選択</InputLabel>
            <Select
              labelId="staff-select-label"
              value={selectedStaffId}
              onChange={handleStaffChange}
              label="スタッフ選択"
            >
              <MenuItem value="all">全スタッフ</MenuItem>
              {sortedStaffList.map((staff) => (
                <MenuItem key={staff.id} value={staff.id}>
                  {staff.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      <NavigationControls
        currentDate={currentDate}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        onToday={handleToday}
        onAddReservation={handleAddReservation}
        onAddStaffSchedule={handleAddStaffSchedule}
      />

      <CalendarView
        key={`${currentDate.format("YYYY-MM-DD")}-${selectedStaffId}`}
        reservations={filteredReservations}
        staffList={filteredStaffList}
        closedDays={closedDays}
        businessHours={businessHours}
        onDateClick={handleDateClick}
        onDateSelect={handleDateSelect}
        onEventClick={handleEventClick}
        onEventDrop={handleEventDrop}
        handleDatesSet={handleDatesSet}
        ref={calendarRef}
        currentDate={currentDate}
        isMobile={isMobile}
      />

      {/* 予約フォームモーダル */}
      {isFormOpen && (
        <ReservationForm
          reservation={selectedReservation}
          isNew={isNewReservation}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          onDelete={handleDeleteReservation}
          staffList={sortedStaffList}
          menuList={menuList}
          reservations={reservations}
          hideReservationType={isCreatingFromButton}
          isCreatingFromButton={isCreatingFromButton}
          businessHours={businessHours}
        />
      )}

      {/* スタッフスケジュールフォームモーダル */}
      {isStaffScheduleFormOpen && (
        <StaffScheduleForm
          staffSchedule={selectedStaffSchedule}
          isNew={isNewStaffSchedule}
          onClose={() => {
            setIsStaffScheduleFormOpen(false);
            setSelectedStaffSchedule(null);
            setIsNewStaffSchedule(false);
          }}
          onSubmit={handleStaffScheduleFormSubmit}
          onDelete={handleDeleteStaffSchedule}
          staffList={sortedStaffList}
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
          staffList={sortedStaffList}
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
