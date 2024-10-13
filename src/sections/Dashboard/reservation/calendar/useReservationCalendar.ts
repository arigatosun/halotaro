// src/sections/Dashboard/reservation/calendar/useReservationCalendar.ts

import { useState, useEffect } from 'react';
import { Reservation, Staff, MenuItem, BusinessHour } from '@/types/reservation';
import { useAuth } from '@/lib/useAuth';
import moment from 'moment';

interface UseReservationCalendarReturn {
  reservations: Reservation[];
  staffList: Staff[];
  menuList: MenuItem[];
  closedDays: string[];
  businessHours: BusinessHour[];
  loadData: () => Promise<void>;
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
  setStaffList: React.Dispatch<React.SetStateAction<Staff[]>>;
  setMenuList: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  setClosedDays: React.Dispatch<React.SetStateAction<string[]>>;
  setBusinessHours: React.Dispatch<React.SetStateAction<BusinessHour[]>>;
  dateRange: { start: string; end: string } | null; // dateRangeを追加
  setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string } | null>>;
  snackbar: { message: string; severity: 'success' | 'error' } | null;
  setSnackbar: React.Dispatch<React.SetStateAction<{ message: string; severity: 'success' | 'error' } | null>>;
}

const useReservationCalendar = (): UseReservationCalendarReturn => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const { user, session } = useAuth();

  const loadData = async () => {
    if (!session || !user || !dateRange) return;

    try {
      const response = await fetch(
        `/api/calendar-data?startDate=${dateRange.start}&endDate=${dateRange.end}`,
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
      setBusinessHours(data.businessHours || []);
    } catch (error) {
      console.error('Error in loadData:', error);
      setSnackbar({ message: 'データの取得に失敗しました', severity: 'error' });
    }
  };

  useEffect(() => {
    if (user && session && dateRange) {
      loadData();
    }
  }, [user, session, dateRange]);

  return {
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
    dateRange, // dateRangeを追加
    setDateRange,
    snackbar,
    setSnackbar,
  };
};

export default useReservationCalendar;
