// NavigationControls.tsx
import React, { useState } from 'react';
import { Box, Typography, Button, useMediaQuery, Theme, IconButton, Dialog } from '@mui/material';
import { PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarMonth } from '@mui/icons-material';
import moment from 'moment';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker'; // 変更
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';

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
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  return (
    <Box sx={{ mb: 3, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={onPrevDay} sx={{ color: '#F25C05', borderColor: '#F25C05', minWidth: 0, padding: isMobile ? '4px 8px' : '6px 16px' }}>
            <ChevronLeft className="h-4 w-4" />
            {!isMobile && <span className="ml-1">前日</span>}
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant={isMobile ? "h6" : "h4"} sx={{ whiteSpace: 'nowrap' }}>
              {currentDate.format('YYYY年M月D日(ddd)')}
            </Typography>
            {/* アイコンボタンを追加 */}
            <IconButton onClick={() => setDatePickerOpen(true)} sx={{ color: '#F25C05', fontSize: '2rem' }}> {/* アイコンサイズを調整 */}
              <CalendarMonth fontSize="inherit" />
            </IconButton>
          </Box>
          <Button variant="outlined" onClick={onNextDay} sx={{ color: '#F25C05', borderColor: '#F25C05', minWidth: 0, padding: isMobile ? '4px 8px' : '6px 16px' }}>
            {!isMobile && <span className="mr-1">翌日</span>}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Box>
        <Button variant="outlined" onClick={onToday} sx={{ color: '#F25C05', borderColor: '#F25C05' }}>
          今日
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: 2, width: isMobile ? '100%' : 'auto' }}>
        <Button variant="contained" onClick={onAddReservation} sx={{ backgroundColor: '#F25C05', '&:hover': { backgroundColor: '#d94f04' }, width: isMobile ? '100%' : 'auto' }}>
          <PlusCircle className="mr-2 h-4 w-4" /> 新規予約
        </Button>
        <Button variant="contained" onClick={onAddStaffSchedule} sx={{ backgroundColor: '#F25C05', '&:hover': { backgroundColor: '#d94f04' }, width: isMobile ? '100%' : 'auto' }}>
          <PlusCircle className="mr-2 h-4 w-4" /> スタッフスケジュール追加
        </Button>
      </Box>
      {/* DatePicker をモーダルダイアログ内に表示 */}
      <LocalizationProvider dateAdapter={AdapterMoment}>
        <Dialog open={datePickerOpen} onClose={() => setDatePickerOpen(false)}>
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
