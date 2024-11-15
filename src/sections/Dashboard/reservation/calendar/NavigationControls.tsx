import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  Theme,
  useMediaQuery,
} from "@mui/material";
import { PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarMonth } from "@mui/icons-material";
import moment from "moment";
import { StaticDatePicker } from "@mui/x-date-pickers/StaticDatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";

interface NavigationControlsProps {
  currentDate: moment.Moment;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onAddReservation: () => void;
  onAddStaffSchedule: () => void;
  onDateChange: (date: moment.Moment | null) => void;
}

const NavigationControls: React.FC<NavigationControlsProps> = ({
  currentDate,
  onPrevDay,
  onNextDay,
  onToday,
  onAddReservation,
  onAddStaffSchedule,
  onDateChange,
}) => {
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("sm")
  );
  const isSmallScreen = useMediaQuery("(max-width: 1168px)");
  const isMediumScreen = useMediaQuery("(max-width: 1229px)");
  const isLargeScreen = useMediaQuery("(max-width: 1290px)");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // テキストサイズの動的な計算
  const getTextSize = () => {
    if (isSmallScreen) return "text-xs";
    if (isMediumScreen) return "text-xs";
    if (isLargeScreen) return "text-sm";
    return "text-base";
  };

  // ボタンテキストの表示制御
  const getButtonText = (text: string) => {
    if (isSmallScreen) return "";
    return text;
  };

  return (
    <Box
      sx={{
        mb: 3,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            variant="outlined"
            onClick={onPrevDay}
            sx={{
              color: "#F25C05",
              borderColor: "#F25C05",
              minWidth: 0,
              padding: { xs: "4px 8px", sm: "6px 16px" },
              fontSize: isSmallScreen
                ? "0.75rem"
                : isMediumScreen
                ? "0.875rem"
                : "1rem",
            }}
          >
            <ChevronLeft
              className={`${isSmallScreen ? "h-3 w-3" : "h-4 w-4"}`}
            />
            <span
              className={`ml-1 ${
                isSmallScreen ? "hidden" : "inline"
              } ${getTextSize()}`}
            >
              {getButtonText("前日")}
            </span>
          </Button>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              className={getTextSize()}
              sx={{
                whiteSpace: "nowrap",
                fontSize: {
                  xs: "1rem",
                  sm: isSmallScreen
                    ? "0.875rem"
                    : isMediumScreen
                    ? "1rem"
                    : "1.25rem",
                },
              }}
            >
              {currentDate.format("YYYY年M月D日(ddd)")}
            </Typography>
            <IconButton
              onClick={() => setDatePickerOpen(true)}
              sx={{
                color: "#F25C05",
                fontSize: isSmallScreen ? "1.5rem" : "2rem",
              }}
            >
              <CalendarMonth fontSize="inherit" />
            </IconButton>
          </Box>

          <Button
            variant="outlined"
            onClick={onNextDay}
            sx={{
              color: "#F25C05",
              borderColor: "#F25C05",
              minWidth: 0,
              padding: { xs: "4px 8px", sm: "6px 16px" },
              fontSize: isSmallScreen
                ? "0.75rem"
                : isMediumScreen
                ? "0.875rem"
                : "1rem",
            }}
          >
            <span
              className={`mr-1 ${
                isSmallScreen ? "hidden" : "inline"
              } ${getTextSize()}`}
            >
              {getButtonText("翌日")}
            </span>
            <ChevronRight
              className={`${isSmallScreen ? "h-3 w-3" : "h-4 w-4"}`}
            />
          </Button>
        </Box>

        <Button
          variant="outlined"
          onClick={onToday}
          sx={{
            color: "#F25C05",
            borderColor: "#F25C05",
            fontSize: isSmallScreen
              ? "0.75rem"
              : isMediumScreen
              ? "0.875rem"
              : "1rem",
          }}
        >
          <span className={getTextSize()}>今日</span>
        </Button>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
          gap: 2,
          width: { xs: "100%", sm: "auto" },
        }}
      >
        <Button
          variant="contained"
          onClick={onAddReservation}
          sx={{
            backgroundColor: "#F25C05",
            "&:hover": { backgroundColor: "#d94f04" },
            width: { xs: "100%", sm: "auto" },
            fontSize: isSmallScreen
              ? "0.75rem"
              : isMediumScreen
              ? "0.875rem"
              : "1rem",
          }}
        >
          <PlusCircle
            className={`mr-2 ${isSmallScreen ? "h-3 w-3" : "h-4 w-4"}`}
          />
          <span className={getTextSize()}>新規予約</span>
        </Button>

        <Button
          variant="contained"
          onClick={onAddStaffSchedule}
          sx={{
            backgroundColor: "#F25C05",
            "&:hover": { backgroundColor: "#d94f04" },
            width: { xs: "100%", sm: "auto" },
            fontSize: isSmallScreen
              ? "0.75rem"
              : isMediumScreen
              ? "0.875rem"
              : "1rem",
          }}
        >
          <PlusCircle
            className={`mr-2 ${isSmallScreen ? "h-3 w-3" : "h-4 w-4"}`}
          />
          <span className={getTextSize()}>スタッフスケジュール追加</span>
        </Button>
      </Box>

      <LocalizationProvider dateAdapter={AdapterMoment}>
        <Dialog
          open={datePickerOpen}
          onClose={() => setDatePickerOpen(false)}
          sx={{
            "& .MuiDialog-paper": {
              margin: { xs: "16px", sm: "32px" },
            },
          }}
        >
          <StaticDatePicker
            displayStaticWrapperAs="desktop"
            value={currentDate}
            onChange={(date) => {
              if (date) {
                onDateChange(date);
              }
              setDatePickerOpen(false);
            }}
          />
        </Dialog>
      </LocalizationProvider>
    </Box>
  );
};

export default NavigationControls;
