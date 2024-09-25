import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import { CustomToast } from '@/components/CustomToast';
import ReservationForm from '@/sections/Dashboard/reservation/calendar/ReservationForm';
import ReservationDetails from '@/sections/Dashboard/reservation/calendar/ReservationDetails';
import { Reservation, Staff, MenuItem } from '@/types/reservation';
import { useAuth } from '@/lib/useAuth';

const ReservationCalendar: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isNewReservation, setIsNewReservation] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [menuList, setMenuList] = useState<MenuItem[]>([]);

  const { user, session } = useAuth();

  useEffect(() => {
    if (user && session) {
      loadData();
    }
  }, [user, session]);

  const loadData = async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/calendar-data', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching data:', errorData);
        throw new Error(errorData.error || 'Failed to fetch data');
      }
      const data = await response.json();
      setReservations(data.reservations);
      setStaffList(data.staffList);
      setMenuList(data.menuList);
    } catch (error) {
      console.error('Error in loadData:', error);
      setToastMessage('データの取得に失敗しました');
    }
  };

  const loadStaffList = async () => {
    try {
      const response = await fetch('/api/staff-list');
      if (!response.ok) throw new Error('Failed to fetch staff list');
      const data = await response.json();
      setStaffList(data);
    } catch (error) {
      setToastMessage('スタッフリストの取得に失敗しました');
    }
  };

  const loadMenuList = async () => {
    try {
      const response = await fetch('/api/menu-list');
      if (!response.ok) throw new Error('Failed to fetch menu list');
      const data = await response.json();
      setMenuList(data);
    } catch (error) {
      setToastMessage('メニューリストの取得に失敗しました');
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    console.log('Event clicked:', clickInfo.event);
    console.log('Event extendedProps:', clickInfo.event.extendedProps);
    setSelectedReservation(clickInfo.event.extendedProps as Reservation);
    setIsNewReservation(false);
    setIsFormOpen(false); // 詳細表示を先に行うため、フォームは開かない
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    console.log('Date selected:', selectInfo);
    const newReservation: Partial<Reservation> = {
      start_time: selectInfo.startStr,
      end_time: selectInfo.endStr,
      staff_id: selectInfo.resource ? selectInfo.resource.id : '',
    };
    console.log('New reservation:', newReservation);
    setSelectedReservation(newReservation as Reservation);
    setIsNewReservation(true);
    setIsFormOpen(true);
  };

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    try {
      const updatedReservation = {
        ...dropInfo.event.extendedProps,
        start_time: dropInfo.event.start?.toISOString(),
        end_time: dropInfo.event.end?.toISOString(),
      };
      const response = await fetch('/api/calendar-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedReservation),
      });
      if (!response.ok) throw new Error('Failed to update reservation');
      await loadData();
      setToastMessage('予約が更新されました');
    } catch (error) {
      setToastMessage('予約の更新に失敗しました');
    }
  };

  const handleFormSubmit = async (data: Partial<Reservation>, isNew: boolean) => {
    if (!session) {
      setToastMessage('セッションが無効です。再度ログインしてください。');
      return;
    }

    console.log('Form submitted with data:', data);
    try {
      const method = isNew ? 'POST' : 'PUT';
      const response = await fetch('/api/calendar-data', {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(data),
      });
      
      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || `Failed to ${isNew ? 'create' : 'update'} reservation`);
      }

      const updatedReservation = await response.json();
      console.log('Updated reservation:', updatedReservation);

      setIsFormOpen(false);
      setToastMessage(`予約が${isNew ? '作成' : '更新'}されました`);
      await loadData();
    } catch (error) {
      console.error('Error in handleFormSubmit:', error);
      setToastMessage(`予約の${isNew ? '作成' : '更新'}に失敗しました`);
    }
  };

  const handleDeleteReservation = async (id: string) => {
    if (!session) {
      setToastMessage('セッションが無効です。再度ログインしてください。');
      return;
    }

    try {
      const response = await fetch(`/api/calendar-data?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error deleting reservation:', errorData);
        throw new Error(errorData.error || 'Failed to delete reservation');
      }
      await loadData();
      setIsFormOpen(false);
      setToastMessage('予約が削除されました');
    } catch (error) {
      console.error('Error in handleDeleteReservation:', error);
      setToastMessage('予約の削除に失敗しました');
    }
  };


  return (
    <div>
      <FullCalendar
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineDay"
        editable={true}
        selectable={true}
        events={reservations.map(reservation => {
          console.log('Mapping reservation:', reservation);
          return {
            id: reservation.id,
            resourceId: reservation.staff_id,
            title: `${reservation.customer_name} - ${reservation.menu_name}`,
            start: reservation.start_time,
            end: reservation.end_time,
            extendedProps: reservation
          };
        })}
        resources={staffList.map(staff => ({
          id: staff.id,
          title: staff.name
        }))}
        eventClick={handleEventClick}
        select={handleDateSelect}
        eventDrop={handleEventDrop}
        slotDuration="00:30:00"
        slotMinTime="09:00:00"
        slotMaxTime="21:00:00"
      />
     {isFormOpen && selectedReservation && (
  <ReservationForm
    reservation={selectedReservation}
    isNew={isNewReservation}
    onClose={() => {
      console.log('Form closed');
      setIsFormOpen(false);
    }}
    onSubmit={handleFormSubmit}
    onDelete={handleDeleteReservation}
    staffList={staffList}
    menuList={menuList}
  />
      )}
     {selectedReservation && !isFormOpen && (
      <ReservationDetails
        reservation={selectedReservation}
        onClose={() => {
          console.log('Details closed');
          setSelectedReservation(null);
        }}
        onEdit={() => {
          console.log('Edit clicked');
          setIsFormOpen(true);
        }}
      />
    )}
    {isFormOpen && selectedReservation && (
      <ReservationForm
        reservation={selectedReservation}
        isNew={isNewReservation}
        onClose={() => {
          console.log('Form closed');
          setIsFormOpen(false);
        }}
        onSubmit={handleFormSubmit}
        onDelete={handleDeleteReservation}
        staffList={staffList}
        menuList={menuList}
      />
    )}
    <CustomToast message={toastMessage} />
  </div>
);
};

export default ReservationCalendar;