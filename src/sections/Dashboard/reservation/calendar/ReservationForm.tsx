// ReservationForm.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import {
  ChevronUpDownIcon,
  CheckIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/20/solid";
import debounce from "lodash/debounce";
import { useAuth } from "@/contexts/authcontext";

// 型定義
interface Customer {
  id: string;
  name: string;
  name_kana: string;
  email: string;
  phone: string;
}

interface FormDataType {
  customer_first_name: string;
  customer_last_name: string;
  customer_first_name_kana: string;
  customer_last_name_kana: string;
  customer_email: string;
  customer_phone: string;
  menu_id?: number;
  staff_id: string;
  start_time: string;
  end_time: string;
  event: string;
  id: string;
  customer_id: string;
}

interface ReservationFormProps {
  reservation: Partial<Reservation> | null;
  isNew: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Reservation>, isNew: boolean) => void;
  onDelete: (id: string, cancellationType: string) => void;
  staffList: Staff[];
  menuList: MenuItemType[];
  reservations: Reservation[];
  isCreatingFromButton?: boolean;
  businessHours: BusinessHour[];
}

// カタカナのみを許可するバリデーション関数
const isKatakana = (str: string): boolean => {
  const regex = /^[\u30A0-\u30FF]+$/;
  return regex.test(str);
};

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
  isCreatingFromButton = false,
}) => {
  const { session } = useAuth(); // useAuthからsessionを取得

  // ★ 必須フィールドを全て含む初期値を設定
  const initialFormData: FormDataType = {
    customer_first_name: "",
    customer_last_name: "",
    customer_first_name_kana: "",
    customer_last_name_kana: "",
    customer_email: "",
    customer_phone: "",
    menu_id: undefined,
    staff_id: "",
    start_time: "",
    end_time: "",
    event: "",
    id: "",
    customer_id: "",
  };

  const [formData, setFormData] = useState<FormDataType>(initialFormData);
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
  const [selectedMenu, setSelectedMenu] = useState<MenuItemType | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCustomerSelected, setIsCustomerSelected] = useState(false); // 顧客が選択されているかどうか

  // バリデーションエラーの状態
  const [validationErrors, setValidationErrors] = useState<{
    customer_last_name_kana?: string;
    customer_first_name_kana?: string;
  }>({});

  const searchRef = useRef<HTMLDivElement>(null);

  // 顧客検索の処理
  const searchCustomers = debounce(async (query: string) => {
    if (!query.trim() || !session?.access_token) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/search-customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "顧客検索に失敗しました");
      }

      const customers = await response.json();

      if (Array.isArray(customers)) {
        setSearchResults(customers);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      setSnackbar({
        message:
          error instanceof Error ? error.message : "顧客検索に失敗しました",
        severity: "error",
      });
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  // クリーンアップ
  useEffect(() => {
    return () => {
      searchCustomers.cancel();
    };
  }, []);

  // 顧客選択ハンドラ
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsSearchOpen(false);
    setSearchValue(customer.name);
    setIsCustomerSelected(true); // 顧客が選択されたので true にする

    const nameParts = customer.name.split(" ");
    const nameKanaParts = customer.name_kana.split(" ");

    setFormData((prevFormData) => {
      const updatedFormData = {
        ...prevFormData,
        customer_id: customer.id,
        customer_last_name: nameParts[0] || "",
        customer_first_name: nameParts[1] || "",
        customer_last_name_kana: nameKanaParts[0] || "",
        customer_first_name_kana: nameKanaParts[1] || "",
        customer_email: customer.email,
        customer_phone: customer.phone,
      };
      return updatedFormData;
    });
  };

  // フォームをクリアする関数
  const handleClearForm = () => {
    setFormData(initialFormData); // ★ 初期値にリセット
    setSelectedCustomer(null);
    setIsCustomerSelected(false);
    setSearchValue("");
    setSelectedTimeSlot(null); // 選択された時間帯もクリア
    setAvailableTimes([]);
    setValidationErrors({}); // バリデーションエラーをクリア
  };

  // フォームデータの初期化
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
        ...initialFormData, // ★ 初期値をベースに設定
        ...reservation,
        customer_last_name: lastName,
        customer_first_name: firstName,
        customer_last_name_kana: lastNameKana,
        customer_first_name_kana: firstNameKana,
        menu_id: reservation.menu_id,
        staff_id: reservation.staff_id || "",
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
      setFormData(initialFormData); // ★ 初期値を設定
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

    // 担当スタッフが変更された場合、selectedTimeSlotをリセット
    if (name === "staff_id") {
      setSelectedTimeSlot(null);
    }

    // カナのフィールドをリアルタイムにバリデーション
    if (
      name === "customer_last_name_kana" ||
      name === "customer_first_name_kana"
    ) {
      if (!isKatakana(value)) {
        setValidationErrors((prevErrors) => ({
          ...prevErrors,
          [name]:
            name === "customer_last_name_kana"
              ? "顧客名（カナ・姓）はカタカナのみで入力してください"
              : "顧客名（カナ・名）はカタカナのみで入力してください",
        }));
      } else {
        setValidationErrors((prevErrors) => ({
          ...prevErrors,
          [name]: undefined,
        }));
      }
    }
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
    if (selectedDate && formData.staff_id && formData.menu_id) {
      const selectedMenu = menuList.find(
        (menu) => menu.id === formData.menu_id
      );
      if (selectedMenu) {
        const menuDuration = selectedMenu.duration;
        const staffId = formData.staff_id;
        const dateStr = moment(selectedDate).format("YYYY-MM-DD");

        // 営業時間の取得
        let businessHourForDate = businessHours.find(
          (bh) => bh.date === dateStr
        );
        if (!businessHourForDate) {
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

        // 営業時間の設定
        const openingTime = moment(
          `${dateStr} ${businessHourForDate.open_time}`,
          "YYYY-MM-DD HH:mm:ss"
        );
        const closingTime = moment(
          `${dateStr} ${businessHourForDate.close_time}`,
          "YYYY-MM-DD HH:mm:ss"
        );

        // 30分単位のタイムスロット生成
        const timeSlots = [];
        let currentTime = openingTime.clone();
        while (currentTime.isBefore(closingTime)) {
          timeSlots.push(currentTime.format("HH:mm"));
          currentTime.add(30, "minutes");
        }

        // 予約可能な時間帯を特定
        const available = timeSlots.filter((time) => {
          const start = moment(`${dateStr} ${time}`, "YYYY-MM-DD HH:mm");
          const end = start.clone().add(menuDuration, "minutes");

          // 営業時間外の場合は除外
          if (end.isAfter(closingTime)) return false;

          // 既存予約との重複チェック
          return !reservations.some((res) => {
            // 異なるスタッフの予約は無視
            if (res.staff_id !== staffId) return false;

            // キャンセル済み予約は無視
            if (
              res.status &&
              [
                "cancelled",
                "salon_cancelled",
                "same_day_cancelled",
                "no_show",
              ].includes(res.status)
            ) {
              return false;
            }

            const resStart = moment.utc(res.start_time).local();
            const resEnd = moment.utc(res.end_time).local();

            // 同じ日付の予約のみチェック
            if (resStart.format("YYYY-MM-DD") !== dateStr) return false;

            // 時間の重複チェック
            return (
              (start.isSameOrAfter(resStart) && start.isBefore(resEnd)) ||
              (end.isAfter(resStart) && end.isSameOrBefore(resEnd)) ||
              (start.isBefore(resStart) && end.isAfter(resEnd))
            );
          });
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
  ]);

  useEffect(() => {
    if (selectedTimeSlot && selectedDate && formData.menu_id) {
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
  }, [selectedTimeSlot, selectedDate, formData.menu_id, menuList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーションエラーを初期化
    const errors: { [key: string]: string } = {};

    // カナ姓名のバリデーションを追加
    if (
      !formData.customer_last_name_kana &&
      !formData.customer_first_name_kana
    ) {
      errors.customer_last_name_kana =
        "顧客名（カナ）の姓または名を入力してください";
    }

    // カナのフィールドがカタカナのみかチェック
    if (
      formData.customer_last_name_kana &&
      !isKatakana(formData.customer_last_name_kana)
    ) {
      errors.customer_last_name_kana =
        "顧客名（カナ・姓）はカタカナのみで入力してください";
    }

    if (
      formData.customer_first_name_kana &&
      !isKatakana(formData.customer_first_name_kana)
    ) {
      errors.customer_first_name_kana =
        "顧客名（カナ・名）はカタカナのみで入力してください";
    }

    // エラーがある場合はバリデーションエラーを設定して処理を中断
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    } else {
      // エラーがなければバリデーションエラーをクリア
      setValidationErrors({});
    }

    // 既存の重複チェック
    if (isOverlap || !selectedTimeSlot) {
      setSnackbar({
        message: overlapMessage || "予約情報に問題があります",
        severity: "error",
      });
      return;
    }

    // 姓名を結合
    const customer_name = `${formData.customer_last_name || ""} ${
      formData.customer_first_name || ""
    }`.trim();

    let customer_name_kana = "";
    if (formData.customer_last_name_kana && formData.customer_first_name_kana) {
      customer_name_kana = `${formData.customer_last_name_kana} ${formData.customer_first_name_kana}`;
    } else if (formData.customer_last_name_kana) {
      customer_name_kana = formData.customer_last_name_kana;
    } else if (formData.customer_first_name_kana) {
      customer_name_kana = formData.customer_first_name_kana;
    }

    let updatedReservation: Partial<Reservation> = {
      ...formData,
      customer_name,
      customer_name_kana,
      start_time: formData.start_time
        ? moment(formData.start_time).utc().format()
        : undefined,
      end_time: formData.end_time
        ? moment(formData.end_time).utc().format()
        : undefined,
      total_price: selectedMenuPrice,
      is_staff_schedule: false, // スタッフスケジュールではないため false に設定
    };

    onSubmit(updatedReservation, isNew);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm("この予約をキャンセルしますか？")) {
      if (formData.id && formData.start_time) {
        try {
          const now = moment();
          const startTime = moment(formData.start_time);

          // 予約時間が過ぎているかどうかでキャンセル種別を決定
          const cancellationType = now.isAfter(startTime)
            ? "no_show"
            : "salon_cancelled";

          onDelete(formData.id, cancellationType);
          onClose();
        } catch (error) {
          setSnackbar({
            message: "予約のキャンセルに失敗しました",
            severity: "error",
          });
        }
      }
    }
  };

  // 外部クリックで検索結果を閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px]">
          {" "}
          {/* ダイアログの幅を適切に設定 */}
          <DialogHeader>
            <DialogTitle className="text-lg">
              {isNew ? "新規予約" : "予約の編集"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {" "}
              {/* グリッドを2列に設定 */}
              {/* 顧客検索UI */}
              <div className="space-y-1 col-span-2" ref={searchRef}>
                <Label className="text-sm">顧客検索</Label>
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="顧客名を入力..."
                      value={searchValue}
                      onChange={(e) => {
                        setSearchValue(e.target.value);
                        searchCustomers(e.target.value);
                        setIsSearchOpen(true);
                      }}
                      className={`w-full border rounded-md p-1 pl-8 text-sm ${
                        selectedCustomer
                          ? "border-green-500"
                          : "border-gray-300"
                      }`}
                    />
                    <MagnifyingGlassIcon className="absolute left-2 top-1.5 h-4 w-4 text-gray-400" />
                    {selectedCustomer && (
                      <CheckCircleIcon className="absolute right-2 top-1.5 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {isSearchOpen && searchResults.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border rounded-md max-h-48 overflow-auto mt-1 text-sm">
                      {searchResults.map((customer) => (
                        <li
                          key={customer.id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="p-1 hover:bg-gray-100 cursor-pointer"
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-xs text-gray-500">
                            {customer.name_kana}
                          </div>
                          <div className="text-xs text-gray-500">
                            {customer.email}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {/* フォームをクリアするボタン */}
              {isCustomerSelected && (
                <div className="col-span-2 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={handleClearForm}
                    className="text-xs px-2 py-1"
                  >
                    フォームをクリア
                  </Button>
                </div>
              )}
              {/* 顧客情報フォームフィールド */}
              <div className="space-y-1">
                <Label htmlFor="customer_last_name" className="text-sm">
                  顧客名（姓）
                </Label>
                <input
                  id="customer_last_name"
                  className="w-full border rounded-md p-1 text-sm"
                  value={formData.customer_last_name || ""}
                  onChange={(e) =>
                    handleChange("customer_last_name", e.target.value)
                  }
                  disabled={isCustomerSelected} // 編集不可
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="customer_first_name" className="text-sm">
                  顧客名（名）
                </Label>
                <input
                  id="customer_first_name"
                  className="w-full border rounded-md p-1 text-sm"
                  value={formData.customer_first_name || ""}
                  onChange={(e) =>
                    handleChange("customer_first_name", e.target.value)
                  }
                  disabled={isCustomerSelected} // 編集不可
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="customer_last_name_kana" className="text-sm">
                  顧客名（カナ・姓）* {/* アスタリスクを追加 */}
                </Label>
                <input
                  id="customer_last_name_kana"
                  className={`w-full border rounded-md p-1 text-sm ${
                    validationErrors.customer_last_name_kana
                      ? "border-red-500"
                      : ""
                  }`}
                  value={formData.customer_last_name_kana || ""}
                  onChange={(e) => {
                    handleChange("customer_last_name_kana", e.target.value);
                    // エラーをリアルタイムにクリア
                    if (validationErrors.customer_last_name_kana) {
                      setValidationErrors((prevErrors) => ({
                        ...prevErrors,
                        customer_last_name_kana: undefined,
                      }));
                    }
                  }}
                  disabled={isCustomerSelected} // 編集不可
                />
                {validationErrors.customer_last_name_kana && (
                  <p className="text-xs text-red-500">
                    {validationErrors.customer_last_name_kana}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="customer_first_name_kana" className="text-sm">
                  顧客名（カナ・名）* {/* アスタリスクを追加 */}
                </Label>
                <input
                  id="customer_first_name_kana"
                  className={`w-full border rounded-md p-1 text-sm ${
                    validationErrors.customer_first_name_kana
                      ? "border-red-500"
                      : ""
                  }`}
                  value={formData.customer_first_name_kana || ""}
                  onChange={(e) => {
                    handleChange("customer_first_name_kana", e.target.value);
                    // エラーをリアルタイムにクリア
                    if (validationErrors.customer_first_name_kana) {
                      setValidationErrors((prevErrors) => ({
                        ...prevErrors,
                        customer_first_name_kana: undefined,
                      }));
                    }
                  }}
                  disabled={isCustomerSelected} // 編集不可
                />
                {validationErrors.customer_first_name_kana && (
                  <p className="text-xs text-red-500">
                    {validationErrors.customer_first_name_kana}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="customer_email" className="text-sm">
                  メールアドレス
                </Label>
                <input
                  id="customer_email"
                  type="email"
                  className="w-full border rounded-md p-1 text-sm"
                  value={formData.customer_email || ""}
                  onChange={(e) =>
                    handleChange("customer_email", e.target.value)
                  }
                  disabled={isCustomerSelected} // 編集不可
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="customer_phone" className="text-sm">
                  電話番号
                </Label>
                <input
                  id="customer_phone"
                  type="tel"
                  className="w-full border rounded-md p-1 text-sm"
                  value={formData.customer_phone || ""}
                  onChange={(e) =>
                    handleChange("customer_phone", e.target.value)
                  }
                  disabled={isCustomerSelected} // 編集不可
                />
              </div>
              {/* 担当スタッフ */}
              <div className="space-y-1">
                <Label htmlFor="staff_id" className="text-sm">
                  担当スタッフ
                </Label>
                <select
                  id="staff_id"
                  value={formData.staff_id || ""}
                  onChange={(e) => handleChange("staff_id", e.target.value)}
                  required
                  className="w-full border rounded-md p-1 text-sm"
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
              <div className="space-y-1">
                <Label htmlFor="menu_id" className="text-sm">
                  メニュー
                </Label>
                <Listbox
                  value={selectedMenu}
                  onChange={(menu) => {
                    handleChange("menu_id", menu?.id?.toString() || "");
                    setSelectedMenu(menu);
                  }}
                >
                  <div className="relative">
                    <Listbox.Button className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-1 pl-2 pr-8 text-left text-sm focus:outline-none">
                      <span className="block truncate">
                        {selectedMenu
                          ? `${selectedMenu.name} (${selectedMenu.duration}分)`
                          : "メニューを選択"}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronUpDownIcon
                          className="h-4 w-4 text-gray-400"
                          aria-hidden="true"
                        />
                      </span>
                    </Listbox.Button>
                    <Listbox.Options className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg text-sm">
                      {menuList.map((menu) => (
                        <Listbox.Option
                          key={menu.id}
                          value={menu}
                          className={({ active }) =>
                            `relative cursor-default select-none py-1 pl-8 pr-2 ${
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
                                <span className="absolute inset-y-0 left-0 flex items-center pl-1 text-blue-600">
                                  <CheckIcon
                                    className="h-3 w-3"
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
                <div className="space-y-1">
                  <Label className="text-sm">メニューの価格</Label>
                  <p className="text-sm">
                    {selectedMenuPrice.toLocaleString()}円
                  </p>
                </div>
              )}
              {/* 予約日 */}
              <div className="space-y-1">
                <Label className="text-sm">予約日</Label>
                <input
                  type="date"
                  className="w-full border rounded-md p-1 text-sm"
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
              <div className="space-y-1">
                <Label className="text-sm">予約可能な時間帯</Label>
                {availableTimes.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {availableTimes.map((time) => (
                      <Button
                        type="button"
                        key={time}
                        variant={
                          selectedTimeSlot === time ? "default" : "outline"
                        }
                        onClick={() => setSelectedTimeSlot(time)}
                        className="text-xs px-2 py-0.5"
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                ) : selectedDate && formData.staff_id && formData.menu_id ? (
                  <p className="text-sm">
                    この日に予約可能な時間帯はありません。
                  </p>
                ) : null}
              </div>
              {/* 選択した時間帯の表示 */}
              {selectedTimeSlot && (
                <div className="space-y-1">
                  <Label className="text-sm">選択した時間帯</Label>
                  <p className="text-sm">
                    {selectedTimeSlot} ~{" "}
                    {moment(
                      `${
                        selectedDate?.toISOString().split("T")[0]
                      }T${selectedTimeSlot}`,
                      "YYYY-MM-DDTHH:mm"
                    )
                      .add(
                        menuList.find((menu) => menu.id === formData.menu_id)
                          ?.duration || 0,
                        "minutes"
                      )
                      .format("HH:mm")}
                  </p>
                </div>
              )}
              {isOverlap && (
                <Alert severity="error" className="text-xs">
                  {overlapMessage}
                </Alert>
              )}
            </div>
            <div className="flex justify-between mt-4">
              <Button
                type="submit"
                disabled={
                  isOverlap ||
                  !selectedTimeSlot ||
                  (!formData.customer_last_name_kana &&
                    !formData.customer_first_name_kana)
                }
                className="text-sm px-3 py-1"
              >
                {isNew ? "予約を作成" : "予約を更新"}
              </Button>
              {!isNew && formData.id && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="text-sm px-3 py-1"
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
          className="text-sm"
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ReservationForm;
