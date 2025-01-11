// ReservationCalendar.tsx
"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  CircularProgress,
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
import { Reservation } from "@/types/reservation";
import { useAuth } from "@/contexts/authcontext";
import FullCalendar from "@fullcalendar/react";
import { useMediaQuery } from "react-responsive";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";

moment.locale("ja");

const ReservationCalendar: React.FC = () => {
  // ------------------------------------
  // ローカル状態管理
  // ------------------------------------
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
  const [isUpdating, setIsUpdating] = useState(false); // 更新中表示用

  // 画面幅が767px以下をモバイル扱い
  const isMobile = useMediaQuery({ maxWidth: 767 });

  // ------------------------------------
  // カスタムフック等
  // ------------------------------------
  const {
    reservations,
    staffList,
    menuList,
    closedDays,
    businessHours,
    staffShifts,
    loadData,
    setReservations,
    dateRange,
    setDateRange,
    snackbar,
    setSnackbar,
    isLoading,
  } = useReservationCalendar();

  // ------------------------------------
  // カレンダー参照
  // ------------------------------------
  const calendarRef = useRef<FullCalendar>(null);

  // ------------------------------------
  // ログインユーザー情報
  // ------------------------------------
  const { user, session } = useAuth();

  // ------------------------------------
  // 初期ロード
  // ------------------------------------
  useEffect(() => {
    const today = moment();
    const startDate = today.startOf("day").format("YYYY-MM-DD");
    const endDate = today.endOf("day").format("YYYY-MM-DD");
    setDateRange({ start: startDate, end: endDate });
  }, [setDateRange]);

  // ------------------------------------
  // スタッフ選択
  // ------------------------------------
  const handleStaffChange = (event: SelectChangeEvent<string>) => {
    setSelectedStaffId(event.target.value as string);
  };

  // ------------------------------------
  // 日付変更 (DatePickerなどから)
  // ------------------------------------
  const handleDateChange = (date: moment.Moment | null) => {
    if (date) {
      setCurrentDate(date);
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.gotoDate(date.toDate());
      }
    }
  };

  // ------------------------------------
  // フィルタされた予約一覧
  // ------------------------------------
  const filteredReservations = reservations.filter((reservation) => {
    if (selectedStaffId === "all") {
      return true;
    }
    return reservation.staff_id === selectedStaffId;
  });

  // ------------------------------------
  // スタッフ一覧ソート（例: フリーを最後に）
  // ------------------------------------
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

  // ------------------------------------
  // 日付クリックハンドラ (予約追加)
  // ------------------------------------
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

  // ------------------------------------
  // 日付ドラッグ選択 (スタッフスケジュール追加)
  // ------------------------------------
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const { start, end, resource } = selectInfo;
    const slotDurationMs = 30 * 60 * 1000; // 30分
    const duration = end.getTime() - start.getTime();
    if (duration > slotDurationMs) {
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
    }
  };

  // ------------------------------------
  // イベントクリック
  // ------------------------------------
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventData = clickInfo.event.extendedProps as Reservation;
    if (eventData.is_staff_schedule) {
      setSelectedStaffSchedule(eventData);
    } else if (eventData.is_closed_day) {
      // 休業日は何もしない
      return;
    } else {
      setSelectedReservation(eventData);
      setIsNewReservation(false);
      setIsDetailsOpen(true);
    }
  };

  // ------------------------------------
  // 新規予約ボタン
  // ------------------------------------
  const handleAddReservation = () => {
    setSelectedReservation(null);
    setIsNewReservation(true);
    setIsFormOpen(true);
    setIsCreatingFromButton(true);
  };

  // ------------------------------------
  // スタッフスケジュール追加ボタン
  // ------------------------------------
  const handleAddStaffSchedule = () => {
    setSelectedStaffSchedule(null);
    setIsNewStaffSchedule(true);
    setIsStaffScheduleFormOpen(true);
  };

  // ------------------------------------
  // イベントのドラッグ＆ドロップ
  // ------------------------------------
  const handleEventDrop = async (dropInfo: EventDropArg) => {
    if (!user) return;
    setIsUpdating(true);

    try {
      const eventData = dropInfo.event.extendedProps as Reservation;
      const newStart = dropInfo.event.start;
      const newEnd = dropInfo.event.end;
      const staffId =
        dropInfo.newResource?.id || dropInfo.event.getResources()[0]?.id;

      const updatedReservation = {
        id: eventData.id,
        start_time: newStart?.toISOString(),
        end_time: newEnd?.toISOString(),
        staff_id: staffId,
        user_id: user.id,
      };

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
        throw new Error(errorData.error || "Failed to update reservation");
      }

      const updatedData = await response.json();
      setReservations((prev) => {
        const idx = prev.findIndex((r) => r.id === updatedData.id);
        if (idx !== -1) {
          const newList = [...prev];
          newList[idx] = updatedData;
          return newList;
        }
        return prev;
      });

      const message = eventData.is_staff_schedule
        ? "スタッフスケジュールが更新されました"
        : "予約が更新されました";
      setSnackbar({ message, severity: "success" });
    } catch (error) {
      console.error("Error in handleEventDrop:", error);
      dropInfo.revert();
      setSnackbar({
        message: "更新に失敗しました",
        severity: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // ------------------------------------
  // 予約フォーム送信 (新規/更新)
  // ------------------------------------
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

      const response = await fetch("/api/calendar-data", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(reservationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to ${isNew ? "create" : "update"} reservation: ${
            errorData.error
          }`
        );
      }

      const newReservation = await response.json();
      setReservations((prev) =>
        isNew
          ? [...prev, newReservation]
          : prev.map((res) =>
              res.id === newReservation.id ? { ...res, ...newReservation } : res
            )
      );

      setIsFormOpen(false);
      setSnackbar({
        message: `予約が${isNew ? "作成" : "更新"}されました`,
        severity: "success",
      });

      // もし新規作成時だけ自動同期処理を呼ぶならここに
      // if (isNew) { await sendReservationToAutomation(newReservation); }
    } catch (error) {
      console.error("handleFormSubmit エラー:", error);
      setSnackbar({
        message: `予約の${isNew ? "作成" : "更新"}に失敗しました`,
        severity: "error",
      });
    }
  };

  // ------------------------------------
  // 予約編集フォーム送信
  // ------------------------------------
  const handleEditFormSubmit = async (
    updatedReservation: Partial<Reservation>
  ) => {
    if (!session || !user) {
      setSnackbar({
        message: "セッションが無効です。再度ログインしてください。",
        severity: "error",
      });
      return;
    }
    try {
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
        throw new Error("予約の更新に失敗しました: " + errorData.error);
      }

      const updatedData = await response.json();
      setReservations((prev) =>
        prev.map((res) =>
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

  // ------------------------------------
  // 予約削除 (キャンセル)
  // ------------------------------------
  const handleCancelReservation = async (
    reservationId: string,
    type: string
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
        throw new Error("予約のキャンセルに失敗しました: " + errorData.error);
      }

      const data = await response.json();
      if (data.success) {
        setReservations((prev) =>
          prev.filter((res) => res.id !== reservationId)
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

  // ------------------------------------
  // 予約削除 (キャンセル) - EditForm用
  // ------------------------------------
  const handleDeleteReservation = async (id: string, type: string) => {
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
        throw new Error("予約のキャンセルに失敗しました: " + errorData.error);
      }

      const data = await response.json();
      if (data.success) {
        setReservations((prev) => prev.filter((res) => res.id !== id));
        setIsFormOpen(false);
        setIsDetailsOpen(false);
        setIsEditFormOpen(false);
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

  // ------------------------------------
  // スタッフスケジュール追加フォーム送信
  // ------------------------------------
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

      const response = await fetch("/api/calendar-data", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `スタッフスケジュールの${isNew ? "作成" : "更新"}に失敗しました: ${
            errorData.error
          }`
        );
      }

      const newSchedule = await response.json();
      setReservations((prev) =>
        isNew
          ? [...prev, newSchedule]
          : prev.map((res) =>
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

      // 新規作成時のみ自動同期などしたい場合はここ
      // if (isNew) { await sendStaffScheduleToAutomation(newSchedule); }
    } catch (error) {
      console.error("handleStaffScheduleFormSubmitエラー:", error);
      setSnackbar({
        message: `スタッフスケジュールの${
          isNew ? "作成" : "更新"
        }に失敗しました`,
        severity: "error",
      });
    }
  };

  // ------------------------------------
  // スタッフスケジュール削除
  // ------------------------------------
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
        throw new Error(
          "スタッフスケジュールの削除に失敗しました: " + errorData.error
        );
      }
      setReservations((prev) => prev.filter((res) => res.id !== id));
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

  // ------------------------------------
  // 予約詳細 → 編集
  // ------------------------------------
  const handleEditReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsEditFormOpen(true);
    setIsDetailsOpen(false);
  };

  // ------------------------------------
  // 日付ナビゲーション
  // ------------------------------------
  const handlePrevDay = () => {
    const newDate = moment(currentDate).subtract(1, "day");
    setCurrentDate(newDate);
    if (calendarRef.current) {
      calendarRef.current.getApi().prev();
    }
  };

  const handleNextDay = () => {
    const newDate = moment(currentDate).add(1, "day");
    setCurrentDate(newDate);
    if (calendarRef.current) {
      calendarRef.current.getApi().next();
    }
  };

  const handleToday = () => {
    const today = moment();
    setCurrentDate(today);
    if (calendarRef.current) {
      calendarRef.current.getApi().today();
    }
  };

  // ------------------------------------
  // カレンダー表示範囲変更
  // ------------------------------------
  const handleDatesSet = useCallback(
    (arg: any) => {
      const startDate = moment(arg.start).format("YYYY-MM-DD");
      const endDate = moment(arg.end).subtract(1, "days").format("YYYY-MM-DD");

      if (
        !dateRange ||
        dateRange.start !== startDate ||
        dateRange.end !== endDate
      ) {
        setDateRange({ start: startDate, end: endDate });
      }

      const newCurrentDate = moment(arg.start);
      if (!newCurrentDate.isSame(currentDate, "day")) {
        setCurrentDate(newCurrentDate);
      }
    },
    [dateRange, setDateRange, currentDate, setCurrentDate]
  );

  // ------------------------------------
  // ローディング画面
  // ------------------------------------
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // ------------------------------------
  // スタッフや営業時間がまだない場合
  // ------------------------------------
  if (!staffList.length || !businessHours.length) {
    return <div>データを読み込んでいます...</div>;
  }

  // ------------------------------------
  // 表示
  // ------------------------------------
  return (
    // ★ 親要素は横スクロールを抑制
    <Box
      sx={{
        p: 3,
        backgroundColor: "background.default",
        width: "100%",
        overflowX: "hidden", // 全体は横スクロールしない
      }}
    >
      {/* 更新中のオーバーレイ */}
      {isUpdating && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* 日付ナビゲーション + ボタン */}
      <NavigationControls
        currentDate={currentDate}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        onToday={handleToday}
        onAddReservation={handleAddReservation}
        onAddStaffSchedule={handleAddStaffSchedule}
        onDateChange={handleDateChange}
      />

      {/* カレンダー部分のみ横スクロール */}
      <Box sx={{ overflowX: "auto" }}>
        <CalendarView
          reservations={filteredReservations}
          staffList={filteredStaffList}
          closedDays={closedDays}
          businessHours={businessHours}
          staffShifts={staffShifts}
          onDateClick={handleDateClick}
          onDateSelect={handleDateSelect}
          onEventClick={handleEventClick}
          onEventDrop={handleEventDrop}
          handleDatesSet={handleDatesSet}
          ref={calendarRef}
          currentDate={currentDate}
          isMobile={isMobile}
          isUpdating={isUpdating}
        />
      </Box>

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
