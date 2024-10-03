// src/sections/Dashboard/reservation/calendar/useReservationCalendar.ts

import { useState, useEffect } from 'react';
import { Reservation, Staff, MenuItem } from '@/types/reservation';
import { useAuth } from '@/lib/useAuth';
import moment from 'moment';

interface UseReservationCalendarReturn {
  reservations: Reservation[];
  staffList: Staff[];
  menuList: MenuItem[];
  closedDays: string[];
  loadData: () => Promise<void>;
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
  setStaffList: React.Dispatch<React.SetStateAction<Staff[]>>;
  setMenuList: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  setClosedDays: React.Dispatch<React.SetStateAction<string[]>>;
  snackbar: { message: string; severity: 'success' | 'error' } | null;
  setSnackbar: React.Dispatch<React.SetStateAction<{ message: string; severity: 'success' | 'error' } | null>>;
}

const useReservationCalendar = (currentDate: moment.Moment): UseReservationCalendarReturn => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const { user, session } = useAuth();

  const loadData = async () => {
    if (!session || !user) return;

    const startDate = moment(currentDate).startOf('day').subtract(30, 'days').toISOString();
    const endDate = moment(currentDate).endOf('day').add(30, 'days').toISOString();

    try {
      const response = await fetch(
        `/api/calendar-data?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          cache: 'no-store',
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
      setClosedDays(data.closedDays || []);
    } catch (error) {
      console.error('Error in loadData:', error);
      setSnackbar({ message: 'データの取得に失敗しました', severity: 'error' });
    }
  };

  useEffect(() => {
    if (user && session) {
      loadData();
    }
  }, [user, session, currentDate]);

  return {
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
  };
};

export default useReservationCalendar;
