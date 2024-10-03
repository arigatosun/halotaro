// src/sections/Dashboard/reservation/calendar/ReservationCalendar.tsx

"use client";

import React, { useState, useRef } from 'react';
import { Box } from '@mui/material';
import moment from 'moment';
import 'moment/locale/ja';
import CalendarView from './CalendarView';
import NavigationControls from './NavigationControls';
import NotificationSnackbar from './NotificationSnackbar';
import ReservationForm from './ReservationForm';
import ReservationDetails from './ReservationDetails';
import StaffScheduleForm from './StaffScheduleForm';
import StaffScheduleDetails from './StaffScheduleDetails';
import ReservationEditForm from './ReservationEditForm';
import useReservationCalendar from './useReservationCalendar';
import { EventClickArg, EventDropArg, DateSelectArg } from '@fullcalendar/core';
import { Reservation } from '@/types/reservation';
import { useAuth } from '@/lib/useAuth';
import FullCalendar from '@fullcalendar/react';

moment.locale('ja'); // 日本語ロケールを設定

const ReservationCalendar: React.FC = () => {
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isNewReservation, setIsNewReservation] = useState(false);
  const [isStaffScheduleFormOpen, setIsStaffScheduleFormOpen] = useState(false);
  const [selectedStaffSchedule, setSelectedStaffSchedule] = useState<Reservation | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(moment());
  const [isCreatingFromButton, setIsCreatingFromButton] = useState(false);

  const {
    reservations,
    staffList,
    menuList,
    closedDays,
    loadData,
    setReservations,
    setStaffList,
    setMenuList,
    setClosedDays,
    snackbar,
    setSnackbar,
  } = useReservationCalendar(currentDate);

  const calendarRef = useRef<FullCalendar>(null);

  const { user, session } = useAuth();

  // 日付選択ハンドラ
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const { start, end, resource } = selectInfo;

    if (!resource) {
      setSnackbar({ message: 'スタッフを選択してください', severity: 'error' });
      return;
    }

    const newReservation: Partial<Reservation> = {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      staff_id: resource.id,
      is_staff_schedule: false,
    };

    setSelectedReservation(newReservation as Reservation);
    setIsNewReservation(true);
    setIsFormOpen(true);
    setIsCreatingFromButton(false);
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

    return reservations.some(res => {
      if (!res.staff_id || res.staff_id !== staffId) return false;
      if (excludeReservationId && res.id === excludeReservationId) return false;
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
  const staffId = dropInfo.newResource?.id || dropInfo.event.getResources()[0]?.id;
  const reservationId = eventData.id;
    // 重複チェック
    if (isSlotOverlapping(newStart, newEnd, staffId, reservationId)) {
      dropInfo.revert();
      setSnackbar({ message: 'この時間帯は既に予約が入っています', severity: 'error' });
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
      const response = await fetch('/api/calendar-data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(updatedReservation),
      });
      if (!response.ok) throw new Error('Failed to update reservation');
      await loadData();

      const message = eventData.is_staff_schedule
      ? 'スタッフスケジュールが更新されました'
      : '予約が更新されました';

      setSnackbar({ message, severity: 'success' });
    } catch (error) {
      const errorMessage = eventData.is_staff_schedule
        ? 'スタッフスケジュールの更新に失敗しました'
        : '予約の更新に失敗しました';
        setSnackbar({ message: errorMessage, severity: 'error' });
      }
    };

  // フォーム送信ハンドラ
  const handleFormSubmit = async (data: Partial<Reservation>, isNew: boolean) => {
    if (!session || !user) {
      setSnackbar({ message: 'セッションが無効です。再度ログインしてください。', severity: 'error' });
      return;
    }

    try {
      const method = isNew ? 'POST' : 'PUT';
      const reservationData = {
        ...data,
        user_id: user.id,
      };

      console.log('Sending reservation data:', reservationData); // デバッグ用ログ

      const response = await fetch('/api/calendar-data', {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(reservationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(`Failed to ${isNew ? 'create' : 'update'} reservation`);
      }

      await loadData();
      setIsFormOpen(false);
      setSnackbar({ message: `予約が${isNew ? '作成' : '更新'}されました`, severity: 'success' });
    } catch (error) {
      console.error('Error in handleFormSubmit:', error);
      setSnackbar({ message: `予約の${isNew ? '作成' : '更新'}に失敗しました`, severity: 'error' });
    }
  };

  // 予約編集ハンドラ
  const handleEditFormSubmit = async (updatedReservation: Partial<Reservation>) => {
    console.log('Calendar: Edit form submit received', updatedReservation);
    if (!session || !user) {
      console.log('Calendar: No session or user');
      setSnackbar({ message: 'セッションが無効です。再度ログインしてください。', severity: 'error' });
      return;
    }

    try {
      console.log('Calendar: Sending update request');
      const response = await fetch('/api/calendar-data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updatedReservation),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Calendar: API error', errorData);
        throw new Error('予約の更新に失敗しました');
      }

      const updatedData = await response.json();
      console.log('Calendar: 更新成功', updatedData);

      // ローカルの予約データを更新
      setReservations(prevReservations =>
        prevReservations.map(res =>
          res.id === updatedData.id ? { ...res, ...updatedData } : res
        )
      );

      setIsEditFormOpen(false);
      setSnackbar({ message: '予約が更新されました', severity: 'success' });
    } catch (error) {
      console.error('Calendar: Error in handleEditFormSubmit', error);
      setSnackbar({ message: '予約の更新に失敗しました', severity: 'error' });
    }
  };

  // 予約キャンセルハンドラ
  const handleCancelReservation = async (reservationId: string, cancellationType: string) => {
    if (!session || !user) {
      setSnackbar({ message: 'セッションが無効です。再度ログインしてください。', severity: 'error' });
      return;
    }

    try {
      const response = await fetch(`/api/calendar-data?id=${reservationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error cancelling reservation:', errorData);
        throw new Error('予約のキャンセルに失敗しました');
      }

      await loadData();
      setIsFormOpen(false);
      setIsDetailsOpen(false);
      setSnackbar({ message: '予約がキャンセルされました', severity: 'success' });
    } catch (error) {
      console.error('Error in handleCancelReservation:', error);
      setSnackbar({ message: '予約のキャンセルに失敗しました', severity: 'error' });
    }
  };

  // 予約削除ハンドラ（キャンセル処理）
  const handleDeleteReservation = async (id: string) => {
    if (!session || !user) {
      setSnackbar({ message: 'セッションが無効です。再度ログインしてください。', severity: 'error' });
      return;
    }

    try {
      // キャンセルAPIを呼び出す
      const response = await fetch('/api/cancel-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reservationId: id, cancellationType: 'cancelled' }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error cancelling reservation:', errorData);
        throw new Error('Failed to cancel reservation');
      }
      await loadData();
      setIsFormOpen(false);
      setIsDetailsOpen(false);
      setSnackbar({ message: '予約がキャンセルされました', severity: 'success' });
    } catch (error) {
      console.error('Error in handleDeleteReservation:', error);
      setSnackbar({ message: '予約のキャンセルに失敗しました', severity: 'error' });
    }
  };

  // スタッフスケジュール追加ボタンハンドラ
  const handleAddStaffSchedule = () => {
    setSelectedStaffSchedule(null);
    setIsStaffScheduleFormOpen(true);
  };

  // スタッフスケジュールフォーム送信ハンドラ
  const handleStaffScheduleFormSubmit = async (data: Partial<Reservation>, isNew: boolean) => {
    if (!session || !user) {
      setSnackbar({ message: 'セッションが無効です。再度ログインしてください。', severity: 'error' });
      return;
    }

    try {
      const method = isNew ? 'POST' : 'PUT';
      const scheduleData = {
        ...data,
        user_id: user.id,
        is_staff_schedule: true,
        total_price: 0,
      };
      const response = await fetch('/api/calendar-data', {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(`Failed to ${isNew ? 'create' : 'update'} staff schedule`);
      }

      await loadData();
      setIsStaffScheduleFormOpen(false);
      setSelectedStaffSchedule(null);
      setSnackbar({ message: `スタッフスケジュールが${isNew ? '作成' : '更新'}されました`, severity: 'success' });
    } catch (error) {
      console.error('Error in handleStaffScheduleFormSubmit:', error);
      setSnackbar({ message: `スタッフスケジュールの${isNew ? '作成' : '更新'}に失敗しました`, severity: 'error' });
    }
  };

  // スタッフスケジュール削除ハンドラ
  const handleDeleteStaffSchedule = async (id: string) => {
    if (!session || !user) {
      setSnackbar({ message: 'セッションが無効です。再度ログインしてください。', severity: 'error' });
      return;
    }

    try {
      const response = await fetch(`/api/calendar-data?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error deleting staff schedule:', errorData);
        throw new Error('スタッフスケジュールの削除に失敗しました');
      }

      await loadData();
      setSelectedStaffSchedule(null);
      setIsStaffScheduleFormOpen(false);
      setSnackbar({ message: 'スタッフスケジュールが削除されました', severity: 'success' });
    } catch (error) {
      console.error('Error in handleDeleteStaffSchedule:', error);
      setSnackbar({ message: 'スタッフスケジュールの削除に失敗しました', severity: 'error' });
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
    const newDate = moment(currentDate).subtract(1, 'day'); // 1日引く
    setCurrentDate(newDate); // 状態を更新
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(newDate.toDate()); // カレンダーの表示を更新
    }
  };

  const handleNextDay = () => {
    const newDate = moment(currentDate).add(1, 'day'); // 1日足す
    setCurrentDate(newDate); // 状態を更新
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(newDate.toDate()); // カレンダーの表示を更新
    }
  };

  const handleToday = () => {
    const today = moment(); // 今日の日付を取得
    setCurrentDate(today); // 状態を今日の日付に更新
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(today.toDate()); // カレンダーの表示を今日に更新
    }
  };

  // カレンダーの日付レンダリング時に休業日をマークする
  const handleDatesSet = (arg: any) => {
    const calendarApi = arg.view.calendar;
    calendarApi.getEvents().forEach((event: any) => event.remove());

    // 具体的な日付に基づいて休業日をマーク
    if (closedDays && closedDays.length > 0) {
      closedDays.forEach(dateStr => {
        calendarApi.addEvent({
          title: '休業日',
          start: dateStr,
          end: moment(dateStr).add(1, 'day').format('YYYY-MM-DD'),
          allDay: true,
          display: 'background',
          classNames: ['closed-day'],
          overlap: false,
        });
      });
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: 'background.default' }}>
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
        reservations={reservations}
        staffList={staffList}
        closedDays={closedDays}
        onDateSelect={handleDateSelect}
        onEventClick={handleEventClick}
        onEventDrop={handleEventDrop}
        handleDatesSet={handleDatesSet}
        ref={calendarRef}
      />

      {/* 予約フォームモーダル */}
      {isFormOpen && (
        <ReservationForm
          reservation={selectedReservation}
          isNew={isNewReservation}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          staffList={staffList}
          menuList={menuList}
          onDelete={handleDeleteReservation}
          reservations={reservations} // 既存の予約データを渡す
          hideReservationType={isCreatingFromButton} // 新規予約時に予約タイプを非表示
          isCreatingFromButton={isCreatingFromButton}
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
          onCancel={handleCancelReservation} // ここを追加
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
