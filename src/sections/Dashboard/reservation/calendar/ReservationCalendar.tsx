// ReservationCalendar.tsx
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
  CircularProgress, // 追加
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
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'; // 追加
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'; // 追加

moment.locale("ja");

const ReservationCalendar: React.FC = () => {
  const [isNewStaffSchedule, setIsNewStaffSchedule] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isNewReservation, setIsNewReservation] = useState(false);
  const [isStaffScheduleFormOpen, setIsStaffScheduleFormOpen] = useState(false);
  const [selectedStaffSchedule, setSelectedStaffSchedule] = useState<Reservation | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(moment());
  const [isCreatingFromButton, setIsCreatingFromButton] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");
  const [isUpdating, setIsUpdating] = useState(false); // 更新中かどうかの状態を追加

  const isMobile = useMediaQuery({ maxWidth: 767 });

  // 日付変更ハンドラを追加
  const handleDateChange = (date: moment.Moment | null) => {
    if (date) {
      setCurrentDate(date);
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.gotoDate(date.toDate());
      }
    }
  };

  

  const {
    reservations,
    staffList,
    menuList,
    closedDays,
    businessHours,
    loadData,
    setReservations,
    dateRange,
    setDateRange,
    snackbar,
    setSnackbar,
    isLoading, // ローディング状態を取得
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
    // 現在表示中の予約情報をフィルタリングして渡す
    const currentDateStr = currentDate.format('YYYY-MM-DD');
    const relevantReservations = reservations.filter(res => {
      const resDate = moment(res.start_time).format('YYYY-MM-DD');
      return resDate === currentDateStr;
    });
  
    setSelectedReservation(null);
    setIsNewReservation(true);
    setIsFormOpen(true);
    setIsCreatingFromButton(true);
  };

  // イベントドロップハンドラ
  const handleEventDrop = async (dropInfo: EventDropArg) => {
    if (!user) return;

    setIsUpdating(true); // 更新開始

    const eventData = dropInfo.event.extendedProps as Reservation;
    const newStart = dropInfo.event.start;
    const newEnd = dropInfo.event.end;
    const staffId = dropInfo.newResource?.id || dropInfo.event.getResources()[0]?.id;

    try {
      // 更新データの準備
      const updatedReservation = {
        id: eventData.id,
        start_time: newStart?.toISOString(),
        end_time: newEnd?.toISOString(),
        staff_id: staffId,
        user_id: user.id,
        // 必要なフィールドのみを送信
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
        throw new Error(errorData.error || "Failed to update reservation");
      }

      const updatedData = await response.json();

      // ローカルの予約データを更新
      setReservations((prevReservations) => {
        const index = prevReservations.findIndex((res) => res.id === updatedData.id);
        if (index !== -1) {
          const newReservations = [...prevReservations];
          newReservations[index] = updatedData;
          return newReservations;
        }
        return prevReservations;
      });

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
    } finally {
      setIsUpdating(false); // 更新終了
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

      // ★ 新規予約の場合のみ同期処理を行う
      if (isNew) {
        await sendReservationToAutomation(newReservation);
      }
    } catch (error: any) {
      console.error("handleFormSubmit エラー:", error);
      setSnackbar({
        message: `予約の${isNew ? "作成" : "更新"}に失敗しました`,
        severity: "error",
      });
    }
  };

  // ★ sendReservationToAutomation 関数の追加
  const sendReservationToAutomation = async (reservation: Reservation) => {
    try {
      if (!reservation.start_time || !reservation.end_time) {
        throw new Error("予約の開始時間または終了時間が不明です");
      }
  
      const startTime = new Date(reservation.start_time);
      const endTime = new Date(reservation.end_time);
  
      const duration = (endTime.getTime() - startTime.getTime()) / 1000 / 60; // 分単位
  
      const rsvTermHour = Math.floor(duration / 60).toString();
      const rsvTermMinute = (duration % 60).toString();
  
      const [lastNameKanji, firstNameKanji] = reservation.customer_name
        ? reservation.customer_name.split(" ")
        : ["", ""];
      const [lastNameKana, firstNameKana] = reservation.customer_name_kana
        ? reservation.customer_name_kana.split(" ")
        : ["", ""];
  
      const automationData = {
        user_id: user?.id ?? '',
        date: formatDate(startTime),
        rsv_hour: startTime.getHours().toString(),
        rsv_minute: String(startTime.getMinutes()).padStart(2, "0"),
        staff_name: reservation.staff_name || "",
        nm_sei_kana: lastNameKana || "",
        nm_mei_kana: firstNameKana || "",
        nm_sei: lastNameKanji || "",
        nm_mei: firstNameKanji || "",
        rsv_term_hour: rsvTermHour,
        rsv_term_minute: rsvTermMinute,
        is_no_appointment: false
      };
  
      const FASTAPI_ENDPOINT = "https://1234-34-97-99-223.ngrok-free.app/run-automation";
  
      const automationResponse = await fetch(FASTAPI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(automationData),
      });
  
      if (!automationResponse.ok) {
        let errorMessage;
        try {
          const errorData = await automationResponse.json();
          // Form submission failed with errors: の部分を削除
          errorMessage = errorData.detail || errorData.message || '';
          if (errorMessage.startsWith('Form submission failed with errors:')) {
            errorMessage = errorMessage.replace('Form submission failed with errors:', '').trim();
          }
          if (!errorMessage) {
            errorMessage = '予約の同期中に不明なエラーが発生しました';
          }
        } catch (e) {
          errorMessage = '予約の同期処理に失敗しました';
        }
        throw new Error(errorMessage);
      }
  
    } catch (error) {
      console.error("Error in sendReservationToAutomation:", error);
      
      try {
        // エラーメッセージを整形
        const errorMessage = error instanceof Error 
          ? error.message.replace('Form submission failed with errors:', '').trim()
          : '予約同期中に不明なエラーが発生しました';
  
        const response = await fetch('/api/send-sync-error', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user?.id,
            reservation,
            errorMessage: errorMessage
          }),
        });
  
        if (!response.ok) {
          console.error('エラー通知メールの送信に失敗しました:', await response.text());
        }
      } catch (emailError) {
        console.error('エラー通知メールの送信に失敗しました:', emailError);
      }
    }
  };

  // ★ formatDate 関数の追加
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
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
  const handleDeleteReservation = async (id: string, cancellationType: string) => {
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
        console.error("Error cancelling reservation:", errorData);
        throw new Error("予約のキャンセルに失敗しました");
      }

      const data = await response.json();

      if (data.success) {
        // ローカルの予約データを更新
        setReservations((prevReservations) =>
          prevReservations.filter((res) => res.id !== id)
        );
        setIsFormOpen(false);
        setIsDetailsOpen(false);
        setIsEditFormOpen(false); // 編集フォームも閉じる
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

  // ローディング状態に応じて表示を切り替え
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!staffList.length || !businessHours.length) {
    return <div>データを読み込んでいます...</div>;
  }

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default" }}>
      {isUpdating && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <CircularProgress />
        </Box>
      )}
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
        onDateChange={handleDateChange} // 追加
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
        isUpdating={isUpdating} // 追加
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