import React, { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Snackbar, Alert } from '@mui/material';

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

  const { user, session } = useAuth();

  // データ読み込み
  useEffect(() => {
    if (user && session) {
      loadData();
    }
  }, [user, session]);

  // データ取得関数
  const loadData = async () => {
    if (!session || !user) return;

    const startDate = moment().startOf('month').toISOString();
    const endDate = moment().endOf('month').toISOString();

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
      setIsFormOpen(false);
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

  return (
    <div>
      {/* ヘッダー部分 */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">予約カレンダー</h2>
        <Button onClick={handleAddStaffSchedule} className="flex items-center">
          <PlusCircle className="mr-2" size={16} />
          スタッフスケジュール追加
        </Button>
      </div>

      {/* FullCalendarコンポーネント */}
      <FullCalendar
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineDay"
        editable={true}
        selectable={true}
        select={handleDateSelect}
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
      />

      {/* 予約フォーム */}
      {isFormOpen && selectedReservation && (
        <ReservationForm
          reservation={selectedReservation}
          isNew={isNewReservation}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          onDelete={handleDeleteReservation}
          staffList={staffList}
          menuList={menuList}
        />
      )}

      {/* スタッフスケジュールフォーム */}
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

      {/* スタッフスケジュール詳細 */}
      {selectedStaffSchedule && !isStaffScheduleFormOpen && (
        <StaffScheduleDetails
          staffSchedule={selectedStaffSchedule}
          onClose={() => setSelectedStaffSchedule(null)}
          onEdit={() => {
            setIsStaffScheduleFormOpen(true);
          }}
        />
      )}

      {/* 予約詳細 */}
      {isDetailsOpen && selectedReservation && (
        <ReservationDetails
          reservation={selectedReservation}
          onClose={() => setIsDetailsOpen(false)}
          onEdit={() => {
            setIsDetailsOpen(false);
            setIsFormOpen(true);
            setIsNewReservation(false);
          }}
          onDelete={handleDeleteReservation} // 予約削除ハンドラを追加
        />
      )}

      {/* トースト通知 */}
      {/* CustomToastコンポーネントをSnackbarに変更 */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
      >
        <Alert onClose={() => setSnackbar(null)} severity={snackbar?.severity} sx={{ width: '100%' }}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ReservationCalendar;
