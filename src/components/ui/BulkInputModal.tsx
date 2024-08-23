import React, { useState } from 'react';
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

interface BulkInputModalProps {
  staffs: { id: number; name: string }[];
  currentDate: moment.Moment;
  onSubmit: (newShifts: Record<number, { type: string; startTime?: string; endTime?: string }[]>) => void;
  onClose: () => void;
}

const BulkInputModal: React.FC<BulkInputModalProps> = ({
  staffs,
  currentDate,
  onSubmit,
  onClose,
}) => {
  const [selectedStaffs, setSelectedStaffs] = useState<number[]>([]);
  const [dateType, setDateType] = useState<string>('specific');
  const [specificDates, setSpecificDates] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState<[number, number]>([1, 1]);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [shiftType, setShiftType] = useState<string>('出勤');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('18:00');

  const handleSubmit = () => {
    const newShifts: Record<number, { type: string; startTime?: string; endTime?: string }[]> = {};
    const daysInMonth = currentDate.daysInMonth();

    selectedStaffs.forEach(staffId => {
      newShifts[staffId] = Array(daysInMonth).fill(null).map(() => ({ type: '' }));

      const applyShift = (index: number) => {
        if (shiftType === '出勤') {
          newShifts[staffId][index] = { type: '出', startTime, endTime };
        } else {
          newShifts[staffId][index] = { type: shiftType === '休日' ? '休' : '店休' };
        }
      };

      if (dateType === 'specific') {
        specificDates.forEach(date => applyShift(date - 1));
      } else if (dateType === 'range') {
        for (let i = dateRange[0] - 1; i < dateRange[1]; i++) {
          applyShift(i);
        }
      } else if (dateType === 'weekday') {
        for (let i = 0; i < daysInMonth; i++) {
          const day = moment(currentDate).date(i + 1).day();
          if (weekdays.includes(day)) {
            applyShift(i);
          }
        }
      } else if (dateType === 'everyday') {
        newShifts[staffId].forEach((_, index) => applyShift(index));
      }
    });

    onSubmit(newShifts);
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
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
    <Box sx={{
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
    }}>
      <Typography variant="h6" component="h2" gutterBottom>
        一括入力
      </Typography>
      <FormControl fullWidth margin="normal">
        <InputLabel>スタッフを指定</InputLabel>
        <Select
          multiple
          value={selectedStaffs}
          onChange={(e) => setSelectedStaffs(e.target.value as number[])}
          renderValue={(selected) => selected.map(id => staffs.find(s => s.id === id)?.name).join(', ')}
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
            {Array.from({length: currentDate.daysInMonth()}, (_, i) => i + 1).map((day) => (
              <MenuItem key={day} value={day}>
                {day}日
              </MenuItem>
            ))}
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
                {Array.from({length: currentDate.daysInMonth()}, (_, i) => i + 1).map((day) => (
                  <MenuItem key={day} value={day}>
                    {day}日
                  </MenuItem>
                ))}
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
                {Array.from({length: currentDate.daysInMonth()}, (_, i) => i + 1).map((day) => (
                  <MenuItem key={day} value={day}>
                    {day}日
                  </MenuItem>
                ))}
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
                      setWeekdays(weekdays.filter(d => d !== index));
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
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>開始時間</InputLabel>
              <Select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value as string)}
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
              >
                {generateTimeOptions()}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
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