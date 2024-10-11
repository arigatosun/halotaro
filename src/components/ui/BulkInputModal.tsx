// BulkInputModal.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Radio,
  RadioGroup,
  Grid,
} from '@mui/material';
import moment from 'moment';
import { supabase } from '@/lib/supabaseClient';

interface BulkInputModalProps {
  staffs: { id: number; name: string }[];
  currentDate: moment.Moment;
  user: any;
  onSubmit: (newShifts: Record<number, ShiftData[]>) => Promise<void>;
  onClose: () => void;
}

interface WorkPattern {
  id: string;
  abbreviation: string;
  start_time: string | null;
  end_time: string | null;
  is_business_start: boolean;
  is_business_end: boolean;
}

interface ShiftData {
  type: string;
  startTime?: string | null;
  endTime?: string | null;
}

const BulkInputModal: React.FC<BulkInputModalProps> = ({
  staffs,
  currentDate,
  user,
  onSubmit,
  onClose,
}) => {
  const [selectedStaffs, setSelectedStaffs] = useState<number[]>([]);
  const [dateType, setDateType] = useState<string>('specific');
  const [specificDates, setSpecificDates] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState<[number, number]>([1, currentDate.daysInMonth()]);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [shiftType, setShiftType] = useState<string>('出勤');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('18:00');
  const [workPatterns, setWorkPatterns] = useState<WorkPattern[]>([]);
  const [selectedWorkPattern, setSelectedWorkPattern] = useState<string | null>(null);
  const [useBusinessStartTime, setUseBusinessStartTime] = useState<boolean>(false);
  const [useBusinessEndTime, setUseBusinessEndTime] = useState<boolean>(false);

  useEffect(() => {
    const fetchWorkPatterns = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('work_patterns')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('勤務パターンの取得に失敗しました:', error);
      } else {
        setWorkPatterns(data as WorkPattern[]);
      }
    };

    fetchWorkPatterns();
  }, [user]);

  useEffect(() => {
    setSelectedWorkPattern(null);
    setUseBusinessStartTime(false);
    setUseBusinessEndTime(false);
  }, [shiftType]);

  const handleSubmit = async () => {
    const newShifts: Record<number, ShiftData[]> = {};
    const daysInMonth = currentDate.daysInMonth();
    const datesToFetch = new Set<string>();
    const indicesToApplyMap: Record<number, number[]> = {};

    for (const staffId of selectedStaffs) {
      newShifts[staffId] = Array(daysInMonth).fill(null).map(() => ({ type: '' }));

      const indicesToApply: number[] = [];

      if (dateType === 'specific') {
        indicesToApply.push(...specificDates.map(date => date - 1));
      } else if (dateType === 'range') {
        for (let i = dateRange[0] - 1; i < dateRange[1]; i++) {
          indicesToApply.push(i);
        }
      } else if (dateType === 'weekday') {
        for (let i = 0; i < daysInMonth; i++) {
          const day = moment(currentDate).date(i + 1).day();
          if (weekdays.includes(day)) {
            indicesToApply.push(i);
          }
        }
      } else if (dateType === 'everyday') {
        for (let i = 0; i < daysInMonth; i++) {
          indicesToApply.push(i);
        }
      }

      indicesToApplyMap[staffId] = indicesToApply;

      if (useBusinessStartTime || useBusinessEndTime) {
        indicesToApply.forEach(index => {
          const dateStr = currentDate.date(index + 1).format('YYYY-MM-DD');
          datesToFetch.add(dateStr);
        });
      }
    }

    // salon_business_hours を一括取得
    let businessHoursMap: Record<string, { open_time: string | null; close_time: string | null }> = {};

    if (datesToFetch.size > 0) {
      const datesArray = Array.from(datesToFetch);
      const { data, error } = await supabase
        .from('salon_business_hours')
        .select('date, open_time, close_time')
        .in('date', datesArray);

      if (error) {
        console.error('Failed to fetch salon_business_hours:', error);
      } else {
        data.forEach((item: { date: string; open_time: string | null; close_time: string | null }) => {
          businessHoursMap[item.date] = { open_time: item.open_time, close_time: item.close_time };
        });
      }
    }

    for (const staffId of selectedStaffs) {
      const indicesToApply = indicesToApplyMap[staffId];

      indicesToApply.forEach(index => {
        let shiftStartTime = startTime;
        let shiftEndTime = endTime;

        const dateStr = currentDate.date(index + 1).format('YYYY-MM-DD');

        if (useBusinessStartTime || useBusinessEndTime) {
          const businessHours = businessHoursMap[dateStr];

          if (businessHours) {
            if (useBusinessStartTime) {
              shiftStartTime = businessHours.open_time?.slice(0, 5) || '';
            }
            if (useBusinessEndTime) {
              shiftEndTime = businessHours.close_time?.slice(0, 5) || '';
            }
          } else {
            console.warn(`No business hours found for date ${dateStr}`);
          }
        }

        if (shiftType === '出勤') {
          newShifts[staffId][index] = { type: '出', startTime: shiftStartTime, endTime: shiftEndTime };
        } else {
          newShifts[staffId][index] = { type: shiftType === '休日' ? '休' : '店休' };
        }
      });
    }

    await onSubmit(newShifts);
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute
          .toString()
          .padStart(2, '0')}`;
        options.push(
          <MenuItem key={time} value={time}>
            {time}
          </MenuItem>
        );
      }
    }
    return options;
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 500,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        maxHeight: '90vh',
        overflowY: 'auto',
      }}
    >
      <Typography variant="h6" component="h2" gutterBottom>
        一括入力
      </Typography>
      <FormControl fullWidth margin="normal">
        <InputLabel>スタッフを指定</InputLabel>
        <Select
          multiple
          value={selectedStaffs}
          onChange={(e) => setSelectedStaffs(e.target.value as number[])}
          renderValue={(selected) =>
            selected.map((id) => staffs.find((s) => s.id === id)?.name).join(', ')
          }
        >
          {staffs.map((staff) => (
            <MenuItem key={staff.id} value={staff.id}>
              {staff.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl component="fieldset" fullWidth margin="normal">
        <RadioGroup value={dateType} onChange={(e) => setDateType(e.target.value)}>
          <FormControlLabel value="specific" control={<Radio />} label="特定の日付" />
          <FormControlLabel value="range" control={<Radio />} label="期間" />
          <FormControlLabel value="weekday" control={<Radio />} label="曜日" />
          <FormControlLabel value="everyday" control={<Radio />} label="毎日" />
        </RadioGroup>
      </FormControl>
      {dateType === 'specific' && (
        <FormControl fullWidth margin="normal">
          <InputLabel>日付を選択</InputLabel>
          <Select
            multiple
            value={specificDates}
            onChange={(e) => setSpecificDates(e.target.value as number[])}
            renderValue={(selected) => selected.join(', ')}
          >
            {Array.from({ length: currentDate.daysInMonth() }, (_, i) => i + 1).map(
              (day) => (
                <MenuItem key={day} value={day}>
                  {day}日
                </MenuItem>
              )
            )}
          </Select>
        </FormControl>
      )}
      {dateType === 'range' && (
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>開始日</InputLabel>
              <Select
                value={dateRange[0]}
                onChange={(e) => setDateRange([e.target.value as number, dateRange[1]])}
              >
                {Array.from({ length: currentDate.daysInMonth() }, (_, i) => i + 1).map(
                  (day) => (
                    <MenuItem key={day} value={day}>
                      {day}日
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>終了日</InputLabel>
              <Select
                value={dateRange[1]}
                onChange={(e) => setDateRange([dateRange[0], e.target.value as number])}
              >
                {Array.from({ length: currentDate.daysInMonth() }, (_, i) => i + 1).map(
                  (day) => (
                    <MenuItem key={day} value={day}>
                      {day}日
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      )}
      {dateType === 'weekday' && (
        <FormGroup row>
          {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
            <FormControlLabel
              key={day}
              control={
                <Checkbox
                  checked={weekdays.includes(index)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setWeekdays([...weekdays, index]);
                    } else {
                      setWeekdays(weekdays.filter((d) => d !== index));
                    }
                  }}
                />
              }
              label={day}
            />
          ))}
        </FormGroup>
      )}
      <FormControl component="fieldset" fullWidth margin="normal">
        <RadioGroup value={shiftType} onChange={(e) => setShiftType(e.target.value)}>
          <FormControlLabel value="出勤" control={<Radio />} label="出勤" />
          <FormControlLabel value="休日" control={<Radio />} label="休日" />
          <FormControlLabel value="店休" control={<Radio />} label="店休" />
        </RadioGroup>
      </FormControl>
      {shiftType === '出勤' && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>開始時間</InputLabel>
                <Select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value as string)}
                  disabled={useBusinessStartTime}
                >
                  {generateTimeOptions()}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>終了時間</InputLabel>
                <Select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value as string)}
                  disabled={useBusinessEndTime}
                >
                  {generateTimeOptions()}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <FormControl fullWidth margin="normal">
            <InputLabel>勤務パターン</InputLabel>
            <Select
              value={selectedWorkPattern || ''}
              onChange={(e) => {
                const patternId = e.target.value as string;
                setSelectedWorkPattern(patternId);
                const pattern = workPatterns.find((wp) => wp.id === patternId);
                if (pattern) {
                  if (pattern.is_business_start) {
                    setUseBusinessStartTime(true);
                  } else {
                    setUseBusinessStartTime(false);
                    setStartTime(pattern.start_time ? pattern.start_time.slice(0, 5) : '');
                  }
                  if (pattern.is_business_end) {
                    setUseBusinessEndTime(true);
                  } else {
                    setUseBusinessEndTime(false);
                    setEndTime(pattern.end_time ? pattern.end_time.slice(0, 5) : '');
                  }
                }
              }}
            >
              {workPatterns.map((pattern) => (
                <MenuItem key={pattern.id} value={pattern.id}>
                  {pattern.abbreviation}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button onClick={onClose} sx={{ mr: 2 }}>
          閉じる
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          設定する
        </Button>
      </Box>
    </Box>
  );
};

export default BulkInputModal;
