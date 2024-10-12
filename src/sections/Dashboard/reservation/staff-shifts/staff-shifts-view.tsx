// staff-shifts-view.tsx

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
  CircularProgress,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import moment from "moment";
import 'moment/locale/ja';
import Link from "next/link";
import BulkInputModal from "@/components/ui/BulkInputModal";
import { getStaffShifts, upsertStaffShift, getSalonBusinessHours } from "@/lib/api";
import { Staff, ShiftData, DBStaffShift } from "./types";
import { useAuth } from "@/contexts/authcontext";
import { supabase } from "@/lib/supabaseClient";

moment.locale('ja');

interface ShiftPopoverData {
  visible: boolean;
  anchorEl: HTMLButtonElement | null;
  date: moment.Moment | null;
  staffName: string;
  currentShift: ShiftData | null;
}

interface WorkPattern {
  id: string;
  abbreviation: string;
  start_time: string | null;
  end_time: string | null;
  is_business_start: boolean;
  is_business_end: boolean;
}

const formatTimeForDisplay = (time: string | null): string => {
  if (!time) return "";
  return time.substring(0, 5);
};

const formatTimeForDatabase = (time: string | null | undefined): string | null => {
  if (!time || time.trim() === '') return null;
  return time + ":00";
};

// シフトが全て設定されているかを確認する関数
const isAllShiftsSet = (shifts: ShiftData[]): boolean => {
  return shifts.every(shift => shift.type !== '');
};

const StaffShiftSettings: React.FC = () => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const { year, month } = params;
  const { user, loading: authLoading } = useAuth();
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
    if (year && month && user) {
      setCurrentDate(moment(`${year}-${month}-01`));
      fetchStaffsAndShifts(user.id);
      fetchSalonBusinessHours();
    }
  }, [year, month, user]);

  const fetchStaffsAndShifts = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data: staffs, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', userId)
        .eq('is_published', true);

      if (error) throw error;

      const daysInMonth = currentDate.daysInMonth();
      const shifts = await Promise.all(staffs.map(async (staff) => {
        const dbShifts = await getStaffShifts(staff.id.toString(), parseInt(year as string), parseInt(month as string));
        return {
          ...staff,
          shifts: Array.from({ length: daysInMonth }, (_, i) => {
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

    const staff = staffShifts.find(s => s.name === staffName);
    const currentShift = staff?.shifts[date - 1] || null;

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
      start_time: values.type === '出' ? formatTimeForDatabase(values.startTime) : null,
      end_time: values.type === '出' ? formatTimeForDatabase(values.endTime) : null,
      memo: values.memo || null,
    };

    try {
      const result = await upsertStaffShift(dbShift);
      console.log("Upsert result:", result);

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

  const handleBulkInputSubmit = async (newShifts: Record<number, { [index: number]: ShiftData }>) => {
    setIsLoading(true);
    try {
      await Promise.all(Object.entries(newShifts).flatMap(([staffId, shifts]) =>
        Object.entries(shifts).map(([indexStr, shift]) => {
          const index = parseInt(indexStr, 10);
          if (shift.type) {
            const date = moment(currentDate).date(index + 1).format('YYYY-MM-DD');
            if (!salonBusinessHours[date]) {
              return upsertStaffShift({
                staff_id: staffId,
                date,
                shift_status: shift.type === '出' ? '出勤' : '休日',
                start_time: shift.type === '出' ? formatTimeForDatabase(shift.startTime) : null,
                end_time: shift.type === '出' ? formatTimeForDatabase(shift.endTime) : null,
                memo: shift.memo || null,
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
            return newShifts[staff.id] && newShifts[staff.id][index]
              ? newShifts[staff.id][index]
              : shift;
          })
        }))
      );
    } catch (error) {
      console.error("Failed to bulk update shifts:", error);
    }
    setIsLoading(false);
    setIsBulkInputModalOpen(false);
  };

  const renderShiftButton = (shift: ShiftData | null, staffName: string, date: number) => {
    const formattedDate = moment(currentDate).date(date).format('YYYY-MM-DD');
    const isHoliday = salonBusinessHours[formattedDate];

    let buttonText = isHoliday ? "店休" : "未設定";
    let buttonColor = isHoliday ? "#f44336" : "#e0e0e0";
    let textColor = isHoliday ? "#ffffff" : "#000000";

    if (!shift) {
      buttonText = "未設定";
      buttonColor = "#e0e0e0";
      textColor = "#000000";
    } else if (!isHoliday) {
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
          minWidth: '45px', 
          maxWidth: '45px',
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
    user,
    staffName,
    date,
    currentShift,
  }: {
    user: any;
    staffName: string;
    date: moment.Moment;
    currentShift: ShiftData | null;
  }) => {
    const [shiftType, setShiftType] = useState(currentShift?.type || "");
    const [startTime, setStartTime] = useState(formatTimeForDisplay(currentShift?.startTime || null));
    const [endTime, setEndTime] = useState(formatTimeForDisplay(currentShift?.endTime || null));
    const [memo, setMemo] = useState(currentShift?.memo || "");

    const [workPatterns, setWorkPatterns] = useState<WorkPattern[]>([]);
    const [selectedWorkPattern, setSelectedWorkPattern] = useState<string | null>(null);
    const [useBusinessStartTime, setUseBusinessStartTime] = useState<boolean>(false);
    const [useBusinessEndTime, setUseBusinessEndTime] = useState<boolean>(false);

    useEffect(() => {
      if (currentShift) {
        setShiftType(currentShift.type);
        setStartTime(formatTimeForDisplay(currentShift.startTime || null));
        setEndTime(formatTimeForDisplay(currentShift.endTime || null));
        setMemo(currentShift.memo || "");
      }
    }, [currentShift]);

    useEffect(() => {
      const fetchWorkPatterns = async () => {
        if (!user) return;
        const { data, error } = await supabase
          .from('work_patterns')
          .select('id, abbreviation, start_time, end_time, is_business_start, is_business_end')
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

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      let shiftStartTime = startTime;
      let shiftEndTime = endTime;

      if (useBusinessStartTime || useBusinessEndTime) {
        const dateStr = date.format('YYYY-MM-DD');

        // `salon_id` を取得
        const salonId = user.id; // または適切な方法で salon_id を取得

        const { data, error } = await supabase
          .from('salon_business_hours')
          .select('open_time, close_time')
          .eq('date', dateStr)
          .eq('salon_id', salonId) // `salon_id` でフィルタリング
          .single();

        if (error || !data) {
          console.error('salon_business_hours の取得に失敗しました:', error);
          alert('営業時間の取得に失敗しました。営業時間が設定されているか確認してください。');
          return;
        }

        if (useBusinessStartTime) {
          if (data.open_time) {
            shiftStartTime = data.open_time.slice(0, 5);
          } else {
            alert('この日の営業開始時間が設定されていません。');
            return;
          }
        }
        if (useBusinessEndTime) {
          if (data.close_time) {
            shiftEndTime = data.close_time.slice(0, 5);
          } else {
            alert('この日の営業終了時間が設定されていません。');
            return;
          }
        }
      }

      handleShiftSubmit({
        type: shiftType,
        startTime: shiftStartTime,
        endTime: shiftEndTime,
        memo,
      });
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
          <>
            <Box sx={{ display: 'flex', gap: 2, marginBottom: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>開始時間</InputLabel>
                <Select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value as string)}
                  label="開始時間"
                  disabled={useBusinessStartTime}
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
                  disabled={useBusinessEndTime}
                >
                  {generateTimeOptions()}
                </Select>
              </FormControl>
            </Box>
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
                      setStartTime('');
                    } else {
                      setUseBusinessStartTime(false);
                      setStartTime(pattern.start_time ? pattern.start_time.slice(0, 5) : '');
                    }

                    if (pattern.is_business_end) {
                      setUseBusinessEndTime(true);
                      setEndTime('');
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

  if (authLoading || isLoading) {
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
                <TableCell style={{ 
                  fontWeight: 'bold', 
                  padding: '10px',
                  width: '150px',
                  whiteSpace: 'nowrap',
                  position: 'sticky',
                  left: 0,
                  background: '#f5f5f5',
                  zIndex: 2,
                }}>スタッフ名</TableCell>
                <TableCell style={{ fontWeight: 'bold', padding: '10px', width: '100px' }}>設定状況</TableCell>
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
                  <TableCell style={{ 
                    padding: '10px',
                    width: '150px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    position: 'sticky',
                    left: 0,
                    background: '#ffffff',
                    zIndex: 1,
                  }}>
                    {staff.name}
                  </TableCell>
                  <TableCell style={{ padding: '10px' }}>
                    {isAllShiftsSet(staff.shifts) ? (
                      <Button variant="contained" size="small" style={{ backgroundColor: '#1976d2', boxShadow: 'none' }}>
                        設定済
                      </Button>
                    ) : (
                      <Button variant="contained" size="small" style={{ backgroundColor: '#f44336', boxShadow: 'none' }}>
                        未設定
                      </Button>
                    )}
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
        {/* 下部のボタンを削除しました */}
      </Card>
      <Popover
        open={shiftPopover.visible}
        anchorEl={shiftPopover.anchorEl}
        onClose={() => setShiftPopover({ ...shiftPopover, visible: false, anchorEl: null })}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        PaperProps={{
          style: { 
            width: '350px',
            padding: '20px',
            maxHeight: '80vh', 
            overflowY: 'auto'
          },
        }}
      >
        {shiftPopover.date && (
          <ShiftPopoverContent
            user={user}
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
        <BulkInputModal
          staffs={staffShifts}
          currentDate={currentDate}
          user={user}
          onSubmit={handleBulkInputSubmit}
          onClose={() => setIsBulkInputModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default StaffShiftSettings;
