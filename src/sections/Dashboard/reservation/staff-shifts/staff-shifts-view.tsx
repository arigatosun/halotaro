"use client";

import React, { useState, useEffect, useRef } from "react";
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
  CircularProgress,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import moment from "moment";
import 'moment/locale/ja';
import Link from "next/link";
import BulkInputModal from "@/components/ui/BulkInputModal";
import { getStaffs, getStaffShifts, upsertStaffShift, getSalonBusinessHours } from "@/lib/api";
import { Staff, ShiftData, DBStaffShift } from "./types";

moment.locale('ja');

interface ShiftPopoverData {
  visible: boolean;
  anchorEl: HTMLButtonElement | null;
  date: moment.Moment | null;
  staffName: string;
  currentShift: ShiftData | null;
}

const StaffShiftSettings: React.FC = () => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const { year, month } = params;
  const [currentDate, setCurrentDate] = useState(moment());
  const [staffShifts, setStaffShifts] = useState<Staff[]>([]);
  const [shiftPopover, setShiftPopover] = useState<ShiftPopoverData>({
    visible: false,
    anchorEl: null,
    date: null,
    staffName: "",
    currentShift: null,
  });
  const [isBulkInputModalOpen, setIsBulkInputModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [salonBusinessHours, setSalonBusinessHours] = useState<{ [date: string]: boolean }>({});

  useEffect(() => {
    if (year && month) {
      setCurrentDate(moment(`${year}-${month}-01`));
      fetchStaffsAndShifts();
      fetchSalonBusinessHours();
    }
  }, [year, month]);

  const fetchStaffsAndShifts = async () => {
    setIsLoading(true);
    try {
      const staffs = await getStaffs();
      const shifts = await Promise.all(staffs.map(async (staff) => {
        const dbShifts = await getStaffShifts(staff.id.toString(), parseInt(year as string), parseInt(month as string));
        return {
          ...staff,
          shifts: Array.from({ length: 31 }, (_, i) => {
            const dbShift = dbShifts.find(s => s.date === `${year}-${month.toString().padStart(2, '0')}-${(i + 1).toString().padStart(2, '0')}`);
            return dbShift ? convertDBShiftToShiftData(dbShift) : { type: '' };
          })
        };
      }));
      setStaffShifts(shifts);
    } catch (error) {
      console.error("Failed to fetch staffs and shifts:", error);
    }
    setIsLoading(false);
  };

  const fetchSalonBusinessHours = async () => {
    try {
      const businessHours = await getSalonBusinessHours(parseInt(year as string), parseInt(month as string));
      const businessHoursMap = businessHours.reduce((acc, { date, is_holiday }) => {
        acc[date] = is_holiday;
        return acc;
      }, {} as { [date: string]: boolean });
      setSalonBusinessHours(businessHoursMap);
    } catch (error) {
      console.error("Failed to fetch salon business hours:", error);
    }
  };

  const handleShiftClick = (event: React.MouseEvent<HTMLButtonElement>, staffName: string, date: number) => {
    const clickedDate = moment(currentDate).date(date);
    const formattedDate = clickedDate.format('YYYY-MM-DD');
    if (salonBusinessHours[formattedDate]) return;

    const currentShift = staffShifts.find(staff => staff.name === staffName)?.shifts[date - 1] || null;

    setShiftPopover({
      visible: true,
      anchorEl: event.currentTarget,
      date: clickedDate,
      staffName,
      currentShift,
    });
  };

  const handleShiftSubmit = async (values: ShiftData) => {
    const staff = staffShifts.find(s => s.name === shiftPopover.staffName);
    if (!staff || !shiftPopover.date) return;
  
    const dateIndex = shiftPopover.date.date() - 1;
    const dbShift: Omit<DBStaffShift, 'id'> = {
      staff_id: staff.id.toString(),
      date: shiftPopover.date.format('YYYY-MM-DD'),
      shift_status: values.type === '出' ? '出勤' : '休日',
      start_time: values.type === '出' ? values.startTime || null : null,
      end_time: values.type === '出' ? values.endTime || null : null,
      memo: values.memo || null,  // メモを追加
    };
  
    try {
      const result = await upsertStaffShift(dbShift);
      console.log("Upsert result:", result); // デバッグ用
  
      setStaffShifts(prevStaffs =>
        prevStaffs.map(s =>
          s.id === staff.id
            ? {
                ...s,
                shifts: s.shifts.map((shift, index) =>
                  index === dateIndex ? values : shift
                ),
              }
            : s
        )
      );
      console.log("シフトが正常に保存されました");
    } catch (error) {
      console.error("Failed to update shift:", error);
      console.log("シフトの保存に失敗しました");
    }
  
    setShiftPopover({ ...shiftPopover, visible: false, anchorEl: null });
  };

  const handleBulkInputSubmit = async (newShifts: Record<number, ShiftData[]>) => {
    setIsLoading(true);
    try {
      await Promise.all(Object.entries(newShifts).flatMap(([staffId, shifts]) =>
        shifts.map((shift, index) => {
          if (shift.type) {
            const date = moment(currentDate).date(index + 1).format('YYYY-MM-DD');
            if (!salonBusinessHours[date]) {
              return upsertStaffShift({
                staff_id: staffId,
                date,
                shift_status: shift.type === '出' ? '出勤' : '休日',
                start_time: shift.type === '出' ? shift.startTime || null : null,
                end_time: shift.type === '出' ? shift.endTime || null : null,
                memo: shift.memo || null,  // メモを追加
              });
            }
          }
          return Promise.resolve();
        })
      ));

      setStaffShifts(prevStaffs => 
        prevStaffs.map(staff => ({
          ...staff,
          shifts: staff.shifts.map((shift, index) => {
            const date = moment(currentDate).date(index + 1).format('YYYY-MM-DD');
            if (salonBusinessHours[date]) {
              return { type: '店休' };
            }
            return newShifts[staff.id] ? newShifts[staff.id][index] : shift;
          })
        }))
      );
    } catch (error) {
        console.error("Failed to bulk update shifts:", error);
      }
      setIsLoading(false);
      setIsBulkInputModalOpen(false);
    };

  const renderShiftButton = (shift: ShiftData, staffName: string, date: number) => {
    const formattedDate = moment(currentDate).date(date).format('YYYY-MM-DD');
    const isHoliday = salonBusinessHours[formattedDate];

    let buttonText = isHoliday ? "店休" : "未設定";
    let buttonColor = isHoliday ? "#f44336" : "#e0e0e0";
    let textColor = isHoliday ? "#ffffff" : "#000000";

    if (!isHoliday) {
      if (shift.type === "休") {
        buttonText = "休";
        buttonColor = "#ff9800";
        textColor = "#ffffff";
      } else if (shift.type === "出") {
        buttonText = "出";
        buttonColor = "#2196f3";
        textColor = "#ffffff";
      }
    }

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
          cursor: isHoliday ? 'default' : 'pointer',
        }}
        disabled={isHoliday}
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
    currentShift: ShiftData | null;
  }) => {
    const [shiftType, setShiftType] = useState(currentShift?.type || "");
    const [startTime, setStartTime] = useState(currentShift?.startTime || "");
    const [endTime, setEndTime] = useState(currentShift?.endTime || "");
    const [memo, setMemo] = useState(currentShift?.memo || "");
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleShiftSubmit({ type: shiftType, startTime, endTime, memo });
    };
  
    return (
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <Typography variant="h6" style={{ marginBottom: '10px' }}>
          {date.format('YYYY年MM月DD日(ddd)')} {staffName}
        </Typography>
        <RadioGroup
          value={shiftType}
          onChange={(e) => setShiftType(e.target.value)}
          style={{ marginBottom: '10px' }}
        >
          <FormControlLabel value="出" control={<Radio />} label="出勤" />
          <FormControlLabel value="休" control={<Radio />} label="休日" />
        </RadioGroup>
        {shiftType === "出" && (
          <Box sx={{ display: 'flex', gap: 2, marginBottom: 2 }}>
            <FormControl sx={{ flex: 1 }}>
              <InputLabel>開始時間</InputLabel>
              <Select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value as string)}
                label="開始時間"
              >
                {generateTimeOptions()}
              </Select>
            </FormControl>
            <FormControl sx={{ flex: 1 }}>
              <InputLabel>終了時間</InputLabel>
              <Select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value as string)}
                label="終了時間"
              >
                {generateTimeOptions()}
              </Select>
            </FormControl>
          </Box>
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

  const convertDBShiftToShiftData = (dbShift: DBStaffShift): ShiftData => ({
    type: dbShift.shift_status === '出勤' ? '出' : '休',
    startTime: dbShift.start_time,
    endTime: dbShift.end_time,
    memo: dbShift.memo,
  });

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

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

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
                {staff.shifts.map((shift, index) => (
                  <TableCell key={index} align="center" style={{ padding: '4px' }}>
                    {renderShiftButton(shift, staff.name, index + 1)}
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
  PaperProps={{
    style: { 
      width: '350px', // 幅を固定
      maxHeight: '80vh', 
      overflowY: 'auto'
    },
  }}
>
  <div style={{ padding: '20px' }}>
    {shiftPopover.date && (
      <ShiftPopoverContent
        staffName={shiftPopover.staffName}
        date={shiftPopover.date}
        currentShift={shiftPopover.currentShift}
      />
    )}
  </div>
</Popover>

      <Modal
        open={isBulkInputModalOpen}
        onClose={() => setIsBulkInputModalOpen(false)}
      >
        <BulkInputModal
          staffs={staffShifts}
          currentDate={currentDate}
          onSubmit={handleBulkInputSubmit}
          onClose={() => setIsBulkInputModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default StaffShiftSettings;