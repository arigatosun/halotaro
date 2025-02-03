// useReservationCalendar.ts

import { useState, useEffect, useRef } from "react";
import {
  Reservation,
  Staff,
  MenuItem,
  BusinessHour,
  Category,
} from "@/types/reservation";
import { useAuth } from "@/lib/authContext";
import moment from "moment";

// スタッフシフトの型定義を追加
interface StaffShift {
  id: string;
  staff_id: string;
  date: string;
  shift_status: string; // "出勤" または "休日"
  start_time?: string;
  end_time?: string;
  memo?: string;
}

// +++ クーポンの型定義 +++
interface Coupon {
  id: string; // uuid
  user_id: string;
  coupon_id: string; // couponsテーブルにある固有の文字列
  name: string;
  category?: string;
  description?: string;
  price?: number;
  duration?: number;
  is_reservable?: boolean;
  image_url?: string;
  // ...etc
}

interface UseReservationCalendarReturn {
  reservations: Reservation[];
  staffList: Staff[];
  menuList: MenuItem[];
  couponList: Coupon[];
  categoryList: Category[];
  closedDays: string[];
  businessHours: BusinessHour[];
  staffShifts: StaffShift[]; // 追加
  loadData: () => Promise<void>;
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
  setClosedDays: React.Dispatch<React.SetStateAction<string[]>>;

  setBusinessHours: React.Dispatch<React.SetStateAction<BusinessHour[]>>;
  dateRange: { start: string; end: string };
  setDateRange: React.Dispatch<
    React.SetStateAction<{ start: string; end: string }>
  >;
  snackbar: { message: string; severity: "success" | "error" } | null;
  setSnackbar: React.Dispatch<
    React.SetStateAction<{
      message: string;
      severity: "success" | "error";
    } | null>
  >;
  isLoading: boolean; // ローディング状態を追加
}

const useReservationCalendar = (): UseReservationCalendarReturn => {
  // reservations の状態を useRef で管理
  const reservationsRef = useRef<Reservation[]>([]);
  const [reservations, setReservationsState] = useState<Reservation[]>([]);
  const setReservations: React.Dispatch<React.SetStateAction<Reservation[]>> = (
    value
  ) => {
    if (typeof value === "function") {
      const newValue = value(reservationsRef.current);
      reservationsRef.current = newValue;
      setReservationsState(newValue);
    } else {
      reservationsRef.current = value;
      setReservationsState(value);
    }
  };

  // closedDays の状態を useRef で管理
  const closedDaysRef = useRef<string[]>([]);
  const [closedDays, setClosedDaysState] = useState<string[]>([]);
  const setClosedDays: React.Dispatch<React.SetStateAction<string[]>> = (
    value
  ) => {
    if (typeof value === "function") {
      const newValue = value(closedDaysRef.current);
      closedDaysRef.current = newValue;
      setClosedDaysState(newValue);
    } else {
      closedDaysRef.current = value;
      setClosedDaysState(value);
    }
  };

  // businessHours の状態を useRef で管理
  const businessHoursRef = useRef<BusinessHour[]>([]);
  const [businessHours, setBusinessHoursState] = useState<BusinessHour[]>([]);
  const setBusinessHours: React.Dispatch<
    React.SetStateAction<BusinessHour[]>
  > = (value) => {
    if (typeof value === "function") {
      const newValue = value(businessHoursRef.current);
      businessHoursRef.current = newValue;
      setBusinessHoursState(newValue);
    } else {
      businessHoursRef.current = value;
      setBusinessHoursState(value);
    }
  };

  // staffShifts の状態を useRef で管理（追加）
  const staffShiftsRef = useRef<StaffShift[]>([]);
  const [staffShifts, setStaffShiftsState] = useState<StaffShift[]>([]);
  const setStaffShifts: React.Dispatch<React.SetStateAction<StaffShift[]>> = (
    value
  ) => {
    if (typeof value === "function") {
      const newValue = value(staffShiftsRef.current);
      staffShiftsRef.current = newValue;
      setStaffShiftsState(newValue);
    } else {
      staffShiftsRef.current = value;
      setStaffShiftsState(value);
    }
  };

  // その他の状態と関数
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [couponList, setCouponList] = useState<Coupon[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false); // ローディング状態を追加

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(
    () => {
      const start = moment().startOf("day").format("YYYY-MM-DD");
      const end = moment().add(1, "months").endOf("month").format("YYYY-MM-DD");
      return { start, end };
    }
  );

  const { user, session } = useAuth();

  // 過去の dateRange を保持するための useRef
  const prevDateRangeRef = useRef<{ start: string; end: string } | null>(null);

  // 初回マウント時にスタッフリストとメニューリストを取得
  useEffect(() => {
    if (!session || !user || staffList.length > 0) return;

    const loadInitialData = async () => {
      try {
        const response = await fetch(`/api/initial-data?userId=${user.id}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error fetching initial data:", errorData);
          throw new Error("Failed to fetch initial data");
        }

        const data = await response.json();
        setStaffList(data.staffList);
        setMenuList(data.menuList);
        setCouponList(data.couponList);
        setCategoryList(data.categoryList);
      } catch (error) {
        console.error("Error in loadInitialData:", error);
        setSnackbar({
          message: "初期データの取得に失敗しました",
          severity: "error",
        });
      }
    };

    loadInitialData();
  }, [user, session]);

  // 日付範囲が変更されたときに予約データとスタッフシフトデータを取得
  useEffect(() => {
    if (!session || !user) return;

    // dateRange が変更された場合のみデータ取得を行う
    if (
      prevDateRangeRef.current &&
      prevDateRangeRef.current.start === dateRange.start &&
      prevDateRangeRef.current.end === dateRange.end
    ) {
      // dateRange が変更されていない場合はデータ取得をスキップ
      return;
    }

    // prevDateRangeRef を更新
    prevDateRangeRef.current = dateRange;

    const loadData = async () => {
      setIsLoading(true); // ローディング開始

      try {
        const queryParams = new URLSearchParams({
          startDate: dateRange.start,
          endDate: dateRange.end,
          userId: user.id,
        });

        const response = await fetch(
          `/api/calendar-data?${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error fetching data:", errorData);
          throw new Error("Failed to fetch data");
        }

        const data = await response.json();
        console.log("data.reservations", data.reservations);
        setReservations(data.reservations);
        setClosedDays(data.closedDays || []);
        setBusinessHours(data.businessHours || []);
        setStaffShifts(data.staffShifts || []); // スタッフシフトデータをセット
      } catch (error) {
        console.error("Error in loadData:", error);
        setSnackbar({
          message: "データの取得に失敗しました",
          severity: "error",
        });
      } finally {
        setIsLoading(false); // ローディング終了
      }
    };

    loadData();
  }, [user, session, dateRange]);

  return {
    reservations,
    staffList,
    menuList,
    couponList,
    categoryList,
    closedDays,
    businessHours,
    staffShifts, // 追加
    loadData: async () => {}, // データが既にロードされているため空の関数を返す

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
