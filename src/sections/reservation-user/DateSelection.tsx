// src/sections/reservation-user/DateSelection.tsx

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  styled,
  ThemeProvider,
  createTheme,
  Typography,
  Box,
  useMediaQuery,
  Tooltip,
  IconButton,
  Fade,
  Skeleton,
  CircularProgress,
} from "@mui/material";
import { ChevronLeft, ChevronRight, Event } from "@mui/icons-material";
import moment from "moment-timezone";
import "moment/locale/ja";
import { useReservation } from "@/contexts/reservationcontext";
import { useParams } from "next/navigation";
import { SelectedDateTime } from "@/contexts/reservationcontext";
import { supabase } from "@/lib/supabaseClient";

moment.locale("ja"); // 日本語ロケールを設定

interface Reservation {
  startTime: string;
  endTime: string;
  staffId: string;
  is_staff_schedule: boolean;
}

interface DateSelectionProps {
  onDateTimeSelect: (
    startTime: Date,
    endTime: Date,
    assignedStaff: { id: string; name: string }
  ) => void;
  onBack: () => void;
  selectedStaff: { id: string; name: string } | null;
  selectedMenuId: string;
}

const slotInterval = 30; // スロットの間隔を30分に設定

// テーマの定義
const theme = createTheme({
  palette: {
    primary: {
      main: "#f97316", // オレンジ色
    },
    secondary: {
      main: "#3b82f6", // 青色（例えば土曜日用）
    },
    background: {
      default: "#f8f9fa",
      paper: "#ffffff",
    },
    text: {
      primary: "#333333",
      secondary: "#666666",
    },
    error: {
      main: "#ef4444", // 赤色（日曜日用）
    },
  },
  typography: {
    fontFamily: '"Noto Sans JP", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          textTransform: "none",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "rgba(224, 224, 224, 0.5)",
        },
      },
    },
  },
});

// スタイル付きのTableCell
interface StyledTableCellProps {
  isHourBorder?: boolean;
}

const StyledTableCell = styled(TableCell, {
  shouldForwardProp: (prop) => prop !== "isHourBorder",
})<StyledTableCellProps>(({ theme, isHourBorder }) => ({
  padding: "4px",
  textAlign: "center",
  borderRight: `1px solid ${theme.palette.divider}`,
  borderBottom: isHourBorder
    ? `2px solid ${theme.palette.divider}`
    : `1px solid ${theme.palette.divider}`,
  width: "80px",
  minWidth: "80px",
  maxWidth: "80px",
  height: "40px",
  "&.header": {
    backgroundColor: theme.palette.background.paper,
    zIndex: 2,
  },
  "&.year-month": {
    position: "sticky",
    top: 0,
    zIndex: 3,
    backgroundColor: theme.palette.background.paper,
  },
  "&.day-date": {
    position: "sticky",
    top: "40px",
    zIndex: 3,
    backgroundColor: theme.palette.background.paper,
  },
  "&.time": {
    left: 0,
    zIndex: 4,
    position: "sticky",
    backgroundColor: theme.palette.background.paper,
  },
  "&.time-right": {
    right: 0,
    zIndex: 4,
    position: "sticky",
    backgroundColor: theme.palette.background.paper,
  },
  "&.nav-button": {
    zIndex: 5,
  },
  "&.date": {
    position: "sticky",
    top: "96px",
    zIndex: 2,
    backgroundColor: theme.palette.background.paper,
  },
  "&.saturday": {
    color: theme.palette.secondary.main, // 土曜日の色
  },
  "&.sunday": {
    color: theme.palette.error.main, // 日曜日の色
  },
  "&.holiday": {
    backgroundColor: "#f0f4f8", // 休業日の背景色
  },
}));

// スタイル付きの時間スロットボタン
const TimeSlotButton = styled(Button)(({ theme }) => ({
  minWidth: "100%",
  width: "100%",
  height: "100%",
  padding: "2px",
  fontSize: "0.9rem",
  borderRadius: "4px",
  transition: "all 0.3s ease",
  "&.available": {
    color: theme.palette.primary.main,
    "&:hover": {
      backgroundColor: theme.palette.primary.light,
      color: theme.palette.primary.contrastText,
    },
  },
  "&.unavailable": {
    color: theme.palette.text.disabled,
  },
  "&.reserved": {
    color: theme.palette.text.disabled,
  },
}));

// スクロール可能なテーブルコンテナ
const ScrollableTableContainer = styled(TableContainer)<{
  component?: React.ElementType;
}>(({ theme }) => ({
  maxHeight: "calc(100vh - 280px)",
  overflow: "auto",
  width: "100%",
  "&::-webkit-scrollbar": {
    width: "8px",
  },
  "&::-webkit-scrollbar-track": {
    background: "transparent",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: theme.palette.grey[300],
    borderRadius: "4px",
  },
  paddingRight: "8px",
}));

// オレンジ色のボタン
const OrangeButton = styled(Button)(({ theme }) => ({
  backgroundColor: "#f97316",
  color: "white",
  "&:hover": {
    backgroundColor: "#ea580c",
  },
}));

// モバイル用の時間スロットボタン
const MobileTimeSlotButton = styled(Button)(({ theme }) => ({
  minWidth: "60px",
  margin: "4px",
  padding: "6px 8px",
  fontSize: "0.8rem",
  borderRadius: "4px",
  "&.available": {
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
    },
  },
  "&.unavailable": {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.text.disabled,
  },
  "&.reserved": {
    backgroundColor: theme.palette.grey[400],
    color: theme.palette.text.disabled,
  },
}));

interface FetchedReservations {
  selectedStaffReservations: Record<string, Reservation[]>;
  allStaffReservations: Record<string, Reservation[]>;
}

// 日時選択コンポーネント
const DateSelection: React.FC<DateSelectionProps> = ({
  onDateTimeSelect,
  onBack,
  selectedStaff: selectedStaffProp,
  selectedMenuId,
}) => {
  const [isLoading, setIsLoading] = useState(true); // ローディング状態
  const [startDate, setStartDate] = useState(moment().startOf("day")); // 表示開始日
  const [availableSlots, setAvailableSlots] = useState<
    Record<string, Record<string, string[]>>
  >({}); // 利用可能な時間スロット
  const [reservedSlots, setReservedSlots] = useState<FetchedReservations>({
    selectedStaffReservations: {},
    allStaffReservations: {},
  });
  const [operatingHours, setOperatingHours] = useState<
    Record<
      string,
      {
        isHoliday: boolean;
        openTime: string | null;
        closeTime: string | null;
        capacity: number | null;
      }
    >
  >({}); // 営業時間情報
  const [selectedDateTime, setSelectedDateTime] =
    useState<SelectedDateTime | null>(null); // 選択された日時
  const [isDialogOpen, setIsDialogOpen] = useState(false); // ダイアログの表示状態
  const [error, setError] = useState<string | null>(null); // エラーメッセージ
  const { selectedMenus } = useReservation();
  const params = useParams();
  const salonId = params["user-id"] as string;

  const [assignedStaff, setAssignedStaff] = useState<{
    id: string;
    name: string;
  } | null>(null); // 自動割り当てられたスタッフ
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>(
    []
  ); // スタッフリスト

  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // モバイル判定
  const displayDays = isMobile ? 7 : 14; // 表示する日数

  // データのリフレッシュ関数
  const refreshData = async () => {
    await Promise.all([
      fetchAvailableSlots(),
      fetchReservedSlots(),
      fetchOperatingHours(),
      fetchStaffList(), // スタッフリストの取得
    ]);
  };

  // デバッグ用のuseEffect
  useEffect(() => {
    console.group("DateSelection Debug Info");
    console.log("Selected Staff:", {
      id: selectedStaffProp?.id,
      name: selectedStaffProp?.name,
    });
    console.log("Selected Menu ID:", selectedMenuId);
    console.log("Salon ID:", salonId);
    console.groupEnd();
  }, [selectedStaffProp, selectedMenuId, salonId]);

  // useEffect フックをコンポーネントのトップレベルに移動
  useEffect(() => {
    setIsLoading(true);
    refreshData()
      .then(() => setIsLoading(false))
      .catch((error) => {
        console.error("データの取得中にエラーが発生しました:", error);
        setError("データの取得に失敗しました。再度お試しください。");
        setIsLoading(false);
      });
  }, [startDate, displayDays, selectedStaffProp, salonId, selectedMenuId]);

  // スタッフリストの取得
  const fetchStaffList = async () => {
    try {
      // メニューに対応できないスタッフのIDを取得
      let unavailableStaffIds: string[] = [];
      const menuIdNumber = parseInt(selectedMenuId, 10);

      if (selectedMenuId && !isNaN(menuIdNumber)) {
        // menuId が数値として有効な場合（= メニューID）だけ問い合わせする
        const { data: unavailableStaffData, error: unavailableStaffError } =
          await supabase
            .from("menu_item_unavailable_staff")
            .select("staff_id")
            .eq("menu_item_id", menuIdNumber);

        if (unavailableStaffError) {
          throw unavailableStaffError;
        }

        unavailableStaffIds = unavailableStaffData.map((item) => item.staff_id);
      } else {
        // それ以外（クーポンIDなど）は問い合わせをスキップ
        unavailableStaffIds = [];
      }

      // スタッフのリストを取得（対応不可スタッフを除外）
      let staffQuery = supabase
        .from("staff")
        .select("id, name")
        .eq("user_id", salonId);

      if (unavailableStaffIds.length > 0) {
        staffQuery = staffQuery.not(
          "id",
          "in",
          `(${unavailableStaffIds.join(",")})`
        );
      }

      const { data, error } = await staffQuery;

      if (error) {
        throw error;
      }

      setStaffList(data || []);
    } catch (error) {
      console.error("スタッフリストの取得中にエラーが発生しました:", error);
      setError("スタッフリストの取得に失敗しました");
    }
  };

  // 利用可能なスロットを取得
  const fetchAvailableSlots = async () => {
    console.group("Fetching Available Slots");
    const endDate = moment(startDate)
      .add(displayDays - 1, "days")
      .format("YYYY-MM-DD");
    try {
      const queryParams = new URLSearchParams({
        startDate: startDate.format("YYYY-MM-DD"),
        endDate,
        menuId: selectedMenuId,
        salonId,
        ...(selectedStaffProp?.id ? { staffId: selectedStaffProp.id } : {}),
      }).toString();

      console.log("Staff Shifts Request Parameters:", {
        startDate: startDate.format("YYYY-MM-DD"),
        endDate,
        menuId: selectedMenuId,
        salonId,
        selectedStaffId: selectedStaffProp?.id,
      });

      const response = await fetch(
        `/api/staff-availability?${queryParams.toString()}`,
        {
          cache: "no-cache",
        }
      );

      if (!response.ok) {
        throw new Error("スタッフの利用可能時間の取得に失敗しました");
      }
      const data = await response.json();

      console.log("Staff Shifts Response:", {
        totalDates: Object.keys(data).length,
        sampleDate: Object.keys(data)[0],
        sampleDateSlots: data[Object.keys(data)[0]],
        hasSelectedStaffSlots: selectedStaffProp
          ? Object.values(data).some((dateSlots) =>
              Object.values(dateSlots as Record<string, string[]>).some(
                (staffIds) => staffIds.includes(selectedStaffProp.id)
              )
            )
          : "No staff selected",
      });

      setAvailableSlots(data);
    } catch (error) {
      console.error("利用可能な時間枠の取得中にエラーが発生しました:", error);
      setError("利用可能な時間枠の取得に失敗しました");
    }
    console.groupEnd();
  };

  // 予約済みのスロットを取得
  const fetchReservedSlots = async () => {
    console.group("Fetching Reserved Slots");
    const endDate = moment(startDate)
      .add(displayDays - 1, "days")
      .format("YYYY-MM-DD");

    try {
      // 除外する予約ステータスを定義
      const excludeStatuses = ["cancelled", "salon_cancelled"];

      // 選択されたスタッフの予約を取得
      let selectedStaffReservations = {};
      if (selectedStaffProp) {
        const selectedStaffParams = new URLSearchParams({
          startDate: startDate.format("YYYY-MM-DD"),
          endDate,
          salonId,
          staffId: selectedStaffProp.id,
          excludeStatuses: excludeStatuses.join(","), // 除外するステータスをクエリに追加
        });

        const selectedStaffResponse = await fetch(
          `/api/staff-reservations?${selectedStaffParams.toString()}`,
          { cache: "no-cache" }
        );

        if (!selectedStaffResponse.ok) {
          throw new Error("スタッフの予約情報の取得に失敗しました");
        }

        selectedStaffReservations = await selectedStaffResponse.json();
      }

      // 全スタッフの予約を取得
      const allStaffParams = new URLSearchParams({
        startDate: startDate.format("YYYY-MM-DD"),
        endDate,
        salonId,
        excludeStatuses: excludeStatuses.join(","), // 除外するステータスをクエリに追加
      });

      const allStaffResponse = await fetch(
        `/api/staff-reservations?${allStaffParams.toString()}`,
        { cache: "no-cache" }
      );

      if (!allStaffResponse.ok) {
        throw new Error("全スタッフの予約情報の取得に失敗しました");
      }

      const allStaffReservations = await allStaffResponse.json();

      console.log("Reservations Response:", {
        selectedStaff: selectedStaffProp?.name,
        selectedStaffReservationsCount: Object.values(
          selectedStaffReservations
        ).flat().length,
        allStaffReservationsCount:
          Object.values(allStaffReservations).flat().length,
      });

      // DateSelection.tsx の fetchReservedSlots 関数内に追加
      console.group("Reserved Slots Debug");
      console.log("API Response - Selected Staff:", selectedStaffReservations);
      console.log("API Response - All Staff:", allStaffReservations);
      console.log("Final Reserved Slots State:", {
        selectedStaffReservations,
        allStaffReservations,
      });
      console.groupEnd();

      // slotAvailability の計算部分の直前に追加
      console.group("Slot Availability Calculation");
      console.log(
        "All Reservations before processing:",
        Object.values(reservedSlots.allStaffReservations).flat()
      );
      console.groupEnd();

      setReservedSlots({
        selectedStaffReservations,
        allStaffReservations,
      });

      // ==== ここから追加: 4日後の予約だけログを出す ====
      const fourDaysLater = moment().add(4, "days").startOf("day");
      // allStaffReservations の中から4日後のみ抽出
      const allResFlat = Object.values(allStaffReservations).flat();
      const fourDaysLaterReservations = allResFlat.filter((res: any) => {
        const start = moment.utc(res.startTime).tz("Asia/Tokyo").startOf("day");
        // 同一日かどうか isSame(..., 'day') で判定
        return start.isSame(fourDaysLater, "day");
      });

      console.group("=== All Staff Reservations (4日後のみ) ===");
      console.log("4日後:", fourDaysLater.format("YYYY-MM-DD"));
      console.dir(
        fourDaysLaterReservations.map((r: any) => ({
          id: r.id,
          staffId: r.staffId,
          startTime: r.startTime,
          endTime: r.endTime,
          is_staff_schedule: r.is_staff_schedule,
          status: r.status,
        })),
        { depth: null }
      );
      console.groupEnd();
      // ==== ここまで追加 ====
    } catch (error) {
      console.error("予約情報の取得中にエラーが発生しました:", error);
      setError("予約情報の取得に失敗しました");
    }
    console.groupEnd();
  };

  // 営業時間を取得
  const fetchOperatingHours = async () => {
    const endDate = moment(startDate)
      .add(displayDays - 1, "days")
      .format("YYYY-MM-DD");
    try {
      const response = await fetch(
        `/api/salon-operating-hours?salonId=${salonId}&startDate=${startDate.format(
          "YYYY-MM-DD"
        )}&endDate=${endDate}`
      );
      if (!response.ok) {
        throw new Error("営業時間の取得に失敗しました");
      }
      const { success, data } = await response.json();
      if (success) {
        setOperatingHours(data);
      } else {
        throw new Error("営業時間の取得に失敗しました");
      }
    } catch (error) {
      console.error("営業時間の取得中にエラーが発生しました:", error);
      setError("営業時間の取得に失敗しました");
    }
  };

  // 休日かどうかを判定
  const isHoliday = (date: moment.Moment): boolean => {
    const dateStr = date.format("YYYY-MM-DD");
    return operatingHours[dateStr]?.isHoliday || false;
  };

  // 年月行をレンダリング
  const renderYearMonthRow = (): JSX.Element => {
    const months: { [key: string]: number } = {};
    Array.from({ length: displayDays }, (_, i) => {
      const date = moment(startDate).add(i, "days");
      const key = `${date.year()}年${date.month() + 1}月`;
      if (!months[key]) {
        months[key] = 0;
      }
      months[key]++;
    });

    return (
      <TableRow>
        <StyledTableCell
          className="header year-month nav-button time"
          style={{ left: 0 }}
        >
          <OrangeButton
            onClick={handlePreviousPeriod}
            disabled={startDate.isSame(moment().startOf("day"), "day")}
            fullWidth
          >
            ◀前の{isMobile ? "一週間" : "二週間"}
          </OrangeButton>
        </StyledTableCell>
        {Object.entries(months).map(([key, count]) => (
          <StyledTableCell
            key={key}
            className="header year-month"
            colSpan={count}
          >
            <Typography variant="h6">{key}</Typography>
          </StyledTableCell>
        ))}
        <StyledTableCell
          className="header year-month nav-button time-right"
          style={{ right: 0 }}
        >
          <OrangeButton onClick={handleNextPeriod} fullWidth>
            次の{isMobile ? "一週間" : "二週間"}▶
          </OrangeButton>
        </StyledTableCell>
      </TableRow>
    );
  };

  // 曜日と日付の行をレンダリング
  const renderDayRow = (): JSX.Element => {
    return (
      <TableRow>
        <StyledTableCell className="header day-date time">時間</StyledTableCell>
        {Array.from({ length: displayDays }, (_, i) => {
          const date = moment(startDate).add(i, "days");
          const isSaturday = date.day() === 6;
          const isSunday = date.day() === 0;
          return (
            <StyledTableCell
              key={i}
              className={`header day-date ${isSaturday ? "saturday" : ""} ${
                isSunday ? "sunday" : ""
              }`}
            >
              <Typography variant="body2">{date.format("(ddd)")}</Typography>
              <Typography variant="h6">{date.format("D")}</Typography>
            </StyledTableCell>
          );
        })}
        <StyledTableCell className="header day-date time-right">
          時間
        </StyledTableCell>
      </TableRow>
    );
  };

  const timeSlots: string[] = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) =>
      moment("09:00", "HH:mm")
        .add(i * slotInterval, "minutes")
        .format("HH:mm")
    );
  }, []);

  // slotAvailability の useMemo を修正
  const slotAvailability = useMemo(() => {
    // 利用可能性を格納するオブジェクト
    const availability: Record<string, Record<string, boolean>> = {};
    // 予約不可の理由を格納するオブジェクト
    const slotAvailabilityReason: Record<
      string,
      Record<string, string | null>
    > = {};
    // 複数メニューの合計所要時間を計算
    const duration = selectedMenus.reduce((total, menu) => total + menu.duration, 0) || 60;

    // 全スタッフの予約から時間スロットごとの予約数を計算
    // すべての予約のリストを取得
    const allReservations = Object.values(
      reservedSlots.allStaffReservations
    ).flat();

    // サロンのキャパシティ計算用に “is_staff_schedule = false” のみを抜き出す
    const realReservationsForCapacity = allReservations.filter(
      (res) => !res.is_staff_schedule
    );

    // これを用いて “予約数” を集計する
    const reservationCounts: Record<string, number> = {};

    realReservationsForCapacity.forEach((reservation) => {
      const start = moment.utc(reservation.startTime).tz("Asia/Tokyo");
      const end = moment.utc(reservation.endTime).tz("Asia/Tokyo");

      for (
        let time = moment(start);
        time.isBefore(end);
        time.add(slotInterval, "minutes")
      ) {
        const timeKey = time.format("YYYY-MM-DD HH:mm");
        reservationCounts[timeKey] = (reservationCounts[timeKey] || 0) + 1;
      }
    });

    // 選択されたスタッフの予約時間をマッピング
    const selectedStaffReservations = new Map<string, boolean>();
    if (selectedStaffProp) {
      Object.values(reservedSlots.selectedStaffReservations)
        .flat()
        .forEach((reservation) => {
          const start = moment.utc(reservation.startTime).tz("Asia/Tokyo");
          const end = moment.utc(reservation.endTime).tz("Asia/Tokyo");

          for (
            let time = moment(start);
            time.isBefore(end);
            time.add(slotInterval, "minutes")
          ) {
            const key = time.format("YYYY-MM-DD HH:mm");
            selectedStaffReservations.set(key, true);
          }
        });
    }

    // 各日と時間スロットをループして利用可能性を判定
    for (let i = 0; i < displayDays; i++) {
      const date = moment(startDate).add(i, "days");
      const dateStr = date.format("YYYY-MM-DD");
      availability[dateStr] = {};
      slotAvailabilityReason[dateStr] = {};

      // 休日の場合は全部埋めておく
      if (isHoliday(date)) {
        timeSlots.forEach((time) => {
          availability[dateStr][time] = false;
          slotAvailabilityReason[dateStr][time] = "休日のため予約不可";
        });
        continue;
      }

      const maxCapacity = operatingHours[dateStr]?.capacity ?? 1;

      // サロンの営業時間を取得
      const salonOpenTimeStr = operatingHours[dateStr]?.openTime;
      const salonCloseTimeStr = operatingHours[dateStr]?.closeTime;

      // 営業時間が未設定の場合、その日の計算をスキップ
      if (!salonOpenTimeStr || !salonCloseTimeStr) {
        timeSlots.forEach((time) => {
          availability[dateStr][time] = false;
          slotAvailabilityReason[dateStr][time] = "営業時間が未設定";
        });
        continue;
      }

      // 営業時間を Moment オブジェクトに変換
      const salonOpenTime = moment.tz(
        `${dateStr} ${salonOpenTimeStr}`,
        "YYYY-MM-DD HH:mm:ss",
        "Asia/Tokyo"
      );
      const salonCloseTime = moment.tz(
        `${dateStr} ${salonCloseTimeStr}`,
        "YYYY-MM-DD HH:mm:ss",
        "Asia/Tokyo"
      );

      for (const time of timeSlots) {
        let isAvailable = true;
        let reason: string | null = null;

        const startDateTime = moment.tz(
          `${dateStr} ${time}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Tokyo"
        );
        const endDateTime = moment(startDateTime).add(duration, "minutes");

        // 1) 過去時間かどうか
        if (startDateTime.isBefore(moment().tz("Asia/Tokyo"))) {
          isAvailable = false;
          reason = "現在時刻より前の時間";
        }
        // 2) 営業時間外かどうか
        else if (
          startDateTime.isBefore(salonOpenTime) ||
          endDateTime.isAfter(salonCloseTime)
        ) {
          isAvailable = false;
          reason = "営業時間外";
        }
        // 3) キャパシティオーバーかどうか
        else {
          for (
            let currentTime = moment(startDateTime);
            currentTime.isBefore(endDateTime);
            currentTime.add(slotInterval, "minutes")
          ) {
            const timeKey = currentTime.format("YYYY-MM-DD HH:mm");
            const currentReservations = reservationCounts[timeKey] || 0;
            if (currentReservations >= maxCapacity) {
              isAvailable = false;
              reason = `サロン最大キャパシティ(${maxCapacity})超過`;
              break;
            }
          }
        }

        // 4) 指名スタッフが既に埋まっているか
        if (isAvailable && selectedStaffProp) {
          for (
            let currentTime = moment(startDateTime);
            currentTime.isBefore(endDateTime);
            currentTime.add(slotInterval, "minutes")
          ) {
            const key = currentTime.format("YYYY-MM-DD HH:mm");
            if (selectedStaffReservations.get(key)) {
              isAvailable = false;
              reason = "指名スタッフが他の予約で埋まっている";
              break;
            }
          }
        }

        availability[dateStr][time] = isAvailable;
        slotAvailabilityReason[dateStr][time] = reason;

        // 当日分のみデバッグログを出力
        const threeDaysLaterStr = moment().add(4, "days").format("YYYY-MM-DD");
        if (dateStr === threeDaysLaterStr) {
          console.log(
            `【${time}】${isAvailable ? "〇" : "×"} ${
              reason ? `- ${reason}` : ""
            }`
          );
        }
      }
    }

    // 当日分のみの詳細なデバッグ情報を出力
    const threeDaysLaterStr = moment().add(4, "days").format("YYYY-MM-DD");
    if (slotAvailabilityReason[threeDaysLaterStr]) {
      console.group("本日の予約可否状況");
      console.log("日付:", threeDaysLaterStr);
      console.log("営業時間:", operatingHours[threeDaysLaterStr]);
      console.log("予約状況:", slotAvailabilityReason[threeDaysLaterStr]);
      console.groupEnd();
    }

    return availability;
  }, [
    startDate,
    displayDays,
    timeSlots,
    selectedMenus,
    operatingHours,
    reservedSlots,
    selectedStaffProp,
    slotInterval,
  ]);

  // handleTimeSlotClick を修正
  const handleTimeSlotClick = (date: moment.Moment, time: string): void => {
    const dateStr = date.format("YYYY-MM-DD");
    if (!slotAvailability[dateStr]?.[time]) {
      setError("この時間帯は予約できません");
      return;
    }

    const startDateTime = moment.tz(
      `${dateStr} ${time}`,
      "YYYY-MM-DD HH:mm",
      "Asia/Tokyo"
    );
    // 複数メニューの合計所要時間を計算
    const duration = selectedMenus.reduce((total, menu) => total + menu.duration, 0) || 60;
    const endDateTime = moment(startDateTime).add(duration, "minutes");

    // 全ての予約を取得
    const allReservations = Object.values(reservedSlots).flat();

    // ① キャパシティ用にスタッフスケジュール以外だけを抽出
    const realReservationsForCapacity = allReservations.filter(
      (r) => !r.is_staff_schedule
    );

    // 予約データを効率的に検索できるようにマッピング
    const reservationMap = new Map<string, boolean>();
    realReservationsForCapacity.forEach((reservation) => {
      const staffId = reservation.staffId;
      const start = moment.utc(reservation.startTime).tz("Asia/Tokyo");
      const end = moment.utc(reservation.endTime).tz("Asia/Tokyo");

      for (
        let time = moment(start);
        time.isBefore(end);
        time.add(slotInterval, "minutes")
      ) {
        const key = `${time.format("YYYY-MM-DD HH:mm")}_${staffId}`;
        reservationMap.set(key, true);
      }
    });

    // その日の最大予約可能数を取得
    const maxCapacity = operatingHours[dateStr]?.capacity ?? 1;

    // 予約数チェック
    const overlappingCounts: Record<string, number> = {};
    realReservationsForCapacity.forEach((reservation) => {
      const start = moment.utc(reservation.startTime).tz("Asia/Tokyo");
      const end = moment.utc(reservation.endTime).tz("Asia/Tokyo");

      for (
        let time = moment(start);
        time.isBefore(end);
        time.add(slotInterval, "minutes")
      ) {
        const timeStr = time.format("YYYY-MM-DD HH:mm");
        overlappingCounts[timeStr] = (overlappingCounts[timeStr] || 0) + 1;
      }
    });
    for (
      let currentTime = moment(startDateTime);
      currentTime.isBefore(endDateTime);
      currentTime.add(slotInterval, "minutes")
    ) {
      const timeStr = currentTime.format("YYYY-MM-DD HH:mm");
      if ((overlappingCounts[timeStr] || 0) >= maxCapacity) {
        setError("この時間帯は予約が満席です");
        return;
      }
    }

    // スタッフの利用可能性をチェック
    let availableStaffIds = selectedStaffProp
      ? [selectedStaffProp.id]
      : staffList
          .filter((staff) => staff.name !== "フリー")
          .map((staff) => staff.id);

    for (
      let currentTime = moment(startDateTime);
      currentTime.isBefore(endDateTime);
      currentTime.add(slotInterval, "minutes")
    ) {
      const currentTimeStr = currentTime.format("HH:mm");
      const currentDateStr = currentTime.format("YYYY-MM-DD");

      const staffIdsAtTime = availableSlots[currentDateStr]?.[currentTimeStr];

      if (!staffIdsAtTime || staffIdsAtTime.length === 0) {
        setError("この時間帯には利用可能なスタッフがいません");
        return;
      }

      // 予約が入っていないスタッフを抽出
      const staffIdsNotReservedAtTime = staffIdsAtTime.filter((staffId) => {
        const key = `${currentTime.format("YYYY-MM-DD HH:mm")}_${staffId}`;
        return !reservationMap.has(key);
      });

      if (staffIdsNotReservedAtTime.length === 0) {
        setError("この時間帯には利用可能なスタッフがいません");
        return;
      }

      // スタッフの利用可能性を更新
      availableStaffIds = availableStaffIds.filter((staffId) =>
        staffIdsNotReservedAtTime.includes(staffId)
      );

      if (availableStaffIds.length === 0) {
        setError("この時間帯には利用可能なスタッフがいません");
        return;
      }
    }

    let selectedStaff = selectedStaffProp;

    if (!selectedStaff) {
      // 利用可能なスタッフからフリースタッフを除外して割り当て
      const assignableStaffIds = availableStaffIds.filter((staffId) => {
        const staff = staffList.find((s) => s.id === staffId);
        return staff && staff.name !== "フリー";
      });

      const randomIndex = Math.floor(Math.random() * assignableStaffIds.length);
      const assignedStaffId = assignableStaffIds[randomIndex];
      selectedStaff =
        staffList.find((staff) => staff.id === assignedStaffId) || null;
      setAssignedStaff(selectedStaff);
    } else {
      setAssignedStaff(selectedStaff);
    }

    setSelectedDateTime({
      start: startDateTime.toDate(),
      end: endDateTime.toDate(),
    });
    setIsDialogOpen(true);
  };

  // 予約確認ダイアログでの確定処理
  const handleConfirm = (): void => {
    if (selectedDateTime && assignedStaff) {
      onDateTimeSelect(
        selectedDateTime.start,
        selectedDateTime.end,
        assignedStaff
      );
    }
    setIsDialogOpen(false);
  };

  // 予約確認ダイアログでのキャンセル処理
  const handleCancel = (): void => {
    setIsDialogOpen(false);
    setSelectedDateTime(null);
    setAssignedStaff(null);
  };

  // 前の期間へ移動
  const handlePreviousPeriod = (): void => {
    const newStartDate = moment(startDate).subtract(isMobile ? 7 : 14, "days");
    if (newStartDate.isSameOrAfter(moment().startOf("day"), "day")) {
      setStartDate(newStartDate);
    }
  };

  // 次の期間へ移動
  const handleNextPeriod = (): void => {
    setStartDate(moment(startDate).add(isMobile ? 7 : 14, "days"));
  };

  // スロットをレンダリング
  const renderTimeSlots = (date: moment.Moment, time: string): JSX.Element => {
    const dateStr = date.format("YYYY-MM-DD");
    if (isLoading) {
      return <Skeleton variant="rectangular" width={40} height={40} />;
    }
    if (isHoliday(date)) {
      return (
        <Typography variant="body2" color="text.secondary">
          休業日
        </Typography>
      );
    }
    const isAvailable = slotAvailability[dateStr]?.[time] || false;

    return (
      <Tooltip title={isAvailable ? "予約可能" : "予約不可"} arrow>
        <span>
          <TimeSlotButton
            onClick={() => isAvailable && handleTimeSlotClick(date, time)}
            disabled={!isAvailable}
            className={isAvailable ? "available" : "unavailable"}
          >
            {isAvailable ? "〇" : "×"}
          </TimeSlotButton>
        </span>
      </Tooltip>
    );
  };

  if (isMobile) {
    // モバイルビューのレンダリング
    return (
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            marginTop: "20px",
            width: "100%",
            minHeight: "100vh",
            position: "relative",
            paddingBottom: "60px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <OrangeButton
              variant="contained"
              onClick={handlePreviousPeriod}
              disabled={startDate.isSame(moment(), "day")}
              startIcon={<ChevronLeft />}
            >
              前週
            </OrangeButton>
            <OrangeButton
              variant="contained"
              onClick={handleNextPeriod}
              endIcon={<ChevronRight />}
            >
              次週
            </OrangeButton>
          </Box>

          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "50vh",
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            Array.from({ length: 7 }, (_, i) => {
              const date = moment(startDate).add(i, "days");
              const dateStr = date.format("YYYY-MM-DD");
              const isSaturday = date.day() === 6;
              const isSunday = date.day() === 0;
              return (
                <Paper
                  key={dateStr}
                  sx={{ marginBottom: "16px", padding: "12px" }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      marginBottom: "8px",
                      fontWeight: "bold",
                      color: isSaturday
                        ? theme.palette.secondary.main
                        : isSunday
                        ? theme.palette.error.main
                        : "inherit",
                    }}
                  >
                    {date.format("M/D (ddd)")}
                  </Typography>
                  {isHoliday(date) ? (
                    <Typography variant="body2" color="text.secondary">
                      休業日
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                      }}
                    >
                      {timeSlots.map((time) => {
                        const isAvailable =
                          slotAvailability[dateStr]?.[time] || false;
                        return (
                          <MobileTimeSlotButton
                            key={time}
                            onClick={() =>
                              isAvailable && handleTimeSlotClick(date, time)
                            }
                            disabled={!isAvailable}
                            className={
                              isAvailable ? "available" : "unavailable"
                            }
                          >
                            {time}
                          </MobileTimeSlotButton>
                        );
                      })}
                    </Box>
                  )}
                </Paper>
              );
            })
          )}
          <Dialog
            open={isDialogOpen}
            onClose={handleCancel}
            TransitionComponent={Fade}
            transitionDuration={300}
          >
            <DialogTitle
              style={{
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
              }}
            >
              予約確認
            </DialogTitle>
            <DialogContent>
              <DialogContentText style={{ marginTop: "16px" }}>
                {selectedDateTime &&
                  `${moment(selectedDateTime.start).format(
                    "YYYY年M月D日(ddd) HH:mm"
                  )}〜${moment(selectedDateTime.end).format(
                    "HH:mm"
                  )}に予約しますか？`}
                <br />
                担当スタッフ:{" "}
                {assignedStaff?.name ||
                  selectedStaffProp?.name ||
                  "自動割り当て"}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCancel} color="primary">
                キャンセル
              </Button>
              <OrangeButton onClick={handleConfirm} variant="contained">
                確定
              </OrangeButton>
            </DialogActions>
          </Dialog>
          <Snackbar
            open={!!error}
            autoHideDuration={6000}
            onClose={() => setError(null)}
          >
            <Alert
              onClose={() => setError(null)}
              severity="error"
              variant="filled"
            >
              {error}
            </Alert>
          </Snackbar>
        </Box>
        <Box
          sx={{
            marginTop: "0px",
            paddingLeft: "20px",
          }}
        >
          <Button
            onClick={onBack}
            startIcon={<ChevronLeft />}
            variant="contained"
            color="primary"
            sx={{
              flexDirection: "row",
              alignItems: "center",
              color: "white",
              "& .MuiButton-startIcon": {
                marginRight: "4px",
              },
            }}
          >
            戻る
          </Button>
        </Box>
      </ThemeProvider>
    );
  }

  // デスクトップビューのレンダリング
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ marginTop: "20px", width: "100%", overflowX: "hidden" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
            justifyContent: "space-between",
          }}
        >
          <OrangeButton onClick={onBack} startIcon={<ChevronLeft />}>
            戻る
          </OrangeButton>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            スタッフ選択:{" "}
            {selectedStaffProp ? selectedStaffProp.name : "指名なし"}
          </Typography>
          <IconButton></IconButton>
        </Box>
        <Paper
          elevation={3}
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "12px",
          }}
        >
          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "50vh",
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <ScrollableTableContainer>
              <Table style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                <TableHead>
                  {renderYearMonthRow()}
                  {renderDayRow()}
                </TableHead>
                <TableBody>
                  {timeSlots.map((time, index) => (
                    <TableRow key={index}>
                      <StyledTableCell
                        className="time"
                        isHourBorder={time.endsWith(":00")}
                      >
                        {time}
                      </StyledTableCell>
                      {Array.from({ length: displayDays }, (_, i) => {
                        const date = moment(startDate).add(i, "days");
                        const dateStr = date.format("YYYY-MM-DD");
                        if (isHoliday(date)) {
                          return index === 0 ? (
                            <StyledTableCell
                              key={i}
                              className="holiday"
                              rowSpan={timeSlots.length}
                              isHourBorder={time.endsWith(":00")}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  height: "100%",
                                  borderRadius: "8px",
                                  padding: "8px",
                                }}
                              >
                                <Event
                                  sx={{
                                    fontSize: 40,
                                    color: "text.secondary",
                                  }}
                                />
                                <Typography
                                  variant="h6"
                                  color="text.secondary"
                                  sx={{
                                    mt: 1,
                                    writingMode: "vertical-rl",
                                    textOrientation: "upright",
                                    letterSpacing: "0.5em",
                                  }}
                                >
                                  休業日
                                </Typography>
                              </Box>
                            </StyledTableCell>
                          ) : null;
                        }
                        return (
                          <StyledTableCell
                            key={i}
                            isHourBorder={time.endsWith(":00")}
                          >
                            {renderTimeSlots(date, time)}
                          </StyledTableCell>
                        );
                      })}
                      <StyledTableCell
                        className="time-right"
                        isHourBorder={time.endsWith(":00")}
                      >
                        {time}
                      </StyledTableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollableTableContainer>
          )}
        </Paper>
        <Dialog
          open={isDialogOpen}
          onClose={handleCancel}
          TransitionComponent={Fade}
          transitionDuration={300}
        >
          <DialogTitle
            style={{
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            }}
          >
            予約確認
          </DialogTitle>
          <DialogContent>
            <DialogContentText style={{ marginTop: "16px" }}>
              {selectedDateTime &&
                `${moment(selectedDateTime.start).format(
                  "YYYY年M月D日(ddd) HH:mm"
                )}〜${moment(selectedDateTime.end).format(
                  "HH:mm"
                )}に予約しますか？`}
              <br />
              担当スタッフ:{" "}
              {assignedStaff?.name || selectedStaffProp?.name || "指定なし"}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancel} color="primary">
              キャンセル
            </Button>
            <OrangeButton onClick={handleConfirm} variant="contained">
              確定
            </OrangeButton>
          </DialogActions>
        </Dialog>
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
        >
          <Alert
            onClose={() => setError(null)}
            severity="error"
            variant="filled"
          >
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default DateSelection;
