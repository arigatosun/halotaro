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
  IconButton,
  Box
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import moment from 'moment';
import 'moment/locale/ja';

moment.locale('ja');

interface DateSelectionProps {
  onDateTimeSelect: (dateTime: Date) => void;
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

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: '4px',
  textAlign: 'center',
  borderRight: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&.header': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  '&.year-month': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
    fontWeight: 'bold',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  '&.time': {
    position: 'sticky',
    left: 0,
    backgroundColor: theme.palette.background.paper,
    zIndex: 1,
  },
  '&.time-right': {
    position: 'sticky',
    right: 0,
    backgroundColor: theme.palette.background.paper,
    zIndex: 1,
  },
  '&.saturday': {
    color: theme.palette.primary.main,
  },
  '&.sunday': {
    color: theme.palette.secondary.main,
  },
  '&.hour-separator': {
    borderBottom: '2px solid #000',
  },
}));

const TimeSlotButton = styled(Button)(({ theme }) => ({
  minWidth: '30px',
  width: '100%',
  height: '30px',
  padding: '2px',
  fontSize: '0.8rem',
  borderRadius: '4px',
  '&.available': {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
    },
  },
  '&.unavailable': {
    backgroundColor: 'transparent',
    color: theme.palette.text.disabled,
  },
}));

const ScrollableTableContainer = styled(TableContainer)({
  maxHeight: '600px',
  overflow: 'auto',
  border: '2px solid #000',
}) as typeof TableContainer;

const DateSelection: React.FC<DateSelectionProps> = ({ onDateTimeSelect }) => {
  const [startDate, setStartDate] = useState(moment().startOf('day'));
  const [availableSlots, setAvailableSlots] = useState<Record<string, string[]>>({});
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableSlots();
  }, [startDate]);

  const fetchAvailableSlots = () => {
    const mockData: Record<string, string[]> = {};
    for (let i = 0; i < 14; i++) {
      const date = moment(startDate).add(i, 'days');
      mockData[date.format('YYYY-MM-DD')] = Array.from({ length: 28 }, (_, i) => 
        moment('09:00', 'HH:mm').add(i * 30, 'minutes').format('HH:mm')
      );
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

  const handlePreviousTwoWeeks = () => {
    const newStartDate = moment(startDate).subtract(14, 'days');
    if (newStartDate.isSameOrAfter(moment(), 'day')) {
      setStartDate(newStartDate);
    }
  };

  const handleNextTwoWeeks = () => {
    setStartDate(moment(startDate).add(14, 'days'));
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
        {isAvailable ? '●' : ''}
      </TimeSlotButton>
    );
  };

  const timeSlots = Array.from({ length: 28 }, (_, i) => 
    moment('09:00', 'HH:mm').add(i * 30, 'minutes').format('HH:mm')
  );

  const renderYearMonthRow = () => {
    const months: { [key: string]: number } = {};
    Array.from({ length: 14 }, (_, i) => {
      const date = moment(startDate).add(i, 'days');
      const key = `${date.year()}年${date.month() + 1}月`;
      if (!months[key]) {
        months[key] = 0;
      }
      months[key]++;
    });
  
    return (
      <TableRow>
        <StyledTableCell className="year-month navigation" rowSpan={2}>
          <IconButton onClick={handlePreviousTwoWeeks} color="inherit" disabled={startDate.isSame(moment(), 'day')}>
            <ChevronLeft />
          </IconButton>
        </StyledTableCell>
        {Object.entries(months).map(([key, count], index) => (
          <StyledTableCell
            key={key}
            className="year-month"
            colSpan={count}
          >
            <Typography variant="h6">{key}</Typography>
          </StyledTableCell>
        ))}
        <StyledTableCell className="year-month navigation" rowSpan={2}>
          <IconButton onClick={handleNextTwoWeeks} color="inherit">
            <ChevronRight />
          </IconButton>
        </StyledTableCell>
      </TableRow>
    );
  };
  
  const renderDayRow = () => {
    return (
      <TableRow>
        {Array.from({ length: 14 }, (_, i) => {
          const date = moment(startDate).add(i, 'days');
          const isSaturday = date.day() === 6;
          const isSunday = date.day() === 0;
          return (
            <StyledTableCell 
              key={i} 
              className={`header ${isSaturday ? 'saturday' : ''} ${isSunday ? 'sunday' : ''}`}
            >
              <Typography variant="body2">{date.format('(ddd)')}</Typography>
              <Typography variant="h6">{date.format('D')}</Typography>
            </StyledTableCell>
          );
        })}
      </TableRow>
    );
  };
  
  return (
    <ThemeProvider theme={theme}>
      <div style={{ marginTop: '20px' }}>
        <ScrollableTableContainer component={Paper}>
          <Table stickyHeader style={{ borderCollapse: 'collapse' }}>
            <TableHead>
              {renderYearMonthRow()}
              {renderDayRow()}
            </TableHead>
            <TableBody>
              {timeSlots.map((time, index) => (
                <TableRow key={index} className={index % 2 === 0 ? 'hour-separator' : ''}>
                  <StyledTableCell className={`time ${index % 2 === 0 ? 'hour-separator' : ''}`}>{time}</StyledTableCell>
                  {Array.from({ length: 14 }, (_, i) => {
                    const date = moment(startDate).add(i, 'days');
                    return (
                      <StyledTableCell 
                        key={i}
                        className={index % 2 === 0 ? 'hour-separator' : ''}
                      >
                        {renderTimeSlots(date, time)}
                      </StyledTableCell>
                    );
                  })}
                  <StyledTableCell className={`time-right ${index % 2 === 0 ? 'hour-separator' : ''}`}>{time}</StyledTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollableTableContainer>
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
      </div>
    </ThemeProvider>
  );
};

export default DateSelection;