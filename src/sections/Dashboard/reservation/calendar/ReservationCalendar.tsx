// src/sections/Dashboard/reservation/calendar/ReservationCalendar.tsx

"use client";

import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, EventDropArg, DateSelectArg } from '@fullcalendar/core';
import { CustomToast } from '@/components/CustomToast';
import ReservationForm from './ReservationForm';
import ReservationDetails from './ReservationDetails';
import StaffScheduleForm from './StaffScheduleForm';
import StaffScheduleDetails from './StaffScheduleDetails';
import { Reservation, Staff, MenuItem } from '@/types/reservation';
import { useAuth } from '@/lib/useAuth';
import moment from 'moment';
import 'moment/locale/ja';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Snackbar, Alert } from '@mui/material';
import { Box, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReservationEditForm from './ReservationEditForm';
import { styled } from '@mui/system';

moment.locale('ja'); // 日本語ロケールを設定

const StyledFullCalendar = styled(FullCalendar)(({ theme }) => ({
  '& .fc-timeline-slot-cushion': {
    fontWeight: 'bold',
    color: theme.palette.text.primary,
  },
  '& .fc-timeline-event': {
    borderRadius: '4px',
    padding: '2px 4px',
  },
  '& .staff-schedule': {
    backgroundColor: theme.palette.primary.light,
    borderColor: theme.palette.primary.main,
  },
  '& .customer-reservation': {
    backgroundColor: theme.palette.secondary.light,
    borderColor: theme.palette.secondary.main,
  },
  '& .fc-timeline-header': {
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  '& .fc-timeline-slot': {
    minWidth: '60px !important',
  },
  '& .fc-timeline-header-row-chrono th': {
    textAlign: 'center',
  },
  '& .fc-resource-timeline-divider': {
    display: 'none',
  },
  '& .fc-toolbar': {
    display: 'none',
  },
  '& .fc-timeline-header-row:first-child': {
    display: 'none',
  },
}));

const ReservationCalendar: React.FC = () => {
  // 状態変数の定義
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isNewReservation, setIsNewReservation] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [isStaffScheduleFormOpen, setIsStaffScheduleFormOpen] = useState(false);
  const [selectedStaffSchedule, setSelectedStaffSchedule] = useState<Reservation | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(moment());
  const { user, session } = useAuth();

  // Ref for FullCalendar
  const calendarRef = useRef<FullCalendar>(null);

  // データ読み込み
  useEffect(() => {
    if (user && session) {
      loadData();
    }
  }, [user, session]);

  // データ取得関数
  const loadData = async () => {
    if (!session || !user) return;

    const startDate = moment(currentDate).startOf('month').toISOString();
    const endDate = moment(currentDate).endOf('month').toISOString();

    try {
      const response = await fetch(
        `/api/calendar-data?userId=${user.id}&startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          cache: 'no-cache', // キャッシュを無効化して最新データを取得
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching data:', errorData);
        throw new Error('Failed to fetch data');
      }
      const data = await response.json();
      console.log('Loaded data:', data);
      setReservations(data.reservations);
      setStaffList(data.staffList);
      setMenuList(data.menuList);
    } catch (error) {
      console.error('Error in loadData:', error);
      setSnackbar({ message: 'データの取得に失敗しました', severity: 'error' });
    }
  };

  // 日付選択ハンドラ
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    console.log('Date selected:', selectInfo);
    const newReservation: Partial<Reservation> = {
      start_time: selectInfo.startStr,
      end_time: selectInfo.endStr,
      staff_id: selectInfo.resource ? selectInfo.resource.id : '',
      is_staff_schedule: false,
    };
    console.log('New reservation:', newReservation);
    setSelectedReservation(newReservation as Reservation);
    setIsNewReservation(true);
    setIsFormOpen(true);
  };

  // イベントクリックハンドラ
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventData = clickInfo.event.extendedProps as Reservation;
    if (eventData.is_staff_schedule) {
      setSelectedStaffSchedule(eventData);
    } else {
      setSelectedReservation(eventData);
      setIsNewReservation(false);
      setIsDetailsOpen(true);
    }
  };

  // イベントドロップハンドラ
  const handleEventDrop = async (dropInfo: EventDropArg) => {
    if (!user) return;

    const eventData = dropInfo.event.extendedProps as Reservation;
    if (!eventData.is_staff_schedule) {
      dropInfo.revert();
      setSnackbar({ message: '通常の予約はドラッグで移動できません', severity: 'error' });
      return;
    }

    try {
      const updatedReservation = {
        ...eventData,
        start_time: dropInfo.event.start?.toISOString(),
        end_time: dropInfo.event.end?.toISOString(),
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
      if (!response.ok) throw new Error('Failed to update staff schedule');
      await loadData();
      setSnackbar({ message: 'スタッフスケジュールが更新されました', severity: 'success' });
    } catch (error) {
      setSnackbar({ message: 'スタッフスケジュールの更新に失敗しました', severity: 'error' });
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
      const response = await fetch(`/api/calendar-data?id=${id}&userId=${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error deleting staff schedule:', errorData);
        throw new Error('Failed to delete staff schedule');
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
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const newDate = moment(currentDate).subtract(1, 'day').toDate();
      calendarApi.gotoDate(newDate);
    }
  };

  const handleNextDay = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const newDate = moment(currentDate).add(1, 'day').toDate();
      calendarApi.gotoDate(newDate);
    }
  };

  const handleToday = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(new Date());
    }
  };

  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(currentDate.toDate());
    }
  }, [currentDate]);

  return (
    <Box sx={{ p: 3, backgroundColor: 'background.default' }}>
      {/* ナビゲーションセクション */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outline" size="icon" onClick={handlePrevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Typography variant="h5">
            {currentDate.format('M月D日（ddd）')}
          </Typography>
          <Button variant="outline" size="icon" onClick={handleNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleToday}>
            今日
          </Button>
        </Box>
        <Button
          variant="default"
          onClick={handleAddStaffSchedule}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> スタッフスケジュール追加
        </Button>
      </Box>

      {/* カレンダーセクション */}
      <Box sx={{ 
        backgroundColor: 'background.paper', 
        borderRadius: '12px', 
        overflow: 'hidden',
        boxShadow: 3,
      }}>
        <StyledFullCalendar
          ref={calendarRef}
          plugins={[resourceTimelinePlugin, interactionPlugin]}
          initialView="resourceTimelineDay"
          editable={true}
          selectable={true}
          select={handleDateSelect}
          schedulerLicenseKey='GPL-My-Project-Is-Open-Source'
          events={reservations.map((reservation) => ({
            id: reservation.id,
            resourceId: reservation.staff_id,
            title: reservation.is_staff_schedule
              ? reservation.event
              : `${reservation.customer_name || ''} - ${reservation.menu_name || ''}`,
            start: reservation.start_time,
            end: reservation.end_time,
            extendedProps: reservation,
            classNames: reservation.is_staff_schedule ? ['staff-schedule'] : ['customer-reservation'],
          }))}
          resources={staffList.map((staff) => ({
            id: staff.id,
            title: staff.name,
          }))}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventClassNames={(arg) => {
            return arg.event.extendedProps.is_staff_schedule ? ['staff-schedule'] : ['customer-reservation'];
          }}
          slotDuration="00:30:00"
          slotMinTime="09:00:00"
          slotMaxTime="21:00:00"
          height="auto"
          headerToolbar={false}
          dayHeaderFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          slotLabelFormat={[
            { hour: '2-digit', minute: '2-digit', hour12: false },
          ]}
          resourceAreaHeaderContent=""
        />
      </Box>

    {/* 予約フォームモーダル */}
    {isFormOpen && selectedReservation && (
        <ReservationForm
          reservation={selectedReservation}
          isNew={isNewReservation}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          staffList={staffList}
          menuList={menuList}
          onDelete={handleDeleteReservation}
          reservations={reservations} // 既存の予約データを渡す
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
        />
      )}

      {/* 予約編集フォームモーダル */}
      {isEditFormOpen && selectedReservation && (
        <ReservationEditForm
          reservation={selectedReservation}
          onClose={() => setIsEditFormOpen(false)}
          onSubmit={handleFormSubmit}
          onDelete={handleDeleteReservation}
          staffList={staffList}
          menuList={menuList}
        />
      )}

    {/* スナックバー */}
    <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(null)}
          severity={snackbar?.severity}
          sx={{
            width: '100%',
            borderRadius: '8px',
            boxShadow: 3,
          }}
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReservationCalendar;