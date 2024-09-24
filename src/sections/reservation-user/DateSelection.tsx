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
  TableCellProps,
  Tooltip,
  IconButton,
  Fade,
} from "@mui/material";
import { ChevronLeft, ChevronRight, Info, Event } from "@mui/icons-material";
import moment from "moment";
import "moment/locale/ja";
import { useReservation } from "@/contexts/reservationcontext";
import { useParams } from "next/navigation";

moment.locale("ja");

interface DateSelectionProps {
  onDateTimeSelect: (startTime: Date, endTime: Date) => void;
  onBack: () => void;
  selectedStaff: { id: string; name: string } | null;
  selectedMenuId: string;
}

// テーマの色を修正
const theme = createTheme({
  palette: {
    primary: {
      main: "#f97316", // オレンジ色
    },
    secondary: {
      main: "#3b82f6", // ブルー色（土曜日用）
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
      main: "#ef4444", // 赤色
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

interface StyledTableCellProps extends TableCellProps {
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
  width: "80px", // 固定幅を設定
  minWidth: "80px",
  maxWidth: "80px", // 最大幅も設定して一定に保つ
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
    color: theme.palette.secondary.main, // 土曜日の色をブルーに変更
  },
  "&.sunday": {
    color: theme.palette.error.main,
  },
  "&.holiday": {
    backgroundColor: "#f0f4f8", // 休業日の背景色をナチュラルな色に変更
  },
}));

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
  // 予約済みのスロットを灰色の×に変更
  "&.reserved": {
    color: theme.palette.text.disabled,
  },
}));

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

const OrangeButton = styled(Button)(({ theme }) => ({
  backgroundColor: "#f97316",
  color: "white",
  "&:hover": {
    backgroundColor: "#ea580c",
  },
}));

const DateSelection: React.FC<DateSelectionProps> = ({
  onDateTimeSelect,
  onBack,
  selectedStaff: selectedStaffProp,
  selectedMenuId,
}) => {
  const [startDate, setStartDate] = useState(moment().startOf("day"));
  const [availableSlots, setAvailableSlots] = useState<
    Record<string, string[]>
  >({});
  const [reservedSlots, setReservedSlots] = useState<
    Record<string, { startTime: string; endTime: string }[]>
  >({});
  const [operatingHours, setOperatingHours] = useState<
    Record<
      string,
      { isHoliday: boolean; openTime: string | null; closeTime: string | null }
    >
  >({});
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedStaff } = useReservation();
  const params = useParams();
  const salonId = params["user-id"] as string;

  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const displayDays = isMobile ? 7 : 14;

  useEffect(() => {
    if (selectedStaffProp) {
      fetchAvailableSlots();
      fetchReservedSlots();
    }
    fetchOperatingHours();
  }, [startDate, displayDays, selectedStaffProp, salonId, selectedMenuId]);

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

  const fetchReservedSlots = async () => {
    if (!selectedStaff) {
      return;
    }

    const endDate = moment(startDate)
      .add(displayDays - 1, "days")
      .format("YYYY-MM-DD");
    try {
      const response = await fetch(
        `/api/staff-reservations?staffId=${
          selectedStaff.id
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

  const generateTimeSlots = (
    shifts: { startTime: string; endTime: string }[]
  ): string[] => {
    const allSlots = Array.from({ length: 28 }, (_, i) =>
      moment("09:00", "HH:mm")
        .add(i * 30, "minutes")
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

  const isSlotAvailable = (date: string, time: string): boolean => {
    const dateTimeString = `${date}T${time}:00`;
    const slotDateTime = moment(dateTimeString);

    const isAvailableInShift = availableSlots[date]?.includes(time);

    const isReserved = reservedSlots[date]?.some((reservation) => {
      const reservationStart = moment(reservation.startTime);
      const reservationEnd = moment(reservation.endTime);
      return slotDateTime.isBetween(
        reservationStart,
        reservationEnd,
        null,
        "[)"
      );
    });

    return isAvailableInShift && !isReserved;
  };

  const handleTimeSlotClick = (date: moment.Moment, time: string): void => {
    const selectedDate = date.format("YYYY-MM-DD");
    const startDateTime = moment(`${selectedDate} ${time}`).toDate();
    const endDateTime = moment(startDateTime).add(1, "hour").toDate(); // 仮に1時間後を終了時間とする
    setSelectedDateTime(startDateTime);
    setIsDialogOpen(true);
  };

  const handleConfirm = (): void => {
    if (selectedDateTime) {
      const endDateTime = moment(selectedDateTime).add(1, "hour").toDate(); // 仮に1時間後を終了時間とする
      onDateTimeSelect(selectedDateTime, endDateTime);
    }
    setIsDialogOpen(false);
  };

  const handleCancel = (): void => {
    setIsDialogOpen(false);
    setSelectedDateTime(null);
  };

  const handlePreviousPeriod = (): void => {
    const newStartDate = moment(startDate).subtract(7, "days");
    if (newStartDate.isSameOrAfter(moment(), "day")) {
      setStartDate(newStartDate);
    }
  };

  const handleNextPeriod = (): void => {
    setStartDate(moment(startDate).add(7, "days"));
  };

  const isHoliday = (date: moment.Moment): boolean => {
    const dateStr = date.format("YYYY-MM-DD");
    return operatingHours[dateStr]?.isHoliday || false;
  };

  const renderTimeSlots = (date: moment.Moment, time: string): JSX.Element => {
    const dateStr = date.format("YYYY-MM-DD");
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
            disabled={startDate.isSame(moment(), "day")}
            fullWidth
          >
            ◀前の{isMobile ? "一週間" : "二週間"}
          </OrangeButton>
        </StyledTableCell>
        {Object.entries(months).map(([key, count], index) => (
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
      .add(i * 30, "minutes")
      .format("HH:mm")
  );

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
            スタッフ選択: {selectedStaff ? selectedStaff.name : "未選択"}
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
          <Table style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <TableHead>
              {renderYearMonthRow()}
              {renderDayRow()}
            </TableHead>
          </Table>
          <ScrollableTableContainer>
            <Table style={{ borderCollapse: "separate", borderSpacing: 0 }}>
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
                `${moment(selectedDateTime).format(
                  "YYYY年M月D日(ddd) HH:mm"
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
