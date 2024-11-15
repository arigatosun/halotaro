import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Reservation,
  Staff,
  MenuItem as MenuItemType,
  BusinessHour,
} from "@/types/reservation";
import moment from "moment-timezone";
import { Alert, Snackbar, Grid, Paper, Typography, Box } from "@mui/material";

interface EditingFormDataType extends Partial<Reservation> {
  customer_first_name?: string;
  customer_last_name?: string;
  customer_first_name_kana?: string;
  customer_last_name_kana?: string;
}

interface ReservationEditFormProps {
  reservation: Reservation;
  onClose: () => void;
  onSubmit: (data: Partial<Reservation>) => void;
  onDelete: (id: string, cancellationType: string) => void;
  staffList: Staff[];
  menuList: MenuItemType[];
  reservations: Reservation[];
  businessHours: BusinessHour[];
}

const ReservationEditForm: React.FC<ReservationEditFormProps> = ({
  reservation,
  onClose,
  onSubmit,
  onDelete,
  staffList,
  menuList,
  reservations,
  businessHours,
}) => {
  const [editingFormData, setEditingFormData] = useState<EditingFormDataType>(
    {}
  );
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isOverlap, setIsOverlap] = useState<boolean>(false);
  const [overlapMessage, setOverlapMessage] = useState<string>("");
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    if (reservation) {
      // フルネームを姓と名に分割
      const nameParts = (reservation.customer_name || "").split(" ");
      const lastName = nameParts[0] || "";
      const firstName = nameParts[1] || "";

      const nameKanaParts = (reservation.customer_name_kana || "").split(" ");
      const lastNameKana = nameKanaParts[0] || "";
      const firstNameKana = nameKanaParts[1] || "";

      setEditingFormData({
        ...reservation,
        customer_last_name: lastName,
        customer_first_name: firstName,
        customer_last_name_kana: lastNameKana,
        customer_first_name_kana: firstNameKana,
        start_time: reservation.start_time
          ? moment(reservation.start_time)
              .tz("Asia/Tokyo")
              .format("YYYY-MM-DDTHH:mm")
          : "",
        end_time: reservation.end_time
          ? moment(reservation.end_time)
              .tz("Asia/Tokyo")
              .format("YYYY-MM-DDTHH:mm")
          : "",
      });
      setSelectedDate(
        moment(reservation.start_time).tz("Asia/Tokyo").format("YYYY-MM-DD")
      );
      setSelectedTime(
        moment(reservation.start_time).tz("Asia/Tokyo").format("HH:mm")
      );
    }
  }, [reservation]);

  useEffect(() => {
    if (selectedDate && editingFormData.staff_id && editingFormData.menu_id) {
      generateAvailableTimeSlots();
    }
  }, [selectedDate, editingFormData.staff_id, editingFormData.menu_id]);

  const generateAvailableTimeSlots = () => {
    const selectedMenu = menuList.find(
      (menu) => menu.id === editingFormData.menu_id
    );
    if (!selectedMenu) return;

    const dateStr = selectedDate;
    let businessHourForDate = businessHours.find((bh) => bh.date === dateStr);

    if (!businessHourForDate) {
      // デフォルトの営業時間を使用
      const isWeekend = [0, 6].includes(moment(dateStr).day());
      businessHourForDate = {
        date: dateStr,
        open_time: isWeekend ? "10:00:00" : "09:00:00",
        close_time: isWeekend ? "18:00:00" : "20:00:00",
        is_holiday: false,
      };
    }

    if (businessHourForDate.is_holiday) {
      console.log("This day is a holiday");
      setAvailableTimeSlots([]);
      return;
    }

    const openingTime = moment.tz(
      `${dateStr} ${businessHourForDate.open_time}`,
      "YYYY-MM-DD HH:mm:ss",
      "Asia/Tokyo"
    );
    const closingTime = moment.tz(
      `${dateStr} ${businessHourForDate.close_time}`,
      "YYYY-MM-DD HH:mm:ss",
      "Asia/Tokyo"
    );

    const slots = [];

    let currentTime = openingTime.clone();
    while (currentTime.isBefore(closingTime)) {
      const slotStart = currentTime.format("HH:mm");
      const slotEnd = currentTime.clone().add(selectedMenu.duration, "minutes");

      if (
        slotEnd.isSameOrBefore(closingTime) &&
        !isSlotOverlapping(currentTime, slotEnd)
      ) {
        slots.push(slotStart);
      }
      currentTime.add(30, "minutes");
    }

    setAvailableTimeSlots(slots);
  };

  const isSlotOverlapping = (start: moment.Moment, end: moment.Moment) => {
    return reservations.some((res) => {
      if (res.id === editingFormData.id) return false;
      if (res.staff_id !== editingFormData.staff_id) return false;
      if (["cancelled", "completed"].includes(res.status || "")) return false;
      const resStart = moment(res.start_time).tz("Asia/Tokyo");
      const resEnd = moment(res.end_time).tz("Asia/Tokyo");
      return start.isBefore(resEnd) && end.isAfter(resStart);
    });
  };

  const handleChange = (name: string, value: string | boolean) => {
    setEditingFormData((prev) => ({
      ...prev,
      [name]: name === "menu_id" ? parseInt(value as string, 10) : value,
    }));
    if (name === "staff_id" || name === "menu_id") {
      setIsOverlap(false);
      setOverlapMessage("");
      setSelectedTime(null);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setIsOverlap(false);
    setOverlapMessage("");
    setSelectedTime(null);
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isOverlap) {
      setSnackbar({ message: overlapMessage, severity: "error" });
      return;
    }

    // 必須項目のバリデーション
    if (
      !editingFormData.customer_last_name_kana ||
      !editingFormData.customer_first_name_kana
    ) {
      setSnackbar({
        message: "顧客名（カナ）は必須項目です。",
        severity: "error",
      });
      return;
    }

    if (!editingFormData.staff_id) {
      setSnackbar({
        message: "担当スタッフを選択してください。",
        severity: "error",
      });
      return;
    }

    if (!selectedDate) {
      setSnackbar({ message: "予約日を選択してください。", severity: "error" });
      return;
    }

    // 姓名を結合
    const customer_name = `${editingFormData.customer_last_name || ""} ${
      editingFormData.customer_first_name || ""
    }`.trim();
    const customer_name_kana = `${
      editingFormData.customer_last_name_kana || ""
    } ${editingFormData.customer_first_name_kana || ""}`.trim();

    const updatedReservation: Partial<Reservation> = {
      ...editingFormData,
      customer_name,
      customer_name_kana,
      // メニューや予約時間が選択されていない場合は既存の値を使用
      menu_id: editingFormData.menu_id || reservation.menu_id,
      start_time: editingFormData.start_time || reservation.start_time,
      end_time: editingFormData.end_time || reservation.end_time,
    };

    try {
      await onSubmit(updatedReservation);
      onClose();
    } catch (error) {
      console.error("EditForm: Error submitting form", error);
      setSnackbar({ message: "予約の更新に失敗しました", severity: "error" });
    }
  };

  const handleDelete = async () => {
    if (window.confirm("この予約をキャンセルしますか？")) {
      if (editingFormData.id && editingFormData.start_time) {
        try {
          const now = moment();
          const startTime = moment(editingFormData.start_time);

          const cancellationType = now.isAfter(startTime)
            ? "no_show"
            : "salon_cancelled";

          await onDelete(editingFormData.id, cancellationType);
          onClose();
        } catch (error) {
          console.error("Error cancelling reservation:", error);
          setSnackbar({
            message: "予約のキャンセルに失敗しました",
            severity: "error",
          });
        }
      }
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>予約の編集</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: "flex", gap: 4 }}>
            <Box sx={{ flex: 1 }}>
              <div className="space-y-4">
                {/* 顧客情報の表示 */}
                <div className="space-y-2">
                  <Label htmlFor="customer_last_name">顧客名（姓）</Label>
                  <Input
                    id="customer_last_name"
                    value={editingFormData.customer_last_name || ""}
                    onChange={(e) =>
                      handleChange("customer_last_name", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_first_name">顧客名（名）</Label>
                  <Input
                    id="customer_first_name"
                    value={editingFormData.customer_first_name || ""}
                    onChange={(e) =>
                      handleChange("customer_first_name", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_last_name_kana">
                    顧客名（カナ・姓）
                  </Label>
                  <Input
                    id="customer_last_name_kana"
                    value={editingFormData.customer_last_name_kana || ""}
                    onChange={(e) =>
                      handleChange("customer_last_name_kana", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_first_name_kana">
                    顧客名（カナ・名）
                  </Label>
                  <Input
                    id="customer_first_name_kana"
                    value={editingFormData.customer_first_name_kana || ""}
                    onChange={(e) =>
                      handleChange("customer_first_name_kana", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_email">メールアドレス</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={editingFormData.customer_email || ""}
                    onChange={(e) =>
                      handleChange("customer_email", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_phone">電話番号</Label>
                  <Input
                    id="customer_phone"
                    type="tel"
                    value={editingFormData.customer_phone || ""}
                    onChange={(e) =>
                      handleChange("customer_phone", e.target.value)
                    }
                  />
                </div>

                {/* 担当スタッフの選択 */}
                <div className="space-y-2">
                  <Label htmlFor="staff_id">担当スタッフ</Label>
                  <Select
                    value={editingFormData.staff_id || ""}
                    onValueChange={(value) => handleChange("staff_id", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="スタッフを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* メニューの選択（必須ではないため required を削除） */}
                <div className="space-y-2">
                  <Label htmlFor="menu_id">メニュー</Label>
                  <Select
                    value={
                      editingFormData.menu_id
                        ? editingFormData.menu_id.toString()
                        : ""
                    }
                    onValueChange={(value) => handleChange("menu_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="メニューを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuList.map((menu) => (
                        <SelectItem key={menu.id} value={menu.id.toString()}>
                          {menu.name} ({menu.duration}分)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Box>

            <Box sx={{ flex: 1 }}>
              <div className="space-y-4">
                {/* 予約日 */}
                <div className="space-y-2">
                  <Label htmlFor="reservation_date">予約日</Label>
                  <Input
                    id="reservation_date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    required
                  />
                </div>

                {/* 予約時間（必須ではないため選択しなくても良い） */}
                {selectedDate &&
                  editingFormData.staff_id &&
                  editingFormData.menu_id && (
                    <div className="space-y-2">
                      <Label>予約時間</Label>
                      <Paper
                        style={{
                          maxHeight: 200,
                          overflow: "auto",
                          padding: "10px",
                        }}
                      >
                        <Grid container spacing={1}>
                          {availableTimeSlots.length > 0 ? (
                            availableTimeSlots.map((time) => (
                              <Grid item xs={4} key={time}>
                                <Button
                                  type="button"
                                  onClick={() => handleTimeChange(time)}
                                  variant={
                                    selectedTime === time
                                      ? "default"
                                      : "outline"
                                  }
                                >
                                  {time}
                                </Button>
                              </Grid>
                            ))
                          ) : (
                            <Grid item xs={12}>
                              <Typography variant="body2" color="textSecondary">
                                利用可能な時間枠がありません。
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </Paper>
                    </div>
                  )}

                {/* 選択した時間帯の表示 */}
                {selectedTime && (
                  <Typography variant="body2">
                    予約時間: {selectedTime} ~{" "}
                    {moment
                      .tz(`${selectedDate}T${selectedTime}`, "Asia/Tokyo")
                      .add(
                        menuList.find(
                          (menu) => menu.id === editingFormData.menu_id
                        )?.duration || 0,
                        "minutes"
                      )
                      .format("HH:mm")}
                  </Typography>
                )}

                {isOverlap && <Alert severity="error">{overlapMessage}</Alert>}
              </div>
            </Box>
          </Box>

          {/* サブミットボタンと削除ボタン */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
            <Button
              type="submit"
              disabled={
                isOverlap ||
                !editingFormData.customer_last_name_kana ||
                !editingFormData.customer_first_name_kana ||
                !editingFormData.staff_id ||
                !selectedDate
              }
            >
              予約を更新
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              予約を削除
            </Button>
          </Box>
        </form>
      </DialogContent>

      {/* スナックバーによる通知 */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar(null)}
          severity={snackbar?.severity}
          sx={{
            width: "100%",
            borderRadius: "8px",
            boxShadow: 3,
          }}
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default ReservationEditForm;
