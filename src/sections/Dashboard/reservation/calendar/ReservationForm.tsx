// src/sections/Dashboard/reservation/calendar/ReservationForm.tsx

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
  BusinessHour,
  Reservation,
  Staff,
  MenuItem as MenuItemType,
} from "@/types/reservation";
import moment from "moment";
import { Alert, Snackbar } from "@mui/material";
import { Listbox } from "@headlessui/react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/20/solid";

interface FormDataType {
  customer_first_name?: string;
  customer_last_name?: string;
  customer_first_name_kana?: string;
  customer_last_name_kana?: string;
  customer_email?: string;
  customer_phone?: string;
  menu_id?: number; // 型を number に変更
  staff_id?: string;
  start_time?: string;
  end_time?: string;
  event?: string;
  id?: string;
}

interface ReservationFormProps {
  reservation: Partial<Reservation> | null;
  isNew: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Reservation>, isNew: boolean) => void;
  onDelete: (id: string) => void;
  staffList: Staff[];
  menuList: MenuItemType[];
  reservations: Reservation[];
  hideReservationType?: boolean;
  isCreatingFromButton?: boolean;
  businessHours: BusinessHour[];
}

const ReservationForm: React.FC<ReservationFormProps> = ({
  reservation,
  isNew,
  onClose,
  onSubmit,
  onDelete,
  staffList,
  menuList,
  reservations,
  businessHours,
  hideReservationType = false,
  isCreatingFromButton = false,
}) => {
  const [formType, setFormType] = useState<"reservation" | "staffSchedule">(
    "reservation"
  );
  const [formData, setFormData] = useState<FormDataType>({});
  const [computedEndTime, setComputedEndTime] = useState<string>("");
  const [isOverlap, setIsOverlap] = useState<boolean>(false);
  const [overlapMessage, setOverlapMessage] = useState<string>("");
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedMenuPrice, setSelectedMenuPrice] = useState<number>(0);

  // 選択されたメニューを保持するステート
  const [selectedMenu, setSelectedMenu] = useState<MenuItemType | null>(null);

  useEffect(() => {
    if (reservation && !isCreatingFromButton) {
      // フルネームを姓と名に分割
      const nameParts = (reservation.customer_name || "").split(" ");
      const lastName = nameParts[0] || "";
      const firstName = nameParts[1] || "";

      const nameKanaParts = (reservation.customer_name_kana || "").split(" ");
      const lastNameKana = nameKanaParts[0] || "";
      const firstNameKana = nameKanaParts[1] || "";

      setFormData({
        ...reservation,
        customer_last_name: lastName,
        customer_first_name: firstName,
        customer_last_name_kana: lastNameKana,
        customer_first_name_kana: firstNameKana,
        menu_id: reservation.menu_id,
        staff_id: reservation.staff_id,
      });

      if (reservation.start_time) {
        const startMoment = moment.utc(reservation.start_time).local();
        setSelectedDate(startMoment.toDate());
        setSelectedTimeSlot(startMoment.format("HH:mm"));
        if (reservation.menu_id) {
          const selectedMenu = menuList.find(
            (menu) => menu.id === reservation.menu_id
          );
          if (selectedMenu) {
            const endMoment = startMoment
              .clone()
              .add(selectedMenu.duration, "minutes");
            setComputedEndTime(endMoment.format("YYYY-MM-DDTHH:mm"));
            setSelectedMenu(selectedMenu);
          }
        }
      }

      setIsOverlap(false);
      setOverlapMessage("");
    } else {
      // 新規予約の場合の初期化
      setFormData({});
      setSelectedDate(new Date());
      setSelectedTimeSlot(null);
      setComputedEndTime("");
      setIsOverlap(false);
      setOverlapMessage("");
      setSelectedMenu(null);
    }
  }, [reservation, isCreatingFromButton, menuList]);

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: name === "menu_id" ? (value ? Number(value) : undefined) : value,
    }));
  };

  useEffect(() => {
    if (formData.menu_id) {
      const menu =
        menuList.find((menu) => menu.id === formData.menu_id) || null;
      setSelectedMenu(menu);
      if (menu) {
        setSelectedMenuPrice(menu.price);
      } else {
        setSelectedMenuPrice(0);
      }
    } else {
      setSelectedMenu(null);
      setSelectedMenuPrice(0);
    }
  }, [formData.menu_id, menuList]);

  useEffect(() => {
    if (
      selectedDate &&
      formData.staff_id &&
      formData.menu_id &&
      formType === "reservation"
    ) {
      const selectedMenu = menuList.find(
        (menu) => menu.id === formData.menu_id
      );
      if (selectedMenu) {
        const menuDuration = selectedMenu.duration;
        const staffId = formData.staff_id;
        const dateStr = moment(selectedDate).format("YYYY-MM-DD");

        let businessHourForDate = businessHours.find(
          (bh) => bh.date === dateStr
        );
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
          setAvailableTimes([]);
          return;
        }

        const openingTime = moment(
          `${dateStr} ${businessHourForDate.open_time}`,
          "YYYY-MM-DD HH:mm:ss"
        );
        const closingTime = moment(
          `${dateStr} ${businessHourForDate.close_time}`,
          "YYYY-MM-DD HH:mm:ss"
        );

        const timeSlots = [];
        let currentTime = openingTime.clone();
        while (currentTime.isBefore(closingTime)) {
          timeSlots.push(currentTime.format("HH:mm"));
          currentTime.add(30, "minutes");
        }

        const available: string[] = [];

        timeSlots.forEach((time) => {
          const start = moment(`${dateStr} ${time}`, "YYYY-MM-DD HH:mm");
          const end = start.clone().add(menuDuration, "minutes");

          if (end.isAfter(closingTime)) return;

          const overlapping = reservations.some((res) => {
            if (res.staff_id !== staffId) return false;
            if (res.status === "cancelled" || res.status === "completed")
              return false;

            const resStart = moment.utc(res.start_time).local();
            const resEnd = moment.utc(res.end_time).local();

            return start.isBefore(resEnd) && end.isAfter(resStart);
          });

          if (!overlapping) {
            available.push(time);
          }
        });

        setAvailableTimes(available);
      }
    } else {
      setAvailableTimes([]);
    }
  }, [
    selectedDate,
    formData.staff_id,
    formData.menu_id,
    reservations,
    menuList,
    businessHours,
    formType,
  ]);

  useEffect(() => {
    if (
      selectedTimeSlot &&
      selectedDate &&
      formData.menu_id &&
      formType === "reservation"
    ) {
      const selectedMenu = menuList.find(
        (menu) => menu.id === formData.menu_id
      );
      if (selectedMenu) {
        const start = moment(
          `${moment(selectedDate).format("YYYY-MM-DD")}T${selectedTimeSlot}`
        );
        const end = start.clone().add(selectedMenu.duration, "minutes");

        setFormData((prev) => ({
          ...prev,
          start_time: start.format("YYYY-MM-DDTHH:mm"),
          end_time: end.format("YYYY-MM-DDTHH:mm"),
        }));

        setComputedEndTime(end.format("YYYY-MM-DDTHH:mm"));
      }
    }
  }, [selectedTimeSlot, selectedDate, formData.menu_id, menuList, formType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formType === "reservation" && isOverlap) {
      setSnackbar({ message: overlapMessage, severity: "error" });
      return;
    }

    // 姓名を結合
    const customer_name = `${formData.customer_last_name || ""} ${
      formData.customer_first_name || ""
    }`.trim();
    const customer_name_kana = `${formData.customer_last_name_kana || ""} ${
      formData.customer_first_name_kana || ""
    }`.trim();

    let updatedReservation: Partial<Reservation> = {
      ...formData,
      customer_name,
      customer_name_kana,
      start_time: formData.start_time
        ? moment(formData.start_time).utc().format()
        : undefined,
      end_time:
        formType === "reservation"
          ? computedEndTime
            ? moment(computedEndTime).utc().format()
            : undefined
          : formData.end_time
          ? moment(formData.end_time).utc().format()
          : undefined,
      total_price: formType === "reservation" ? selectedMenuPrice : 0,
      is_staff_schedule: formType === "staffSchedule",
    };

    // デバッグ用ログ
    console.log("Updated Reservation:", updatedReservation);

    onSubmit(updatedReservation, isNew);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm("この予約をキャンセルしますか？")) {
      if (formData.id) {
        onDelete(formData.id);
        onClose();
      }
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>{isNew ? "新規予約" : "予約の編集"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {!hideReservationType && (
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="form-type">予約タイプ</Label>
                  <select
                    id="form-type"
                    value={formType}
                    onChange={(e) =>
                      setFormType(
                        e.target.value as "reservation" | "staffSchedule"
                      )
                    }
                    className="w-full border rounded-md p-2"
                  >
                    <option value="reservation">通常の予約</option>
                    <option value="staffSchedule">スタッフスケジュール</option>
                  </select>
                </div>
              )}
              {formType === "reservation" ? (
                // 予約フォーム
                <>
                  {/* 顧客名（姓） */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_last_name">顧客名（姓）</Label>
                    <Input
                      id="customer_last_name"
                      value={formData.customer_last_name || ""}
                      onChange={(e) =>
                        handleChange("customer_last_name", e.target.value)
                      }
                      required
                    />
                  </div>

                  {/* 顧客名（名） */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_first_name">顧客名（名）</Label>
                    <Input
                      id="customer_first_name"
                      value={formData.customer_first_name || ""}
                      onChange={(e) =>
                        handleChange("customer_first_name", e.target.value)
                      }
                      required
                    />
                  </div>

                  {/* 顧客名（カナ・姓） */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_last_name_kana">
                      顧客名（カナ・姓）
                    </Label>
                    <Input
                      id="customer_last_name_kana"
                      value={formData.customer_last_name_kana || ""}
                      onChange={(e) =>
                        handleChange("customer_last_name_kana", e.target.value)
                      }
                      required
                    />
                  </div>

                  {/* 顧客名（カナ・名） */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_first_name_kana">
                      顧客名（カナ・名）
                    </Label>
                    <Input
                      id="customer_first_name_kana"
                      value={formData.customer_first_name_kana || ""}
                      onChange={(e) =>
                        handleChange("customer_first_name_kana", e.target.value)
                      }
                      required
                    />
                  </div>

                  {/* メールアドレス */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_email">メールアドレス</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email || ""}
                      onChange={(e) =>
                        handleChange("customer_email", e.target.value)
                      }
                      required
                    />
                  </div>

                  {/* 電話番号 */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">電話番号</Label>
                    <Input
                      id="customer_phone"
                      type="tel"
                      value={formData.customer_phone || ""}
                      onChange={(e) =>
                        handleChange("customer_phone", e.target.value)
                      }
                    />
                  </div>

                  {/* 担当スタッフ */}
                  <div className="space-y-2">
                    <Label htmlFor="staff_id">担当スタッフ</Label>
                    <select
                      id="staff_id"
                      value={formData.staff_id || ""}
                      onChange={(e) => handleChange("staff_id", e.target.value)}
                      required
                      className="w-full border rounded-md p-2"
                    >
                      <option value="">スタッフを選択</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* メニューの選択 */}
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="menu_id">メニュー</Label>
                    <Listbox
                      value={selectedMenu}
                      onChange={(menu) => {
                        handleChange("menu_id", menu?.id?.toString() || "");
                        setSelectedMenu(menu);
                      }}
                    >
                      <div className="relative">
                        <Listbox.Button className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left focus:outline-none">
                          <span className="block truncate">
                            {selectedMenu
                              ? `${selectedMenu.name} (${selectedMenu.duration}分)`
                              : "メニューを選択"}
                          </span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronUpDownIcon
                              className="h-5 w-5 text-gray-400"
                              aria-hidden="true"
                            />
                          </span>
                        </Listbox.Button>
                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg">
                          {menuList.map((menu) => (
                            <Listbox.Option
                              key={menu.id}
                              value={menu}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                  active
                                    ? "bg-blue-100 text-blue-900"
                                    : "text-gray-900"
                                }`
                              }
                            >
                              {({ selected }) => (
                                <>
                                  <span
                                    className={`block truncate ${
                                      selected ? "font-medium" : "font-normal"
                                    }`}
                                  >
                                    {menu.name} ({menu.duration}分)
                                  </span>
                                  {selected ? (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                      <CheckIcon
                                        className="h-5 w-5"
                                        aria-hidden="true"
                                      />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </div>
                    </Listbox>
                  </div>

                  {/* メニューの価格表示 */}
                  {selectedMenuPrice > 0 && (
                    <div className="space-y-2">
                      <Label>メニューの価格</Label>
                      <p>{selectedMenuPrice.toLocaleString()}円</p>
                    </div>
                  )}

                  {/* 予約日 */}
                  <div className="space-y-2">
                    <Label>予約日</Label>
                    <Input
                      type="date"
                      value={
                        selectedDate
                          ? moment(selectedDate).format("YYYY-MM-DD")
                          : ""
                      }
                      onChange={(e) =>
                        setSelectedDate(moment(e.target.value).toDate())
                      }
                      required
                    />
                  </div>

                  {/* 予約可能な時間帯 */}
                  {availableTimes.length > 0 ? (
                    <div className="space-y-2 col-span-2">
                      <Label>予約可能な時間帯</Label>
                      <div className="grid grid-cols-6 gap-2 max-h-24 overflow-y-auto">
  {availableTimes.map((time) => (
    <Button
      type="button"
      key={time}
      variant={
        selectedTimeSlot === time ? "default" : "outline"
      }
      onClick={() => setSelectedTimeSlot(time)}
    >
      {time}
    </Button>
  ))}
</div>

                    </div>
                  ) : selectedDate && formData.staff_id && formData.menu_id ? (
                    <p>この日に予約可能な時間帯はありません。</p>
                  ) : null}

                  {/* 選択した時間帯の表示 */}
                  {selectedTimeSlot && (
                    <div className="space-y-2">
                      <Label>選択した時間帯</Label>
                      <p>
                        {selectedTimeSlot} ~{" "}
                        {moment(
                          `${
                            selectedDate?.toISOString().split("T")[0]
                          }T${selectedTimeSlot}`,
                          "YYYY-MM-DDTHH:mm"
                        )
                          .add(
                            menuList.find(
                              (menu) => menu.id === formData.menu_id
                            )?.duration || 0,
                            "minutes"
                          )
                          .format("HH:mm")}
                      </p>
                    </div>
                  )}

                  {isOverlap && (
                    <Alert severity="error">{overlapMessage}</Alert>
                  )}
                </>
              ) : (
                // スタッフスケジュールフォーム
                <>
                  {/* 担当スタッフ */}
                  <div className="space-y-2">
                    <Label htmlFor="staff_id">担当スタッフ</Label>
                    <select
                      id="staff_id"
                      value={formData.staff_id || ""}
                      onChange={(e) => handleChange("staff_id", e.target.value)}
                      required
                      className="w-full border rounded-md p-2"
                    >
                      <option value="">スタッフを選択</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* イベントの選択 */}
                  <div className="space-y-2">
                    <Label htmlFor="event">イベント</Label>
                    <select
                      id="event"
                      value={formData.event || ""}
                      onChange={(e) => handleChange("event", e.target.value)}
                      required
                      className="w-full border rounded-md p-2"
                    >
                      <option value="">イベントを選択</option>
                      <option value="休憩">休憩</option>
                      <option value="会議">会議</option>
                      <option value="その他">その他</option>
                    </select>
                  </div>

                  {/* 開始時間 */}
                  <div className="space-y-2">
                    <Label htmlFor="start_time">開始時間</Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={formData.start_time || ""}
                      onChange={(e) =>
                        handleChange("start_time", e.target.value)
                      }
                      required
                    />
                  </div>

                  {/* 終了時間 */}
                  <div className="space-y-2">
                    <Label htmlFor="end_time">終了時間</Label>
                    <Input
                      id="end_time"
                      type="datetime-local"
                      value={formData.end_time || ""}
                      onChange={(e) => handleChange("end_time", e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-between mt-6">
              <Button
                type="submit"
                disabled={
                  formType === "reservation" && (isOverlap || !selectedTimeSlot)
                }
              >
                {isNew
                  ? formType === "reservation"
                    ? "予約を作成"
                    : "スタッフスケジュールを作成"
                  : formType === "reservation"
                  ? "予約を更新"
                  : "スタッフスケジュールを更新"}
              </Button>
              {!isNew && formData.id && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  予約を削除
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
    </>
  );
};

export default ReservationForm;
