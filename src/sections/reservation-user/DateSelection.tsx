"use client";

import React, { useState, useEffect } from "react";
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
  CircularProgress
} from "@mui/material";
import { ChevronLeft, ChevronRight, Info, Event } from "@mui/icons-material";
import moment from "moment";
import "moment/locale/ja";
import { useReservation } from "@/contexts/reservationcontext";
import { useParams } from "next/navigation";
import { SelectedDateTime } from '@/contexts/reservationcontext';

moment.locale("ja"); // 日本語ロケールを設定

interface DateSelectionProps {
  onDateTimeSelect: (startTime: Date, endTime: Date) => void;
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
    Record<string, string[]>
  >({}); // 利用可能な時間スロット
  const [reservedSlots, setReservedSlots] = useState<
    Record<string, { startTime: string; endTime: string }[]>
  >({}); // 予約済みの時間スロット
  const [operatingHours, setOperatingHours] = useState<
    Record<
      string,
      { isHoliday: boolean; openTime: string | null; closeTime: string | null }
    >
  >({}); // 営業時間情報
  const [selectedDateTime, setSelectedDateTime] = useState<SelectedDateTime | null>(null); // 選択された日時
  const [isDialogOpen, setIsDialogOpen] = useState(false); // ダイアログの表示状態
  const [error, setError] = useState<string | null>(null); // エラーメッセージ
  const { selectedStaff, selectedMenus } = useReservation();
  const params = useParams();
  const salonId = params["user-id"] as string;

  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // モバイル判定
  const displayDays = isMobile ? 7 : 14; // 表示する日数

  useEffect(() => {
    if (selectedStaffProp) {
      setIsLoading(true);
      Promise.all([fetchAvailableSlots(), fetchReservedSlots(), fetchOperatingHours()])
        .then(() => setIsLoading(false))
        .catch((error) => {
          console.error("Error fetching data:", error);
          setError("データの取得に失敗しました。再度お試しください。");
          setIsLoading(false);
        });
    }
  }, [startDate, displayDays, selectedStaffProp, salonId, selectedMenuId]);

  // 利用可能なスロットを取得
  const fetchAvailableSlots = async () => {
    if (!selectedStaffProp) {
      setError("スタッフが選択されていません");
      return;
    }

    const endDate = moment(startDate)
      .add(displayDays - 1, "days")
      .format("YYYY-MM-DD");
    try {
      const response = await fetch(
        `/api/staff-availability?staffId=${
          selectedStaffProp.id
        }&startDate=${startDate.format(
          "YYYY-MM-DD"
        )}&endDate=${endDate}&menuId=${selectedMenuId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch staff availability");
      }
      const data = await response.json();

      const newAvailableSlots: Record<string, string[]> = {};
      for (let i = 0; i < displayDays; i++) {
        const date = moment(startDate).add(i, "days").format("YYYY-MM-DD");
        const shifts = data[date] || [];
        newAvailableSlots[date] = generateTimeSlots(shifts);
      }
      setAvailableSlots(newAvailableSlots);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      setError("利用可能な時間枠の取得に失敗しました");
    }
  };

  // 予約済みのスロットを取得
  const fetchReservedSlots = async () => {
    if (!selectedStaffProp) {
      return;
    }

    const endDate = moment(startDate)
      .add(displayDays - 1, "days")
      .format("YYYY-MM-DD");
    try {
      const response = await fetch(
        `/api/staff-reservations?staffId=${
          selectedStaffProp.id
        }&startDate=${startDate.format("YYYY-MM-DD")}&endDate=${endDate}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch staff reservations");
      }
      const data = await response.json();
      setReservedSlots(data);
    } catch (error) {
      console.error("Error fetching reserved slots:", error);
      setError("予約済み時間帯の取得に失敗しました");
    }
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
        throw new Error("Failed to fetch salon operating hours");
      }
      const { success, data } = await response.json();
      if (success) {
        setOperatingHours(data);
      } else {
        throw new Error("Failed to fetch salon operating hours");
      }
    } catch (error) {
      console.error("Error fetching operating hours:", error);
      setError("営業時間の取得に失敗しました");
    }
  };

  // スロットを生成
  const generateTimeSlots = (
    shifts: { startTime: string; endTime: string }[]
  ): string[] => {
    const allSlots = Array.from({ length: 28 }, (_, i) =>
      moment("09:00", "HH:mm")
        .add(i * slotInterval, "minutes")
        .format("HH:mm")
    );

    return allSlots.filter((slot) =>
      shifts.some((shift) =>
        moment(slot, "HH:mm").isBetween(
          moment(shift.startTime, "HH:mm"),
          moment(shift.endTime, "HH:mm"),
          null,
          "[]"
        )
      )
    );
  };

  // スロットが利用可能かチェック
  const isSlotAvailable = (date: string, time: string): boolean => {
    const duration = selectedMenus[0]?.duration || 60;
    const requiredSlots = Math.ceil(duration / slotInterval);

    for (let i = 0; i < requiredSlots; i++) {
      const currentSlotTime = moment(time, "HH:mm")
        .add(i * slotInterval, "minutes")
        .format("HH:mm");

      const isAvailableInShift = availableSlots[date]?.includes(currentSlotTime);

      if (!isAvailableInShift) {
        return false;
      }

      const currentSlotDateTime = moment(`${date}T${currentSlotTime}:00`);

      const isReservedOrStaffSchedule = reservedSlots[date]?.some((reservation) => {
        const reservationStart = moment(reservation.startTime);
        const reservationEnd = moment(reservation.endTime);
        return currentSlotDateTime.isBetween(
          reservationStart,
          reservationEnd,
          null,
          "[)"
        );
      });

      if (isReservedOrStaffSchedule) {
        return false;
      }
    }

    return true;
  };

  // 時間スロットクリック時の処理
  const handleTimeSlotClick = (date: moment.Moment, time: string): void => {
    const selectedDate = date.format("YYYY-MM-DD");
    const startDateTime = moment(`${selectedDate} ${time}`).toDate();
    const duration = selectedMenus[0]?.duration || 60;
    const endDateTime = moment(startDateTime).add(duration, "minutes").toDate();
    setSelectedDateTime({ start: startDateTime, end: endDateTime });
    setIsDialogOpen(true);
  };

  // 予約確認ダイアログでの確定処理
  const handleConfirm = (): void => {
    if (selectedDateTime) {
      onDateTimeSelect(selectedDateTime.start, selectedDateTime.end);
    }
    setIsDialogOpen(false);
  };

  // 予約確認ダイアログでのキャンセル処理
  const handleCancel = (): void => {
    setIsDialogOpen(false);
    setSelectedDateTime(null);
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

  const timeSlots: string[] = Array.from({ length: 28 }, (_, i) =>
    moment("09:00", "HH:mm")
      .add(i * slotInterval, "minutes")
      .format("HH:mm")
  );

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
    const isAvailable = isSlotAvailable(dateStr, time);
    const isReserved = reservedSlots[dateStr]?.some((reservation) =>
      moment(`${dateStr}T${time}`).isBetween(
        moment(reservation.startTime),
        moment(reservation.endTime),
        null,
        "[)"
      )
    );

    return (
      <Tooltip
        title={isAvailable ? "予約可能" : isReserved ? "予約済み" : "予約不可"}
        arrow
      >
        <TimeSlotButton
          onClick={() => isAvailable && handleTimeSlotClick(date, time)}
          disabled={!isAvailable || isReserved}
          className={
            isReserved ? "reserved" : isAvailable ? "available" : "unavailable"
          }
        >
          {isAvailable ? "〇" : "×"}
        </TimeSlotButton>
      </Tooltip>
    );
  };

  if (isMobile) {
    // モバイルビューのレンダリング
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ marginTop: "20px", width: "100%", minHeight: "100vh", position: "relative", paddingBottom: "60px" }}>
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
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
              <CircularProgress />
            </Box>
          ) : (
            Array.from({ length: 7 }, (_, i) => {
              const date = moment(startDate).add(i, "days");
              const dateStr = date.format("YYYY-MM-DD");
              const isSaturday = date.day() === 6;
              const isSunday = date.day() === 0;
              return (
                <Paper key={dateStr} sx={{ marginBottom: "16px", padding: "12px" }}>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      marginBottom: "8px", 
                      fontWeight: "bold",
                      color: isSaturday 
                        ? theme.palette.secondary.main 
                        : isSunday 
                        ? theme.palette.error.main 
                        : "inherit"
                    }}
                  >
                    {date.format("M/D (ddd)")}
                  </Typography>
                  {isHoliday(date) ? (
                    <Typography variant="body2" color="text.secondary">
                      休業日
                    </Typography>
                  ) : (
                    <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
                      {timeSlots.map((time) => {
                        const isAvailable = isSlotAvailable(dateStr, time);
                        const isReserved = reservedSlots[dateStr]?.some((reservation) =>
                          moment(`${dateStr}T${time}`).isBetween(
                            moment(reservation.startTime),
                            moment(reservation.endTime),
                            null,
                            "[)"
                          )
                        );
                        return (
                          <MobileTimeSlotButton
                            key={time}
                            onClick={() =>
                              isAvailable && handleTimeSlotClick(date, time)
                            }
                            disabled={!isAvailable || isReserved}
                            className={
                              isReserved
                                ? "reserved"
                                : isAvailable
                                ? "available"
                                : "unavailable"
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
                  )}〜${moment(selectedDateTime.end).format("HH:mm")}に予約しますか？`}
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
              flexDirection: 'row', 
              alignItems: 'center',
              color: 'white',
              '& .MuiButton-startIcon': {
                marginRight: '4px',
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
            スタッフ選択: {selectedStaffProp ? selectedStaffProp.name : "未選択"}
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
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
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
                              rowSpan={28}
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
                                  sx={{ fontSize: 40, color: "text.secondary" }}
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
