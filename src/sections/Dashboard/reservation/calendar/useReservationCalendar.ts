// useReservationCalendar.ts
import { useState, useEffect } from 'react';
import { Reservation, Staff, MenuItem, BusinessHour } from '@/types/reservation';
import { useAuth } from '@/contexts/authcontext';
import moment from 'moment';

interface UseReservationCalendarReturn {
  reservations: Reservation[];
  staffList: Staff[];
  menuList: MenuItem[];
  closedDays: string[];
  businessHours: BusinessHour[];
  loadData: () => Promise<void>;
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
  setClosedDays: React.Dispatch<React.SetStateAction<string[]>>;
  setBusinessHours: React.Dispatch<React.SetStateAction<BusinessHour[]>>;
  dateRange: { start: string; end: string };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  snackbar: { message: string; severity: 'success' | 'error' } | null;
  setSnackbar: React.Dispatch<React.SetStateAction<{ message: string; severity: 'success' | 'error' } | null>>;
  isLoading: boolean; // ローディング状態を追加
}

const useReservationCalendar = (): UseReservationCalendarReturn => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // ローディング状態を追加

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const start = moment().startOf('day').format('YYYY-MM-DD');
    const end = moment().add(1, 'months').endOf('month').format('YYYY-MM-DD');
    return { start, end };
  });

  const { user, session } = useAuth();

  // 初回マウント時にスタッフリストとメニューリストを取得
  useEffect(() => {
    if (!session || !user) return;

    const loadInitialData = async () => {
      try {
        const response = await fetch(`/api/initial-data?userId=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error fetching initial data:', errorData);
          throw new Error('Failed to fetch initial data');
        }

        const data = await response.json();
        setStaffList(data.staffList);
        setMenuList(data.menuList);
      } catch (error) {
        console.error('Error in loadInitialData:', error);
        setSnackbar({ 
          message: '初期データの取得に失敗しました', 
          severity: 'error' 
        });
      }
    };

    loadInitialData();
  }, [user, session]);

  // 日付範囲が変更されたときに予約データを取得
  const loadData = async () => {
    if (!session || !user || !dateRange) return;

    setIsLoading(true); // ローディング開始

    try {
      const queryParams = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        userId: user.id
      });

      const response = await fetch(
        `/api/calendar-data?${queryParams.toString()}`,
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

      setReservations(data.reservations);
      setClosedDays(data.closedDays || []);
      setBusinessHours(data.businessHours || []);
    } catch (error) {
      console.error('Error in loadData:', error);
      setSnackbar({ 
        message: 'データの取得に失敗しました', 
        severity: 'error' 
      });
    } finally {
      setIsLoading(false); // ローディング終了
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
    setClosedDays,
    setBusinessHours,
    dateRange,
    setDateRange,
    snackbar,
    setSnackbar,
    isLoading,
  };
};

export default useReservationCalendar;
