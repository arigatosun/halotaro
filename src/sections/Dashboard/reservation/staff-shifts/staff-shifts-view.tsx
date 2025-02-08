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
import "moment/locale/ja";
import Link from "next/link";
import BulkInputModal from "@/components/ui/BulkInputModal";
import {
  getStaffShifts,
  upsertStaffShift,
  getSalonBusinessHours,
} from "@/lib/api";
import { Staff, ShiftData, DBStaffShift } from "./types";
import { useAuth } from "@/lib/authContext";
import { supabase } from "@/lib/supabaseClient";

moment.locale("ja");

// ----------------- タイプ定義 -----------------
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

// ----------------- ユーティリティ -----------------
const formatTimeForDisplay = (time: string | null): string => {
  if (!time) return "";
  return time.substring(0, 5);
};

const formatTimeForDatabase = (
  time: string | null | undefined
): string | null => {
  if (!time || time.trim() === "") return null;
  return time + ":00";
};

// シフトが全て設定されているかを確認する関数
// 「店休」も含めて、type が空文字("")以外であれば「設定済」とみなす。
const isAllShiftsSet = (shifts: ShiftData[]): boolean => {
  return shifts.every((shift) => shift.type !== "");
};

// DB のシフトレコード → フロント用 ShiftData に変換
const convertDBShiftToShiftData = (dbShift: DBStaffShift): ShiftData => ({
  type: dbShift.shift_status === "出勤" ? "出" : "休",
  startTime: dbShift.start_time,
  endTime: dbShift.end_time,
  memo: dbShift.memo,
});

const StaffShiftSettings: React.FC = () => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // URLパラメータ ( /shift-settings/[year]/[month] ) から取得
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

  // 「店休」判定用に、key: 日付(YYYY-MM-DD), value: boolean のマップを保持
  const [salonBusinessHours, setSalonBusinessHours] = useState<{
    [date: string]: boolean;
  }>({});

  // ----------------- データ取得 -----------------
  // useEffect: ユーザー, year, month が揃ったらデータを取得
  useEffect(() => {
    if (year && month && user) {
      const newDate = moment(`${year}-${month}-01`);
      setCurrentDate(newDate);

      // 一括でデータを取得し、スタッフシフトを組み立てる
      fetchStaffsAndShifts(user.id, newDate);
    }
  }, [year, month, user]);

  // 「スタッフ一覧 & シフト情報 & 店休日」をまとめて取得し、state に反映
  const fetchStaffsAndShifts = async (userId: string, date: moment.Moment) => {
    setIsLoading(true);
    try {
      // 1) 店休日データを取得
      const businessHours = await getSalonBusinessHours(
        date.year(),
        date.month() + 1
      );
      console.log("businessHours:", businessHours);
      const businessHoursMap = businessHours.reduce(
        (acc, { date: dateStr, is_holiday }) => {
          acc[dateStr] = is_holiday;
          return acc;
        },
        {} as { [date: string]: boolean }
      );
      // state に反映 (レンダリング時や他処理でも使うため)
      setSalonBusinessHours(businessHoursMap);

      // 2) スタッフ一覧を取得
      const { data: staffs, error } = await supabase
        .from("staff")
        .select("*")
        .eq("user_id", userId)
        .eq("is_published", true)
        .order("schedule_order", { ascending: true });

      if (error) throw error;

      // 3) 各スタッフごとにシフトレコードを取得し、
      //    「店休」か「出勤/休日(未設定)」を判定して配列を組み立てる
      const daysInMonth = date.daysInMonth();
      const staffData = await Promise.all(
        staffs.map(async (staff) => {
          const dbShifts = await getStaffShifts(
            staff.id.toString(),
            date.year(),
            date.month() + 1
          );
          console.log("dbShifts for staff:", staff.name, dbShifts);

          // 4) 1か月分をループして
          //    - 店休日なら { type: "店休" }
          //    - シフトレコードがあれば変換
          //    - 何もなければ空文字
          const shiftArray = Array.from({ length: daysInMonth }, (_, i) => {
            const dayStr = date
              .clone()
              .date(i + 1)
              .format("YYYY-MM-DD");
            if (businessHoursMap[dayStr]) {
              // 店休日
              return { type: "店休" };
            } else {
              // DBレコードがあるか検索
              const dbShift = dbShifts.find((s) => s.date === dayStr);
              return dbShift
                ? convertDBShiftToShiftData(dbShift)
                : { type: "" }; // 未設定
            }
          });

          return {
            ...staff,
            shifts: shiftArray,
          };
        })
      );

      // 5) 生成した配列を state に保存
      setStaffShifts(staffData);
    } catch (error) {
      console.error("Failed to fetch staffs and shifts:", error);
    }
    setIsLoading(false);
  };

  // ----------------- シフト入力ポップオーバー -----------------
  const handleShiftClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    staffName: string,
    day: number
  ) => {
    const clickedDate = moment(currentDate).date(day);
    const formattedDate = clickedDate.format("YYYY-MM-DD");

    // 店休日は入力不可にしているので、is_holiday なら何もしない
    if (salonBusinessHours[formattedDate]) return;

    const staff = staffShifts.find((s) => s.name === staffName);
    const currentShift = staff?.shifts[day - 1] || null;

    setShiftPopover({
      visible: true,
      anchorEl: event.currentTarget,
      date: clickedDate,
      staffName,
      currentShift,
    });
  };

  // ポップオーバーで「出/休」を入力 → API経由で DB保存 → フロント状態を更新
  const handleShiftSubmit = async (values: ShiftData) => {
    const staff = staffShifts.find((s) => s.name === shiftPopover.staffName);
    if (!staff || !shiftPopover.date) return;

    const dateIndex = shiftPopover.date.date() - 1;

    const dbShift: Omit<DBStaffShift, "id"> = {
      staff_id: staff.id.toString(),
      date: shiftPopover.date.format("YYYY-MM-DD"),
      shift_status: values.type === "出" ? "出勤" : "休日",
      start_time:
        values.type === "出" ? formatTimeForDatabase(values.startTime) : null,
      end_time:
        values.type === "出" ? formatTimeForDatabase(values.endTime) : null,
      memo: values.memo || null,
    };

    try {
      const result = await upsertStaffShift(dbShift);
      console.log("Upsert result:", result);

      // フロント状態を更新
      setStaffShifts((prevStaffs) =>
        prevStaffs.map((s) =>
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

  // ----------------- 一括入力 -----------------
  const handleBulkInputSubmit = async (
    newShifts: Record<number, { [index: number]: ShiftData }>
  ) => {
    setIsLoading(true);
    try {
      // 1) DB更新: シフト指定がある＆店休日でない日分
      await Promise.all(
        Object.entries(newShifts).flatMap(([staffId, shifts]) =>
          Object.entries(shifts).map(([indexStr, shift]) => {
            const index = parseInt(indexStr, 10);
            if (shift.type) {
              const date = moment(currentDate)
                .date(index + 1)
                .format("YYYY-MM-DD");
              // 店休日は skip
              if (!salonBusinessHours[date]) {
                return upsertStaffShift({
                  staff_id: staffId,
                  date,
                  shift_status: shift.type === "出" ? "出勤" : "休日",
                  start_time:
                    shift.type === "出"
                      ? formatTimeForDatabase(shift.startTime)
                      : null,
                  end_time:
                    shift.type === "出"
                      ? formatTimeForDatabase(shift.endTime)
                      : null,
                  memo: shift.memo || null,
                });
              }
            }
            return Promise.resolve();
          })
        )
      );

      // 2) フロント状態を更新
      setStaffShifts((prevStaffs) =>
        prevStaffs.map((staff) => ({
          ...staff,
          shifts: staff.shifts.map((shift, index) => {
            const dateStr = moment(currentDate)
              .date(index + 1)
              .format("YYYY-MM-DD");
            // 店休日なら type: "店休"
            if (salonBusinessHours[dateStr]) {
              return { type: "店休" };
            }
            // 一括指定があればそれを反映
            const staffUpdates = newShifts[staff.id];
            if (staffUpdates && staffUpdates[index]) {
              return staffUpdates[index];
            }
            // 何もなければ元のまま
            return shift;
          }),
        }))
      );
    } catch (error) {
      console.error("Failed to bulk update shifts:", error);
    }
    setIsLoading(false);
    setIsBulkInputModalOpen(false);
  };

  // ----------------- レンダリング関連 -----------------
  // シフトボタンの表示ロジック
  const renderShiftButton = (
    shift: ShiftData | null,
    staffName: string,
    day: number
  ) => {
    const formattedDate = moment(currentDate).date(day).format("YYYY-MM-DD");
    const isHoliday = salonBusinessHours[formattedDate];

    // デフォルト値
    let buttonText = isHoliday ? "店休" : "未設定";
    let buttonColor = isHoliday ? "#f44336" : "#e0e0e0";
    let textColor = isHoliday ? "#ffffff" : "#000000";

    // shift が存在＆店休でない場合
    if (shift && !isHoliday) {
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
        onClick={(event) => handleShiftClick(event, staffName, day)}
        style={{
          minWidth: "45px",
          maxWidth: "45px",
          minHeight: "30px",
          maxHeight: "30px",
          padding: "2px 4px",
          backgroundColor: buttonColor,
          color: textColor,
          fontSize: "0.75rem",
          boxShadow: "none",
          borderRadius: "4px",
          margin: "2px",
          cursor: isHoliday ? "default" : "pointer",
        }}
        disabled={isHoliday}
      >
        {buttonText}
      </Button>
    );
  };

  // ポップオーバーのコンポーネント
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
    // シフト設定フォーム用 state
    const [shiftType, setShiftType] = useState(currentShift?.type || "");
    const [startTime, setStartTime] = useState(
      formatTimeForDisplay(currentShift?.startTime || null)
    );
    const [endTime, setEndTime] = useState(
      formatTimeForDisplay(currentShift?.endTime || null)
    );
    const [memo, setMemo] = useState(currentShift?.memo || "");

    // 勤務パターン(テンプレ)一覧
    const [workPatterns, setWorkPatterns] = useState<WorkPattern[]>([]);
    // 選択中のテンプレ
    const [selectedWorkPattern, setSelectedWorkPattern] = useState<
      string | null
    >(null);

    // 営業時間に合わせるフラグ
    const [useBusinessStartTime, setUseBusinessStartTime] =
      useState<boolean>(false);
    const [useBusinessEndTime, setUseBusinessEndTime] =
      useState<boolean>(false);

    // ポップオーバーが開くたび、現在のシフト情報を初期化
    useEffect(() => {
      if (currentShift) {
        setShiftType(currentShift.type);
        setStartTime(formatTimeForDisplay(currentShift.startTime || null));
        setEndTime(formatTimeForDisplay(currentShift.endTime || null));
        setMemo(currentShift.memo || "");
      }
    }, [currentShift]);

    // 勤務パターンの取得
    useEffect(() => {
      const fetchWorkPatterns = async () => {
        if (!user) return;
        const { data, error } = await supabase
          .from("work_patterns")
          .select(
            "id, abbreviation, start_time, end_time, is_business_start, is_business_end"
          )
          .eq("user_id", user.id);

        if (error) {
          console.error("勤務パターンの取得に失敗しました:", error);
        } else {
          setWorkPatterns(data as WorkPattern[]);
        }
      };

      fetchWorkPatterns();
    }, [user]);

    // シフト種別(出勤/休日)を切り替えたらテンプレ選択をリセット
    useEffect(() => {
      setSelectedWorkPattern(null);
      setUseBusinessStartTime(false);
      setUseBusinessEndTime(false);
    }, [shiftType]);

    // フォーム送信時
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      let shiftStartTime = startTime;
      let shiftEndTime = endTime;

      // 営業時間に合わせるオプションが有効なら、DB から open_time/close_time を取得して反映
      if (useBusinessStartTime || useBusinessEndTime) {
        const dateStr = date.format("YYYY-MM-DD");

        // ※実際には適切な salon_id を用いてください
        const salonId = user.id;

        const { data, error } = await supabase
          .from("salon_business_hours")
          .select("open_time, close_time")
          .eq("date", dateStr)
          .eq("salon_id", salonId)
          .single();

        if (error || !data) {
          console.error("salon_business_hours の取得に失敗しました:", error);
          alert(
            "営業時間の取得に失敗しました。営業時間が設定されているか確認してください。"
          );
          return;
        }

        if (useBusinessStartTime) {
          if (data.open_time) {
            shiftStartTime = data.open_time.slice(0, 5); // "HH:MM"
          } else {
            alert("この日の営業開始時間が設定されていません。");
            return;
          }
        }
        if (useBusinessEndTime) {
          if (data.close_time) {
            shiftEndTime = data.close_time.slice(0, 5);
          } else {
            alert("この日の営業終了時間が設定されていません。");
            return;
          }
        }
      }

      // シフトを保存 (アップサート)
      handleShiftSubmit({
        type: shiftType,
        startTime: shiftStartTime,
        endTime: shiftEndTime,
        memo,
      });
    };

    // 時間選択肢を 00:00～23:30 まで 30分刻みで生成
    const generateTimeOptions = () => {
      const options = [];
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const time = `${hour.toString().padStart(2, "0")}:${minute
            .toString()
            .padStart(2, "0")}`;
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
      <form onSubmit={handleSubmit} style={{ width: "100%" }}>
        <Typography variant="h6" style={{ marginBottom: "10px" }}>
          {date.format("YYYY年MM月DD日(ddd)")} {staffName}
        </Typography>
        <RadioGroup
          value={shiftType}
          onChange={(e) => setShiftType(e.target.value)}
          style={{ marginBottom: "10px" }}
        >
          <FormControlLabel value="出" control={<Radio />} label="出勤" />
          <FormControlLabel value="休" control={<Radio />} label="休日" />
        </RadioGroup>

        {shiftType === "出" && (
          <>
            {/* 開始終了時間 */}
            <Box sx={{ display: "flex", gap: 2, marginBottom: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>開始時間</InputLabel>
                <Select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value as string)}
                  label="開始時間"
                  disabled={useBusinessStartTime} // 営業開始に合わせる場合は編集不可
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
                  disabled={useBusinessEndTime} // 営業終了に合わせる場合は編集不可
                >
                  {generateTimeOptions()}
                </Select>
              </FormControl>
            </Box>

            {/* 勤務パターン（テンプレ） */}
            <FormControl fullWidth margin="normal">
              <InputLabel>勤務パターン</InputLabel>
              <Select
                value={selectedWorkPattern || ""}
                onChange={(e) => {
                  const patternId = e.target.value as string;
                  setSelectedWorkPattern(patternId);
                  const pattern = workPatterns.find(
                    (wp) => wp.id === patternId
                  );
                  if (pattern) {
                    if (pattern.is_business_start) {
                      setUseBusinessStartTime(true);
                      setStartTime("");
                    } else {
                      setUseBusinessStartTime(false);
                      setStartTime(
                        pattern.start_time ? pattern.start_time.slice(0, 5) : ""
                      );
                    }

                    if (pattern.is_business_end) {
                      setUseBusinessEndTime(true);
                      setEndTime("");
                    } else {
                      setUseBusinessEndTime(false);
                      setEndTime(
                        pattern.end_time ? pattern.end_time.slice(0, 5) : ""
                      );
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

        {/* メモ */}
        <TextField
          fullWidth
          margin="normal"
          label="メモ"
          multiline
          rows={2}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          style={{ marginTop: "10px" }}
        >
          入力する
        </Button>
      </form>
    );
  };

  // Legend 表示用
  const Legend = () => (
    <Box
      sx={{
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        gap: 2,
        marginTop: 2,
        marginBottom: 2,
      }}
    >
      {/* 未設定 */}
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box
          sx={{
            width: 20,
            height: 20,
            backgroundColor: "#e0e0e0",
            marginRight: 1,
          }}
        ></Box>
        <Typography variant="body2">未設定</Typography>
      </Box>
      {/* 出勤 */}
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box
          sx={{
            width: 20,
            height: 20,
            backgroundColor: "#2196f3",
            marginRight: 1,
          }}
        ></Box>
        <Typography variant="body2">出勤</Typography>
      </Box>
      {/* 休み */}
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box
          sx={{
            width: 20,
            height: 20,
            backgroundColor: "#ff9800",
            marginRight: 1,
          }}
        ></Box>
        <Typography variant="body2">休み</Typography>
      </Box>
      {/* 店休 */}
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box
          sx={{
            width: 20,
            height: 20,
            backgroundColor: "#f44336",
            marginRight: 1,
          }}
        ></Box>
        <Typography variant="body2">店休</Typography>
      </Box>
    </Box>
  );

  // ローディング時の表示
  if (authLoading || isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // ----------------- JSX返却 -----------------
  const daysInMonth = currentDate.daysInMonth();

  return (
    <div style={{ padding: "20px" }}>
      <Card style={{ padding: "20px" }}>
        {/* タイトル */}
        <Grid
          container
          justifyContent="space-between"
          alignItems="center"
          style={{ marginBottom: "20px" }}
        >
          <Grid item>
            <Typography variant="h5">
              シフト設定 ({currentDate.format("YYYY年MM月")})
            </Typography>
          </Grid>
          <Grid item>
            <HelpOutlineIcon />
          </Grid>
        </Grid>

        <Typography variant="body1" style={{ marginBottom: "20px" }}>
          スタッフの1か月のシフトを設定します。
          休日や予定（一部休や外出など）を設定することで、予約受付が停止できます。
        </Typography>

        {/* 一括入力ボタン */}
        <Button
          variant="contained"
          style={{
            marginBottom: "20px",
            backgroundColor: "#1976d2",
            boxShadow: "none",
            borderRadius: "4px",
          }}
          onClick={() => setIsBulkInputModalOpen(true)}
        >
          一括入力
        </Button>
        <Typography variant="body2" style={{ marginBottom: "20px" }}>
          スタッフと日を指定して、一括で入力できます。
        </Typography>

        {/* 凡例 */}
        <Legend />

        {/* シフト表 */}
        <TableContainer component={Paper} style={{ marginBottom: "20px" }}>
          <Table size="small">
            <TableHead>
              <TableRow
                style={{
                  backgroundColor: "rgb(245, 245, 245)",
                  borderBottom: "0px solid rgb(231, 229, 228)",
                  boxSizing: "border-box",
                  color: "rgba(0, 0, 0, 0.87)",
                  fontFamily:
                    "__Noto_Sans_JP_11f406, __Noto_Sans_JP_Fallback_11f406",
                  fontSize: "16px",
                  fontWeight: 400,
                  lineHeight: "24px",
                  height: "140.5px",
                  verticalAlign: "middle",
                }}
              >
                {/* スタッフ名 */}
                <TableCell
                  style={{
                    fontWeight: "bold",
                    padding: "10px",
                    width: "150px",
                    whiteSpace: "nowrap",
                    position: "sticky",
                    left: 0,
                    background: "#f5f5f5",
                    zIndex: 2,
                  }}
                >
                  スタッフ名
                </TableCell>
                {/* 設定状況 */}
                <TableCell
                  style={{
                    fontWeight: "bold",
                    padding: "10px",
                    width: "100px",
                  }}
                >
                  設定状況
                </TableCell>

                {/* 日付ヘッダー */}
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <TableCell
                    key={i}
                    align="center"
                    style={{ fontWeight: "bold", padding: "10px" }}
                  >
                    {i + 1}
                    <br />
                    <span
                      style={{
                        color:
                          moment(currentDate)
                            .date(i + 1)
                            .day() === 0
                            ? "red"
                            : moment(currentDate)
                                .date(i + 1)
                                .day() === 6
                            ? "blue"
                            : "inherit",
                      }}
                    >
                      (
                      {moment(currentDate)
                        .date(i + 1)
                        .format("ddd")}
                      )
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {staffShifts.map((staff) => (
                <TableRow key={staff.id}>
                  {/* スタッフ名セル */}
                  <TableCell
                    style={{
                      padding: "10px",
                      width: "150px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      position: "sticky",
                      left: 0,
                      background: "#ffffff",
                      zIndex: 1,
                    }}
                  >
                    {staff.name}
                  </TableCell>

                  {/* 設定状況セル */}
                  <TableCell style={{ padding: "10px" }}>
                    {isAllShiftsSet(staff.shifts) ? (
                      <Button
                        variant="contained"
                        size="small"
                        style={{
                          backgroundColor: "#1976d2",
                          boxShadow: "none",
                        }}
                      >
                        設定済
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        size="small"
                        style={{
                          backgroundColor: "#f44336",
                          boxShadow: "none",
                        }}
                      >
                        未設定
                      </Button>
                    )}
                  </TableCell>

                  {/* 日別セル */}
                  {staff.shifts.map((shift, index) => (
                    <TableCell
                      key={index}
                      align="center"
                      style={{ padding: "4px" }}
                    >
                      {renderShiftButton(shift, staff.name, index + 1)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* シフト入力 (Popover) */}
      <Popover
        open={shiftPopover.visible}
        anchorEl={shiftPopover.anchorEl}
        onClose={() =>
          setShiftPopover({
            ...shiftPopover,
            visible: false,
            anchorEl: null,
          })
        }
        anchorOrigin={{
          vertical: "center",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "center",
          horizontal: "center",
        }}
        PaperProps={{
          style: {
            width: "350px",
            padding: "20px",
            maxHeight: "80vh",
            overflowY: "auto",
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

      {/* 一括入力モーダル */}
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
