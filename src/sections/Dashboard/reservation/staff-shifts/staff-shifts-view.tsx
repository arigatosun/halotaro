"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Button,
  Card,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Popover,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  TextField,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import moment from "moment";
import 'moment/locale/ja';
import Link from "next/link";

moment.locale('ja');

interface ShiftPopoverData {
  visible: boolean;
  anchorEl: HTMLButtonElement | null;
  date: moment.Moment | null;
  staffName: string;
  currentShift: string | null;
}

const StaffShiftSettings: React.FC = () => {
  const params = useParams();
  const { year, month } = params;
  const [currentDate, setCurrentDate] = useState(moment());
  const [staffShifts, setStaffShifts] = useState([
    { id: 1, name: "斎藤 憲司", shifts: Array(31).fill(null) },
    { id: 2, name: "谷 美加", shifts: Array(31).fill(null) },
    { id: 3, name: "鳥山 洋花", shifts: Array(31).fill(null) },
    { id: 4, name: "田原 詩朗", shifts: Array(31).fill(null) },
  ]);
  const [shiftPopover, setShiftPopover] = useState<ShiftPopoverData>({
    visible: false,
    anchorEl: null,
    date: null,
    staffName: "",
    currentShift: null,
  });

  useEffect(() => {
    if (year && month) {
      setCurrentDate(moment(`${year}-${month}-01`));
    }
  }, [year, month]);

  const handleShiftClick = (event: React.MouseEvent<HTMLButtonElement>, staffName: string, date: number) => {
    const clickedDate = moment(currentDate).date(date);
    const currentShift = staffShifts.find(staff => staff.name === staffName)?.shifts[date - 1] || null;
    setShiftPopover({
      visible: true,
      anchorEl: event.currentTarget,
      date: clickedDate,
      staffName,
      currentShift,
    });
  };

  const handleShiftSubmit = (values: any) => {
    const { shiftType, startTime, endTime, memo } = values;
    let newShiftValue = shiftType === "休日" ? "休" : "出";

    setStaffShifts((prevShifts) =>
      prevShifts.map((staff) =>
        staff.name === shiftPopover.staffName
          ? {
              ...staff,
              shifts: staff.shifts.map((shift, index) =>
                index === (shiftPopover.date?.date() || 1) - 1
                  ? newShiftValue
                  : shift
              ),
            }
          : staff
      )
    );

    setShiftPopover({ ...shiftPopover, visible: false, anchorEl: null });
  };

  const renderShiftButton = (shift: string | null, staffName: string, date: number) => {
    let buttonText = "未設定";
    let buttonColor = "#e0e0e0";
    let textColor = "#000000";

    if (shift === "休") {
      buttonText = "休";
      buttonColor = "#ff9800";
      textColor = "#ffffff";
    } else if (shift === "出") {
      buttonText = "出";
      buttonColor = "#2196f3";
      textColor = "#ffffff";
    }

    const day = moment(currentDate).date(date);
    const isWeekend = day.day() === 0 || day.day() === 6;

    return (
      <Button
        variant="contained"
        size="small"
        onClick={(event) => handleShiftClick(event, staffName, date)}
        style={{ 
          minWidth: '40px', 
          maxWidth: '40px',
          minHeight: '30px',
          maxHeight: '30px',
          padding: '2px 4px', 
          backgroundColor: buttonColor,
          color: textColor,
          fontSize: '0.75rem',
          boxShadow: 'none',
          borderRadius: '4px',
          margin: '2px',
        }}
      >
        {buttonText}
      </Button>
    );
  };

  const ShiftPopoverContent = ({
    staffName,
    date,
    currentShift,
  }: {
    staffName: string;
    date: moment.Moment;
    currentShift: string | null;
  }) => {
    const [shiftType, setShiftType] = useState(currentShift === "休" ? "休日" : "出勤");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [memo, setMemo] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleShiftSubmit({ shiftType, startTime, endTime, memo });
    };

    return (
      <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
        <Typography variant="h6" style={{ marginBottom: '10px' }}>
          {date.format('YYYY年MM月DD日(ddd)')} {staffName}
        </Typography>
        <RadioGroup
          value={shiftType}
          onChange={(e) => setShiftType(e.target.value)}
          style={{ marginBottom: '10px' }}
        >
          <FormControlLabel value="出勤" control={<Radio />} label="出勤" />
          <FormControlLabel value="休日" control={<Radio />} label="休日" />
        </RadioGroup>
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
        <Button type="submit" variant="contained" color="primary" style={{ marginTop: '10px' }}>
          入力する
        </Button>
      </form>
    );
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

  const daysInMonth = currentDate.daysInMonth();

  const Legend = () => (
    <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 2, marginTop: 2, marginBottom: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: 20, height: 20, backgroundColor: '#e0e0e0', marginRight: 1 }}></Box>
        <Typography variant="body2">未設定</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: 20, height: 20, backgroundColor: '#2196f3', marginRight: 1 }}></Box>
        <Typography variant="body2">出勤</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: 20, height: 20, backgroundColor: '#ff9800', marginRight: 1 }}></Box>
        <Typography variant="body2">休み</Typography>
      </Box>
    </Box>
  );

  return (
    <div style={{ padding: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <Grid container justifyContent="space-between" alignItems="center" style={{ marginBottom: '20px' }}>
          <Grid item>
            <Typography variant="h5">シフト設定 ({currentDate.format('YYYY年MM月')})</Typography>
          </Grid>
          <Grid item>
            <HelpOutlineIcon />
          </Grid>
        </Grid>
        <Typography variant="body1" style={{ marginBottom: '20px' }}>
          スタッフの1か月のシフトを設定します。
          休日や予定（一部休や外出など）を設定することで、予約受付が停止できます。
        </Typography>
        <Button 
          variant="contained" 
          style={{ 
            marginBottom: '20px', 
            backgroundColor: '#1976d2',
            boxShadow: 'none',
            borderRadius: '4px',
          }}
        >
          一括入力
        </Button>
        <Typography variant="body2" style={{ marginBottom: '20px' }}>
          スタッフと日を指定して、一括で入力できます。
        </Typography>
        <Legend />
        <TableContainer component={Paper} style={{ marginBottom: '20px' }}>
          <Table size="small">
            <TableHead>
              <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                <TableCell style={{ fontWeight: 'bold', padding: '10px' }}>スタッフ名</TableCell>
                <TableCell style={{ fontWeight: 'bold', padding: '10px' }}>設定状況</TableCell>
                <TableCell style={{ fontWeight: 'bold', padding: '10px' }}>設定</TableCell>
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <TableCell key={i} align="center" style={{ fontWeight: 'bold', padding: '10px' }}>
                    {i + 1}<br/>
                    <span style={{ 
                      color: moment(currentDate).date(i + 1).day() === 0 ? 'red' : 
                             moment(currentDate).date(i + 1).day() === 6 ? 'blue' : 'inherit' 
                    }}>
                      ({moment(currentDate).date(i + 1).format("ddd")})
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {staffShifts.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell style={{ padding: '10px' }}>{staff.name}</TableCell>
                  <TableCell style={{ padding: '10px' }}>
                    <Button variant="contained" size="small" style={{ backgroundColor: '#1976d2', boxShadow: 'none' }}>設定済</Button>
                  </TableCell>
                  <TableCell style={{ padding: '10px' }}>
                    <Button variant="contained" size="small" style={{ backgroundColor: '#1976d2', boxShadow: 'none' }}>設定</Button>
                  </TableCell>
                  {Array.from({ length: daysInMonth }, (_, index) => (
                    <TableCell key={index} align="center" style={{ padding: '4px' }}>
                      {renderShiftButton(staff.shifts[index], staff.name, index + 1)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Link href="/dashboard/reservations/monthly-settings" passHref>
            <Button 
              variant="contained" 
              style={{ 
                backgroundColor: '#1976d2',
                boxShadow: 'none',
                borderRadius: '4px',
              }}
            >
              毎月の受付設定へ
            </Button>
          </Link>
        </Box>
      </Card>
      <Popover
        open={shiftPopover.visible}
        anchorEl={shiftPopover.anchorEl}
        onClose={() => setShiftPopover({ ...shiftPopover, visible: false, anchorEl: null })}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        {shiftPopover.date && (
          <ShiftPopoverContent
            staffName={shiftPopover.staffName}
            date={shiftPopover.date}
            currentShift={shiftPopover.currentShift}
          />
        )}
      </Popover>
    </div>
  );
};

export default StaffShiftSettings;