// src/sections/Dashboard/reservation/calendar/NavigationControls.tsx

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';

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
    return (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="outlined" onClick={onPrevDay} sx={{ color: '#F25C05', borderColor: '#F25C05' }}>
              <ChevronLeft className="mr-2 h-4 w-4" /> 前の日
            </Button>
            <Typography variant="h4">
              {currentDate.format('YYYY年MM月DD日')}
            </Typography>
            <Button variant="outlined" onClick={onNextDay} sx={{ color: '#F25C05', borderColor: '#F25C05' }}>
              次の日 <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outlined" onClick={onToday} sx={{ color: '#F25C05', borderColor: '#F25C05' }}>
              今日
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="contained" onClick={onAddReservation} sx={{ backgroundColor: '#F25C05', '&:hover': { backgroundColor: '#d94f04' } }}>
              <PlusCircle className="mr-2 h-4 w-4" /> 新規の予約
            </Button>
            <Button variant="contained" onClick={onAddStaffSchedule} sx={{ backgroundColor: '#F25C05', '&:hover': { backgroundColor: '#d94f04' } }}>
              <PlusCircle className="mr-2 h-4 w-4" /> スタッフスケジュール追加
            </Button>
          </Box>
        </Box>
      );
    };

export default NavigationControls;
