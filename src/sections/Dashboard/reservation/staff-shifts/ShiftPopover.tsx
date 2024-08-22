import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  TextField,
} from "@mui/material";
import { ShiftData } from "@/sections/Dashboard/reservation/staff-shifts/types";

interface ShiftPopoverProps {
  currentShift: ShiftData;
  onSubmit: (newShift: ShiftData) => void;
  onClose: () => void;
}

const ShiftPopover: React.FC<ShiftPopoverProps> = ({ currentShift, onSubmit, onClose }) => {
  const [shiftType, setShiftType] = useState(currentShift.type === "休" ? "休日" : currentShift.type === "店休" ? "店休" : "出勤");
  const [startTime, setStartTime] = useState(currentShift.startTime || "");
  const [endTime, setEndTime] = useState(currentShift.endTime || "");
  const [memo, setMemo] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newShift: ShiftData = { 
      type: shiftType === "休日" ? "休" : shiftType === "店休" ? "店休" : "出",
      startTime: shiftType === "出勤" ? startTime : undefined,
      endTime: shiftType === "出勤" ? endTime : undefined
    };
    onSubmit(newShift);
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
    <Box sx={{ p: 2, minWidth: 300 }}>
      <form onSubmit={handleSubmit}>
        <FormControl component="fieldset" fullWidth margin="normal">
          <RadioGroup value={shiftType} onChange={(e) => setShiftType(e.target.value)}>
            <FormControlLabel value="出勤" control={<Radio />} label="出勤" />
            <FormControlLabel value="休日" control={<Radio />} label="休日" />
            <FormControlLabel value="店休" control={<Radio />} label="店休" />
          </RadioGroup>
        </FormControl>
        {shiftType === "出勤" && (
          <>
            <FormControl fullWidth margin="normal">
              <InputLabel>開始時間</InputLabel>
              <Select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value as string)}
              >
                {generateTimeOptions()}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>終了時間</InputLabel>
              <Select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value as string)}
              >
                {generateTimeOptions()}
              </Select>
            </FormControl>
          </>
        )}
        <TextField
          fullWidth
          margin="normal"
          label="メモ"
          multiline
          rows={2}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button onClick={onClose} sx={{ mr: 1 }}>
            キャンセル
          </Button>
          <Button type="submit" variant="contained" color="primary">
            保存
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default ShiftPopover;