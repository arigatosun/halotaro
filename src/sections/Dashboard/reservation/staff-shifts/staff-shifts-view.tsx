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
  Modal,
  Checkbox,
  FormGroup,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import moment from "moment";
import 'moment/locale/ja';
import Link from "next/link"
import BulkInputModal from "@/components/ui/BulkInputModal"; // BulkInputModalをインポート

moment.locale('ja');

interface ShiftPopoverData {
  visible: boolean;
  anchorEl: HTMLButtonElement | null;
  date: moment.Moment | null;
  staffName: string;
  currentShift: string | null;
}

interface Staff {
  id: number;
  name: string;
  shifts: (string | null)[];
}

const StaffShiftSettings: React.FC = () => {
  const params = useParams();
  const { year, month } = params;
  const [currentDate, setCurrentDate] = useState(moment());
  const [staffShifts, setStaffShifts] = useState<Staff[]>([
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
  const [isBulkInputModalOpen, setIsBulkInputModalOpen] = useState(false);

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
    let newShiftValue = shiftType === "休日" ? "休" : shiftType === "店休" ? "店休" : "出";

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

  const handleBulkInputSubmit = (newShifts: Record<number, string[]>) => {
    setStaffShifts(prevStaffs => 
      prevStaffs.map(staff => ({
        ...staff,
        shifts: staff.shifts.map((_, index) => 
          newShifts[staff.id] ? newShifts[staff.id][index] : null
        )
      }))
    );
    setIsBulkInputModalOpen(false);
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
    } else if (shift === "店休") {
      buttonText = "店休";
      buttonColor = "#f44336";
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
    const [shiftType, setShiftType] = useState(currentShift === "休" ? "休日" : currentShift === "店休" ? "店休" : "出勤");
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
          <FormControlLabel value="店休" control={<Radio />} label="店休" />
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
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: 20, height: 20, backgroundColor: '#f44336', marginRight: 1 }}></Box>
        <Typography variant="body2">店休</Typography>
      </Box>
    </Box>
  );

  const BulkInputModal = () => {
    const [selectedStaffs, setSelectedStaffs] = useState<number[]>([]);
    const [dateType, setDateType] = useState<string>('specific');
    const [specificDates, setSpecificDates] = useState<number[]>([]);
    const [dateRange, setDateRange] = useState<[number, number]>([1, 1]);
    const [weekdays, setWeekdays] = useState<number[]>([]);
    const [shiftType, setShiftType] = useState<string>('出勤');

    const handleSubmit = () => {
      const newShifts: Record<number, string[]> = {};
      const daysInMonth = currentDate.daysInMonth();

      selectedStaffs.forEach(staffId => {
        newShifts[staffId] = Array(daysInMonth).fill(null);

        if (dateType === 'specific') {
          specificDates.forEach(date => {
            newShifts[staffId][date - 1] = shiftType === '出勤' ? '出' : shiftType === '休日' ? '休' : '店休';
          });
        } else if (dateType === 'range') {
          for (let i = dateRange[0] - 1; i < dateRange[1]; i++) {
            newShifts[staffId][i] = shiftType === '出勤' ? '出' : shiftType === '休日' ? '休' : '店休';
          }
        } else if (dateType === 'weekday') {
          for (let i = 0; i < daysInMonth; i++) {
            const day = moment(currentDate).date(i + 1).day();
            if (weekdays.includes(day)) {
              newShifts[staffId][i] = shiftType === '出勤' ? '出' : shiftType === '休日' ? '休' : '店休';
            }
          }
        } else if (dateType === 'everyday') {
          newShifts[staffId].fill(shiftType === '出勤' ? '出' : shiftType === '休日' ? '休' : '店休');
        }
      });

      handleBulkInputSubmit(newShifts);
    };

    return (
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
      }}>
        <Typography variant="h6" component="h2">
          一括入力
        </Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel>スタッフを指定</InputLabel>
          <Select
            multiple
            value={selectedStaffs}
            onChange={(e) => setSelectedStaffs(e.target.value as number[])}
            renderValue={(selected) => selected.map(id => staffShifts.find(s => s.id === id)?.name).join(', ')}
          >
            {staffShifts.map((staff) => (
              <MenuItem key={staff.id} value={staff.id}>
                {staff.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl component="fieldset" margin="normal">
          <RadioGroup value={dateType} onChange={(e) => setDateType(e.target.value)}>
            <FormControlLabel value="specific" control={<Radio />} label="日付：" />
            <FormControlLabel value="range" control={<Radio />} label="期間：" />
            <FormControlLabel value="weekday" control={<Radio />} label="曜日：" />
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
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                <MenuItem key={day} value={day}>
                  {day}日
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {dateType === 'range' && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <FormControl margin="normal" sx={{ width: '45%' }}>
              <InputLabel>開始日</InputLabel>
              <Select
                value={dateRange[0]}
                onChange={(e) => setDateRange([e.target.value as number, dateRange[1]])}
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                  <MenuItem key={day} value={day}>
                    {day}日
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl margin="normal" sx={{ width: '45%' }}>
              <InputLabel>終了日</InputLabel>
              <Select
                value={dateRange[1]}
                onChange={(e) => setDateRange([dateRange[0], e.target.value as number])}
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                  <MenuItem key={day} value={day}>
                    {day}日
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
        {dateType === 'weekday' && (
          <FormControl component="fieldset" margin="normal">
            <FormGroup>
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
          </FormControl>
        )}
        <FormControl component="fieldset" margin="normal">
          <RadioGroup value={shiftType} onChange={(e) => setShiftType(e.target.value)}>
            <FormControlLabel value="出勤" control={<Radio />} label="出勤" />
            <FormControlLabel value="休日" control={<Radio />} label="休日" />
            <FormControlLabel value="店休" control={<Radio />} label="店休" />
          </RadioGroup>
        </FormControl>
        <Button onClick={handleSubmit} variant="contained" color="primary" style={{ marginTop: '20px' }}>
          設定する
        </Button>
        <Button onClick={() => setIsBulkInputModalOpen(false)} variant="outlined" style={{ marginTop: '20px', marginLeft: '10px' }}>
          閉じる
        </Button>
      </Box>
    );
  };

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
          onClick={() => setIsBulkInputModalOpen(true)}
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
            <TableRow style={{ 
              backgroundColor: 'rgb(245, 245, 245)',
              borderBottom: '0px solid rgb(231, 229, 228)',
              boxSizing: 'border-box',
              color: 'rgba(0, 0, 0, 0.87)',
              fontFamily: '__Noto_Sans_JP_11f406, __Noto_Sans_JP_Fallback_11f406',
              fontSize: '16px',
              fontWeight: 400,
              lineHeight: '24px',
              height: '140.5px',
              verticalAlign: 'middle',
              width: '1762px'
            }}>
              <TableCell style={{ fontWeight: 'bold', padding: '10px' }}>スタッフ名</TableCell>
              <TableCell style={{ fontWeight: 'bold', padding: '10px' }}>設定状況</TableCell>
              <TableCell style={{ fontWeight: 'bold', padding: '10px' }}>設定</TableCell>
              {Array.from({ length: daysInMonth }, (_, i) => (
                <TableCell key={i} align="center" style={{ fontWeight: 'bold', padding: '10px' }}>
                  {i + 1}
                  <br />
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
      <Modal
        open={isBulkInputModalOpen}
        onClose={() => setIsBulkInputModalOpen(false)}
      >
        <BulkInputModal />
      </Modal>
    </div>
  );
};

export default StaffShiftSettings;