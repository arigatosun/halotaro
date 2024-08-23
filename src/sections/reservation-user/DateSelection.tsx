import React, { useState, useEffect } from 'react';
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
  TableCellProps
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import moment from 'moment';
import 'moment/locale/ja';

moment.locale('ja');

interface DateSelectionProps {
  onDateTimeSelect: (dateTime: Date) => void;
  onBack: () => void;
}

const theme = createTheme({
  palette: {
    primary: {
      main: '#3a86ff',
    },
    secondary: {
      main: '#ff006e',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
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
  shouldForwardProp: (prop) => prop !== 'isHourBorder',
})<StyledTableCellProps>(({ theme, isHourBorder }) => ({
  padding: '4px',
  textAlign: 'center',
  borderRight: `1px solid ${theme.palette.divider}`,
  borderBottom: isHourBorder ? `2px solid ${theme.palette.divider}` : `1px solid ${theme.palette.divider}`,
  width: '80px',
  minWidth: '80px',
  height: '40px',
  '&.header': {
    backgroundColor: theme.palette.background.paper,
    zIndex: 2,
  },
  '&.year-month': {
    position: 'sticky',
    top: 0,
    zIndex: 3,
    backgroundColor: theme.palette.background.paper,
  },
  '&.day-date': {
    position: 'sticky',
    top: '40px',
    zIndex: 3,
    backgroundColor: theme.palette.background.paper,
  },
  '&.time': {
    left: 0,
    zIndex: 4,
    position: 'sticky',
    backgroundColor: theme.palette.background.paper,
  },
  '&.time-right': {
    right: 0,
    zIndex: 4,
    position: 'sticky',
    backgroundColor: theme.palette.background.paper,
  },
  '&.nav-button': {
    zIndex: 5,
  },
  '&.date': {
    position: 'sticky',
    top: '96px',
    zIndex: 2,
    backgroundColor: theme.palette.background.paper,
  },
  '&.saturday': {
    color: theme.palette.primary.main,
  },
  '&.sunday': {
    color: theme.palette.secondary.main,
  },
  '&.holiday': {
    backgroundColor: theme.palette.action.disabledBackground,
  },
}));

const TimeSlotButton = styled(Button)(({ theme }) => ({
  minWidth: '100%',
  width: '100%',
  height: '100%',
  padding: '2px',
  fontSize: '0.9rem',
  borderRadius: '4px',
  '&.available': {
    color: theme.palette.primary.main,
  },
  '&.unavailable': {
    color: theme.palette.text.disabled,
  },
}));

const ScrollableTableContainer = styled(TableContainer)<{ component?: React.ElementType }>(({ theme }) => ({
  maxHeight: 'calc(100vh - 280px)',
  overflow: 'auto',
  width: '100%',
  '&::-webkit-scrollbar': {
    width: '10px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.grey[300],
    borderRadius: '5px',
  },
  paddingRight: '10px',
}));

const DateSelection: React.FC<DateSelectionProps> = ({ onDateTimeSelect, onBack }) => {
  const [startDate, setStartDate] = useState(moment().startOf('day'));
  const [availableSlots, setAvailableSlots] = useState<Record<string, string[]>>({});
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const displayDays = isMobile ? 7 : 14;

  useEffect(() => {
    fetchAvailableSlots();
  }, [startDate, displayDays]);

  const fetchAvailableSlots = () => {
    const mockData: Record<string, string[]> = {};
    for (let i = 0; i < displayDays; i++) {
      const date = moment(startDate).add(i, 'days');
      if (!isHoliday(date)) {
        mockData[date.format('YYYY-MM-DD')] = Array.from({ length: 28 }, (_, i) => 
          moment('09:00', 'HH:mm').add(i * 30, 'minutes').format('HH:mm')
        );
      } else {
        mockData[date.format('YYYY-MM-DD')] = [];
      }
    }
    setAvailableSlots(mockData);
  };

  const handleTimeSlotClick = (date: moment.Moment, time: string) => {
    const selectedDate = date.format('YYYY-MM-DD');
    setSelectedDateTime(moment(`${selectedDate} ${time}`).toDate());
    setIsDialogOpen(true);
  };

  const handleConfirm = () => {
    if (selectedDateTime) {
      onDateTimeSelect(selectedDateTime);
    }
    setIsDialogOpen(false);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setSelectedDateTime(null);
  };

  const handlePreviousPeriod = () => {
    const newStartDate = moment(startDate).subtract(7, 'days');
    if (newStartDate.isSameOrAfter(moment(), 'day')) {
      setStartDate(newStartDate);
    }
  };

  const handleNextPeriod = () => {
    setStartDate(moment(startDate).add(7, 'days'));
  };

  const isHoliday = (date: moment.Moment) => {
    return date.date() === 25; // 例: 25日を休業日とする
  };

  const renderTimeSlots = (date: moment.Moment, time: string) => {
    const dateStr = date.format('YYYY-MM-DD');
    const slots = availableSlots[dateStr] || [];
    const isAvailable = slots.includes(time);
    return (
      <TimeSlotButton
        onClick={() => isAvailable && handleTimeSlotClick(date, time)}
        disabled={!isAvailable}
        className={isAvailable ? 'available' : 'unavailable'}
      >
        {isAvailable ? '〇' : '×'}
      </TimeSlotButton>
    );
  };

  const timeSlots = Array.from({ length: 28 }, (_, i) => 
    moment('09:00', 'HH:mm').add(i * 30, 'minutes').format('HH:mm')
  );

  const renderYearMonthRow = () => {
    const months: { [key: string]: number } = {};
    Array.from({ length: displayDays }, (_, i) => {
      const date = moment(startDate).add(i, 'days');
      const key = `${date.year()}年${date.month() + 1}月`;
      if (!months[key]) {
        months[key] = 0;
      }
      months[key]++;
    });
  
    return (
      <TableRow>
        <StyledTableCell className="header year-month nav-button time" style={{ left: 0 }}>
          <Button onClick={handlePreviousPeriod} disabled={startDate.isSame(moment(), 'day')} fullWidth>
            ◀前の{isMobile ? '一週間' : '二週間'}
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
        <StyledTableCell className="header year-month nav-button time-right" style={{ right: 0 }}>
          <Button onClick={handleNextPeriod} fullWidth>
            次の{isMobile ? '一週間' : '二週間'}▶
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
          const date = moment(startDate).add(i, 'days');
          const isSaturday = date.day() === 6;
          const isSunday = date.day() === 0;
          return (
            <StyledTableCell 
              key={i} 
              className={`header day-date ${isSaturday ? 'saturday' : ''} ${isSunday ? 'sunday' : ''}`}
            >
              <Typography variant="body2">{date.format('(ddd)')}</Typography>
              <Typography variant="h6">{date.format('D')}</Typography>
            </StyledTableCell>
          );
        })}
        <StyledTableCell className="header day-date time-right">時間</StyledTableCell>
      </TableRow>
    );
  };
  
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ marginTop: '20px', width: '100%', overflowX: 'hidden' }}>
        <Button onClick={onBack} startIcon={<ChevronLeft />} style={{ marginBottom: '10px' }}>
          戻る
        </Button>
        <Box sx={{ position: 'relative', overflow: 'hidden', border: '2px solid #000' }}>
          <Table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <TableHead>
              {renderYearMonthRow()}
              {renderDayRow()}
            </TableHead>
          </Table>
          <ScrollableTableContainer>
            <Table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <TableBody>
                {timeSlots.map((time, index) => (
                  <TableRow key={index}>
                    <StyledTableCell className="time" isHourBorder={time.endsWith(':00')}>
                      {time}
                    </StyledTableCell>
                    {Array.from({ length: displayDays }, (_, i) => {
                      const date = moment(startDate).add(i, 'days');
                      if (isHoliday(date)) {
                        return index === 0 ? (
                          <StyledTableCell
                            key={i}
                            className="holiday"
                            rowSpan={28}
                            isHourBorder={time.endsWith(':00')}
                          >
                            <Typography variant="h6">休業日</Typography>
                          </StyledTableCell>
                        ) : null;
                      }
                      return (
                        <StyledTableCell key={i} isHourBorder={time.endsWith(':00')}>
                          {renderTimeSlots(date, time)}
                        </StyledTableCell>
                      );
                    })}
                    <StyledTableCell className="time-right" isHourBorder={time.endsWith(':00')}>
                      {time}
                    </StyledTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollableTableContainer>
        </Box>
        <Dialog open={isDialogOpen} onClose={handleCancel}>
          <DialogTitle style={{ backgroundColor: theme.palette.primary.light, color: theme.palette.primary.contrastText }}>
            予約確認
          </DialogTitle>
          <DialogContent>
            <DialogContentText style={{ marginTop: '16px' }}>
              {selectedDateTime && `${moment(selectedDateTime).format('YYYY年M月D日(ddd) HH:mm')}に予約しますか？`}
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
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
          <Alert onClose={() => setError(null)} severity="error" variant="filled">
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default DateSelection;