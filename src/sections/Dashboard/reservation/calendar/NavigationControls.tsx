import React from 'react';
import { Box, Typography, Button, useMediaQuery, Theme } from '@mui/material';
import { PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import moment from 'moment';

interface NavigationControlsProps {
  currentDate: moment.Moment;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onAddReservation: () => void;
  onAddStaffSchedule: () => void;
}

const NavigationControls: React.FC<NavigationControlsProps> = ({
  currentDate,
  onPrevDay,
  onNextDay,
  onToday,
  onAddReservation,
  onAddStaffSchedule,
}) => {
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  return (
    <Box sx={{ mb: 3, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={onPrevDay} sx={{ color: '#F25C05', borderColor: '#F25C05', minWidth: 0, padding: isMobile ? '4px 8px' : '6px 16px' }}>
            <ChevronLeft className="h-4 w-4" />
            {!isMobile && <span className="ml-1">前日</span>}
          </Button>
          <Typography variant={isMobile ? "h6" : "h4"} sx={{ whiteSpace: 'nowrap' }}>
            {currentDate.format('YYYY年M月D日(ddd)')}
          </Typography>
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
    </Box>
  );
};

export default NavigationControls;