import React, { useState, useEffect, useCallback } from "react";
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
} from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import moment from "moment";
import "moment/locale/ja";
import { useReservation } from "@/contexts/reservationcontext";

moment.locale("ja");

interface DateSelectionProps {
  onDateTimeSelect: (startTime: Date, endTime: Date) => void;
  onBack: () => void;
  selectedStaffId: string | null;
  selectedMenuId: string;
}

const theme = createTheme({
  palette: {
    primary: {
      main: "#3a86ff",
    },
    secondary: {
      main: "#ff006e",
    },
    background: {
      default: "#f8f9fa",
      paper: "#ffffff",
    },
    text: {
      primary: "#333333",
      secondary: "#666666",
    },
  },
  typography: {
    fontFamily: '"Noto Sans JP", sans-serif',
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
  width: "80px",
  minWidth: "80px",
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
    color: theme.palette.primary.main,
  },
  "&.sunday": {
    color: theme.palette.secondary.main,
  },
  "&.holiday": {
    backgroundColor: theme.palette.action.disabledBackground,
  },
}));

const TimeSlotButton = styled(Button)(({ theme }) => ({
  minWidth: "100%",
  width: "100%",
  height: "100%",
  padding: "2px",
  fontSize: "0.9rem",
  borderRadius: "4px",
  "&.available": {
    color: theme.palette.primary.main,
  },
  "&.unavailable": {
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
    width: "10px",
  },
  "&::-webkit-scrollbar-track": {
    background: "transparent",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: theme.palette.grey[300],
    borderRadius: "5px",
  },
  paddingRight: "10px",
}));

const DateSelection: React.FC<DateSelectionProps> = ({
  onDateTimeSelect,
  onBack,
  selectedStaffId,
  selectedMenuId,
}) => {
  const [startDate, setStartDate] = useState(moment().startOf("day"));
  const [availableSlots, setAvailableSlots] = useState<
    Record<string, string[]>
  >({});
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuDuration, setMenuDuration] = useState<number>(0);

  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const displayDays = isMobile ? 7 : 14;

  useEffect(() => {
    if (selectedStaffId && selectedMenuId) {
      fetchStaffShifts();
      fetchMenuDuration();
    }
  }, [startDate, displayDays, selectedStaffId, selectedMenuId]);

  const fetchStaffShifts = async () => {
    try {
      const endDate = startDate
        .clone()
        .add(displayDays - 1, "days")
        .format("YYYY-MM-DD");
      const response = await fetch(
        `/api/get-staff-shifts?staffId=${selectedStaffId}&startDate=${startDate.format(
          "YYYY-MM-DD"
        )}&endDate=${endDate}`
      );
      if (!response.ok) throw new Error("Failed to fetch staff shifts");
      const shifts = await response.json();
      processShiftsData(shifts);
    } catch (err) {
      console.error("Error fetching staff shifts:", err);
      setError("スタッフのシフト情報の取得に失敗しました");
    }
  };

  const fetchMenuDuration = async () => {
    try {
      const response = await fetch(
        `/api/get-menu-duration?menuId=${selectedMenuId}`
      );
      if (!response.ok) throw new Error("Failed to fetch menu duration");
      const { duration } = await response.json();
      setMenuDuration(duration);
    } catch (err) {
      console.error("Error fetching menu duration:", err);
      setError("メニュー情報の取得に失敗しました");
    }
  };

  const processShiftsData = (shifts: any[]) => {
    const slots: Record<string, string[]> = {};
    shifts.forEach((shift) => {
      if (shift.shift_status === "出勤") {
        const date = moment(shift.date).format("YYYY-MM-DD");
        const startTime = moment(shift.start_time, "HH:mm:ss");
        const endTime = moment(shift.end_time, "HH:mm:ss");
        slots[date] = [];
        while (startTime.isBefore(endTime)) {
          slots[date].push(startTime.format("HH:mm"));
          startTime.add(30, "minutes");
        }
      }
    });
    setAvailableSlots(slots);
  };

  const handleTimeSlotClick = (date: moment.Moment, time: string) => {
    const startTime = moment(`${date.format("YYYY-MM-DD")} ${time}`);
    const endTime = startTime.clone().add(menuDuration, "minutes");
    setSelectedStartTime(startTime.toDate());
    setSelectedEndTime(endTime.toDate());
    setIsDialogOpen(true);
  };

  const handleConfirm = () => {
    if (selectedStartTime && selectedEndTime) {
      onDateTimeSelect(selectedStartTime, selectedEndTime);
    }
    setIsDialogOpen(false);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setSelectedStartTime(null);
    setSelectedEndTime(null);
  };

  const handlePreviousPeriod = () => {
    const newStartDate = moment(startDate).subtract(7, "days");
    if (newStartDate.isSameOrAfter(moment(), "day")) {
      setStartDate(newStartDate);
    }
  };

  const handleNextPeriod = () => {
    setStartDate(moment(startDate).add(7, "days"));
  };

  const isHoliday = (date: moment.Moment) => {
    return date.date() === 25; // 例: 25日を休業日とする
  };

  const renderTimeSlots = (date: moment.Moment, time: string) => {
    const dateStr = date.format("YYYY-MM-DD");
    const slots = availableSlots[dateStr] || [];
    const isAvailable = slots.includes(time);
    return (
      <TimeSlotButton
        onClick={() => isAvailable && handleTimeSlotClick(date, time)}
        disabled={!isAvailable}
        className={isAvailable ? "available" : "unavailable"}
      >
        {isAvailable ? "〇" : "×"}
      </TimeSlotButton>
    );
  };

  const timeSlots = Array.from({ length: 28 }, (_, i) =>
    moment("09:00", "HH:mm")
      .add(i * 30, "minutes")
      .format("HH:mm")
  );

  const renderYearMonthRow = () => {
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
          <Button
            onClick={handlePreviousPeriod}
            disabled={startDate.isSame(moment(), "day")}
            fullWidth
          >
            ◀前の{isMobile ? "一週間" : "二週間"}
          </Button>
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
          <Button onClick={handleNextPeriod} fullWidth>
            次の{isMobile ? "一週間" : "二週間"}▶
          </Button>
        </StyledTableCell>
      </TableRow>
    );
  };

  const renderDayRow = () => {
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

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ marginTop: "20px", width: "100%", overflowX: "hidden" }}>
        <Button
          onClick={onBack}
          startIcon={<ChevronLeft />}
          style={{ marginBottom: "10px" }}
        >
          戻る
        </Button>
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            border: "2px solid #000",
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
                            <Typography variant="h6">休業日</Typography>
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
        </Box>
        <Dialog open={isDialogOpen} onClose={handleCancel}>
          <DialogTitle
            style={{
              backgroundColor: theme.palette.primary.light,
              color: theme.palette.primary.contrastText,
            }}
          >
            予約確認
          </DialogTitle>
          <DialogContent>
            <DialogContentText style={{ marginTop: "16px" }}>
              {selectedStartTime &&
                selectedEndTime &&
                `${moment(selectedStartTime).format(
                  "YYYY年M月D日(ddd) HH:mm"
                )} - ${moment(selectedEndTime).format(
                  "HH:mm"
                )}に予約しますか？`}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancel} color="primary">
              キャンセル
            </Button>
            <Button onClick={handleConfirm} variant="contained" color="primary">
              確定
            </Button>
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
