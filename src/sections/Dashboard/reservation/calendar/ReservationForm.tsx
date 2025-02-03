"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, Snackbar } from "@mui/material";
import { Listbox } from "@headlessui/react";
import {
  ChevronUpDownIcon,
  CheckIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/20/solid";
import debounce from "lodash/debounce";
import moment from "moment-timezone";

import { useAuth } from "@/lib/authContext";
import useReservationCalendar from "@/sections/Dashboard/reservation/calendar/useReservationCalendar";
import {
  BusinessHour,
  Reservation,
  Staff,
  MenuItem as MenuItemType,
  Category,
} from "@/types/reservation";

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
  coupon_id?: string;
  staff_id: string;
  memo: string;
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
  categories: Category[]; // カテゴリ一覧
}

// カナのバリデーション
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
  isCreatingFromButton = false,
  businessHours,
  categories,
}) => {
  const { session } = useAuth();
  const { couponList } = useReservationCalendar();

  // 初期値（useMemoでメモ化）
  const initialFormData = useMemo<FormDataType>(
    () => ({
      customer_first_name: "",
      customer_last_name: "",
      customer_first_name_kana: "",
      customer_last_name_kana: "",
      customer_email: "",
      customer_phone: "",
      menu_id: undefined,
      coupon_id: undefined,
      staff_id: "",
      start_time: "",
      end_time: "",
      event: "",
      id: "",
      customer_id: "",
      memo: "",
    }),
    []
  );

  const [formData, setFormData] = useState<FormDataType>(initialFormData);
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

  // カナバリデーション用
  const [validationErrors, setValidationErrors] = useState<{
    customer_last_name_kana?: string;
    customer_first_name_kana?: string;
  }>({});

  // 顧客検索用
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCustomerSelected, setIsCustomerSelected] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // メニュー/クーポン 選択状態
  const [selectionType, setSelectionType] = useState<"menu" | "coupon">("menu");

  // カテゴリ選択ID (string型で運用)
  const [selectedCategory, setSelectedCategory] = useState<string>("0");

  // ---------------------------
  // ここで「カテゴリが取れたら最初のカテゴリIDをセット」する
  // ---------------------------
  useEffect(() => {
    if (categories.length > 0 && selectedCategory === "0") {
      // category.id が number の場合は String() に変換
      setSelectedCategory(String(categories[0].id));
    }
  }, [categories, selectedCategory]);

  // フィルタされたメニュー
  const filteredMenus = useMemo(() => {
    return menuList.filter(
      (m) => String(m.category_id) === String(selectedCategory)
    );
  }, [menuList, selectedCategory]);

  // 顧客検索 (debounce)
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
      setSearchResults(Array.isArray(customers) ? customers : []);
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

  // 顧客を選択
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsSearchOpen(false);
    setSearchValue(customer.name);
    setIsCustomerSelected(true);

    // 姓名とカナを分割してセット
    const nameParts = customer.name.trim().split(/[ 　]+/);
    const nameKanaParts = customer.name_kana.trim().split(/[ 　]+/);

    setFormData((prev) => ({
      ...prev,
      customer_id: customer.id,
      customer_last_name: nameParts[0] || "",
      customer_first_name: nameParts[1] || "",
      customer_last_name_kana: nameKanaParts[0] || "",
      customer_first_name_kana: nameKanaParts[1] || "",
      customer_email: customer.email,
      customer_phone: customer.phone,
    }));
  };

  // フォームをクリア
  const handleClearForm = () => {
    setFormData(initialFormData);
    setSelectedCustomer(null);
    setIsCustomerSelected(false);
    setSearchValue("");
    setSelectedTimeSlot(null);
    setAvailableTimes([]);
    setValidationErrors({});
  };

  // 既存予約を読み込み（編集時）
  useEffect(() => {
    if (reservation && !isCreatingFromButton) {
      // フルネーム分割
      const nameParts = (reservation.customer_name || "")
        .trim()
        .split(/[ 　]+/);
      const lastName = nameParts[0] || "";
      const firstName = nameParts[1] || "";

      const nameKanaParts = (reservation.customer_name_kana || "")
        .trim()
        .split(/[ 　]+/);
      const lastKana = nameKanaParts[0] || "";
      const firstKana = nameKanaParts[1] || "";

      const newFormData = {
        ...initialFormData,
        ...reservation,
        customer_last_name: lastName,
        customer_first_name: firstName,
        customer_last_name_kana: lastKana,
        customer_first_name_kana: firstKana,
        staff_id: reservation.staff_id || "",
        menu_id: reservation.menu_id,
        coupon_id: reservation.coupon_id,
        memo: reservation.memo || "",
        start_time: "",
        end_time: "",
      };

      if (reservation.menu_id) {
        setSelectionType("menu");
      } else if (reservation.coupon_id) {
        setSelectionType("coupon");
      }

      if (reservation.start_time) {
        const startMoment = moment.utc(reservation.start_time).tz("Asia/Tokyo");
        newFormData.start_time = startMoment.format("YYYY-MM-DDTHH:mm");
        setSelectedDate(startMoment.toDate());
        setSelectedTimeSlot(startMoment.format("HH:mm"));
      }
      if (reservation.end_time) {
        const endMoment = moment.utc(reservation.end_time).tz("Asia/Tokyo");
        newFormData.end_time = endMoment.format("YYYY-MM-DDTHH:mm");
      }

      setFormData(newFormData);

      if (reservation.menu_id) {
        const found = menuList.find((m) => m.id === reservation.menu_id);
        if (found) setSelectedMenuPrice(found.price);
      } else if (reservation.coupon_id) {
        const c = couponList.find((cp) => cp.id === reservation.coupon_id);
        if (c?.price) setSelectedMenuPrice(c.price);
      }

      setIsOverlap(false);
      setOverlapMessage("");
    } else {
      // 新規
      setFormData(initialFormData);
      setSelectedDate(new Date());
      setSelectedTimeSlot(null);
      setIsOverlap(false);
      setOverlapMessage("");
      setSelectedMenuPrice(0);
      setSelectionType("menu"); // 新規はメニューをデフォルトに
    }
  }, [
    reservation,
    isCreatingFromButton,
    couponList,
    menuList,
    initialFormData,
  ]);

  // フォームフィールドの変更ハンドラ
  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: name === "menu_id" ? (value ? Number(value) : undefined) : value,
    }));

    // カナバリデーション
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

  // メニュー or クーポン 切り替え
  const handleSelectionTypeChange = (type: "menu" | "coupon") => {
    setSelectionType(type);
    if (type === "menu") {
      // クーポンをクリア
      setFormData((prev) => ({ ...prev, coupon_id: undefined }));
      setSelectedMenuPrice(0);
    } else {
      // メニューをクリア
      setFormData((prev) => ({ ...prev, menu_id: undefined }));
      setSelectedMenuPrice(0);
    }
  };

  // 予約日が変わったり、メニュー/クーポンが変わったら利用可能時間を計算
  useEffect(() => {
    if (
      selectedDate &&
      formData.staff_id &&
      (formData.menu_id || formData.coupon_id)
    ) {
      let duration = 0;
      if (formData.menu_id) {
        const m = menuList.find((mn) => mn.id === formData.menu_id);
        if (m) duration = m.duration;
      } else if (formData.coupon_id) {
        const c = couponList.find((cp) => cp.id === formData.coupon_id);
        if (c?.duration) duration = c.duration;
      }

      const dateStr = moment(selectedDate).format("YYYY-MM-DD");
      let bh = businessHours.find((x) => x.date === dateStr);
      if (!bh) {
        // デフォルト営業時間を仮で決める
        const isWeekend = [0, 6].includes(moment(dateStr).day());
        bh = {
          date: dateStr,
          open_time: isWeekend ? "10:00:00" : "09:00:00",
          close_time: isWeekend ? "18:00:00" : "20:00:00",
          is_holiday: false,
        };
      }
      if (bh.is_holiday) {
        setAvailableTimes([]);
        return;
      }

      const openingTime = moment(
        `${dateStr} ${bh.open_time}`,
        "YYYY-MM-DD HH:mm:ss"
      );
      const closingTime = moment(
        `${dateStr} ${bh.close_time}`,
        "YYYY-MM-DD HH:mm:ss"
      );

      const slots: string[] = [];
      let currentTime = openingTime.clone();

      while (currentTime.isBefore(closingTime)) {
        const slotStart = currentTime.clone();
        const slotEnd = slotStart.clone().add(duration, "minutes");
        if (slotEnd.isAfter(closingTime)) break;

        // 重複チェック
        const isOverlapSlot = reservations.some((res) => {
          if (res.staff_id !== formData.staff_id) return false;
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
          if (resStart.format("YYYY-MM-DD") !== dateStr) return false;

          return slotStart.isBefore(resEnd) && slotEnd.isAfter(resStart);
        });

        if (!isOverlapSlot) {
          slots.push(slotStart.format("HH:mm"));
        }
        currentTime.add(30, "minutes");
      }
      setAvailableTimes(slots);
    } else {
      setAvailableTimes([]);
    }
  }, [
    selectedDate,
    formData.staff_id,
    formData.menu_id,
    formData.coupon_id,
    reservations,
    menuList,
    couponList,
    businessHours,
  ]);

  // 時間枠をクリック
  const handleTimeSlotClick = (time: string) => {
    setSelectedTimeSlot(time);

    const dateStr = moment(selectedDate).format("YYYY-MM-DD");
    const start = moment(`${dateStr}T${time}`, "YYYY-MM-DDTHH:mm");
    let duration = 0;
    if (formData.menu_id) {
      const m = menuList.find((mn) => mn.id === formData.menu_id);
      if (m) duration = m.duration;
    } else if (formData.coupon_id) {
      const c = couponList.find((cp) => cp.id === formData.coupon_id);
      if (c?.duration) duration = c.duration;
    }
    const end = start.clone().add(duration, "minutes");

    setFormData((prev) => ({
      ...prev,
      start_time: start.format("YYYY-MM-DDTHH:mm"),
      end_time: end.format("YYYY-MM-DDTHH:mm"),
    }));
  };

  // start_time が変わるたびに end_time を再計算
  useEffect(() => {
    if (!formData.start_time) return;
    let itemDuration = 0;

    if (formData.menu_id) {
      const found = menuList.find((m) => m.id === formData.menu_id);
      if (found) itemDuration = found.duration;
    } else if (formData.coupon_id) {
      const c = couponList.find((cp) => cp.id === formData.coupon_id);
      if (c?.duration) itemDuration = c.duration;
    }

    if (itemDuration > 0) {
      const startMoment = moment.tz(
        formData.start_time,
        "YYYY-MM-DDTHH:mm",
        "Asia/Tokyo"
      );
      if (startMoment.isValid()) {
        const endMoment = startMoment.clone().add(itemDuration, "minutes");
        setFormData((prev) => ({
          ...prev,
          end_time: endMoment.format("YYYY-MM-DDTHH:mm"),
        }));
      }
    }
  }, [
    formData.start_time,
    formData.menu_id,
    formData.coupon_id,
    menuList,
    couponList,
  ]);

  // フォーム送信
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // カナバリデーションチェック
    const errors: { [key: string]: string } = {};
    if (
      !formData.customer_last_name_kana &&
      !formData.customer_first_name_kana
    ) {
      errors.customer_last_name_kana =
        "顧客名（カナ）の姓または名を入力してください";
    }
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
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

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

    // カナも結合
    let customer_name_kana = "";
    if (formData.customer_last_name_kana && formData.customer_first_name_kana) {
      customer_name_kana = `${formData.customer_last_name_kana} ${formData.customer_first_name_kana}`;
    } else if (formData.customer_last_name_kana) {
      customer_name_kana = formData.customer_last_name_kana;
    } else if (formData.customer_first_name_kana) {
      customer_name_kana = formData.customer_first_name_kana;
    }

    // 時刻を UTC 文字列に
    const utcStart = formData.start_time
      ? moment
          .tz(formData.start_time, "YYYY-MM-DDTHH:mm", "Asia/Tokyo")
          .utc()
          .format()
      : undefined;
    const utcEnd = formData.end_time
      ? moment
          .tz(formData.end_time, "YYYY-MM-DDTHH:mm", "Asia/Tokyo")
          .utc()
          .format()
      : undefined;

    // 価格計算
    let totalPrice = 0;
    if (formData.menu_id) {
      const m = menuList.find((mn) => mn.id === formData.menu_id);
      if (m) totalPrice = m.price;
    } else if (formData.coupon_id) {
      const c = couponList.find((cp) => cp.id === formData.coupon_id);
      if (c?.price) totalPrice = c.price;
    }

    const updatedReservation: Partial<Reservation> = {
      ...formData,
      customer_name,
      customer_name_kana,
      start_time: utcStart,
      end_time: utcEnd,
      total_price: totalPrice,
      is_staff_schedule: false,
      memo: formData.memo,
    };

    // 親コンポーネントへ送信
    onSubmit(updatedReservation, isNew);
    onClose();
  };

  // 削除ボタン
  const handleDelete = () => {
    if (window.confirm("この予約をキャンセルしますか？")) {
      if (formData.id && formData.start_time) {
        try {
          const now = moment();
          const startTime = moment(formData.start_time, "YYYY-MM-DDTHH:mm");
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
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {isNew ? "新規予約" : "予約の編集"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* --- 顧客検索UI --- */}
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
                      selectedCustomer ? "border-green-500" : "border-gray-300"
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

            {/* --- 顧客情報 --- */}
            <div className="grid grid-cols-2 gap-4">
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
                  disabled={isCustomerSelected}
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
                  disabled={isCustomerSelected}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="customer_last_name_kana" className="text-sm">
                  顧客名（カナ・姓）*
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
                    if (validationErrors.customer_last_name_kana) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        customer_last_name_kana: undefined,
                      }));
                    }
                  }}
                  disabled={isCustomerSelected}
                />
                {validationErrors.customer_last_name_kana && (
                  <p className="text-xs text-red-500">
                    {validationErrors.customer_last_name_kana}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="customer_first_name_kana" className="text-sm">
                  顧客名（カナ・名）*
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
                    if (validationErrors.customer_first_name_kana) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        customer_first_name_kana: undefined,
                      }));
                    }
                  }}
                  disabled={isCustomerSelected}
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
                  disabled={isCustomerSelected}
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
                  disabled={isCustomerSelected}
                />
              </div>
            </div>

            {/* --- 担当スタッフ --- */}
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

            {/* --- メニュー or クーポン 切替 --- */}
            <div className="space-y-2">
              <Label className="text-sm">選択タイプ</Label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="selectionType"
                    value="menu"
                    checked={selectionType === "menu"}
                    onChange={() => handleSelectionTypeChange("menu")}
                  />
                  <span className="ml-1">メニュー</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="selectionType"
                    value="coupon"
                    checked={selectionType === "coupon"}
                    onChange={() => handleSelectionTypeChange("coupon")}
                  />
                  <span className="ml-1">クーポン</span>
                </label>
              </div>
            </div>

            {/* --- メニュー選択UI (カテゴリ→メニュー) --- */}
            {selectionType === "menu" && (
              <>
                {/* カテゴリ選択 */}
                <div className="space-y-1">
                  <Label className="text-sm">メニューのカテゴリー</Label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setFormData((prev) => ({ ...prev, menu_id: undefined }));
                      setSelectedMenuPrice(0);
                    }}
                    className="w-full border rounded-md p-1 text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* メニュー選択 */}
                <div className="space-y-1">
                  <Label className="text-sm">メニューを選択</Label>
                  <Listbox
                    value={filteredMenus.find((m) => m.id === formData.menu_id)}
                    onChange={(selected) => {
                      setFormData((prev) => ({
                        ...prev,
                        menu_id: selected.id,
                        coupon_id: undefined,
                      }));
                      setSelectedMenuPrice(selected.price);
                    }}
                  >
                    <div className="relative">
                      <Listbox.Button className="cursor-pointer relative w-full rounded-md border border-gray-300 bg-white py-1 pl-2 pr-8 text-left text-sm focus:outline-none">
                        <span className="block truncate">
                          {formData.menu_id
                            ? filteredMenus.find(
                                (m) => m.id === formData.menu_id
                              )?.name || "メニューを選択"
                            : "メニューを選択"}
                        </span>
                        <span className="pointer-events-auto absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronUpDownIcon className="h-4 w-4 text-gray-900" />
                        </span>
                      </Listbox.Button>
                      <Listbox.Options className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg text-sm">
                        {filteredMenus.map((menu) => (
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
                                {selected && (
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-1 text-blue-600">
                                    <CheckIcon className="h-3 w-3" />
                                  </span>
                                )}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </div>
                  </Listbox>
                </div>
              </>
            )}

            {/* --- クーポン選択UI --- */}
            {selectionType === "coupon" && (
              <div className="space-y-1">
                <Label className="text-sm">クーポンを選択</Label>
                <Listbox
                  value={couponList.find((c) => c.id === formData.coupon_id)}
                  onChange={(selected) => {
                    setFormData((prev) => ({
                      ...prev,
                      coupon_id: selected.id,
                      menu_id: undefined,
                    }));
                    setSelectedMenuPrice(selected.price || 0);
                  }}
                >
                  <div className="relative">
                    <Listbox.Button className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-1 pl-2 pr-8 text-left text-sm focus:outline-none">
                      <span className="block truncate">
                        {formData.coupon_id
                          ? couponList.find((c) => c.id === formData.coupon_id)
                              ?.name || "クーポンを選択"
                          : "クーポンを選択"}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronUpDownIcon
                          className="h-4 w-4 text-gray-400"
                          aria-hidden="true"
                        />
                      </span>
                    </Listbox.Button>
                    <Listbox.Options className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg text-sm">
                      {couponList.map((coupon) => (
                        <Listbox.Option
                          key={coupon.id}
                          value={coupon}
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
                                {coupon.name}
                              </span>
                              {selected && (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-1 text-blue-600">
                                  <CheckIcon className="h-3 w-3" />
                                </span>
                              )}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </div>
                </Listbox>
              </div>
            )}

            {/* 選択したメニュー/クーポンの価格表示 */}
            {selectedMenuPrice > 0 && (
              <div className="space-y-1">
                <Label className="text-sm">選択項目の価格</Label>
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
                  selectedDate ? moment(selectedDate).format("YYYY-MM-DD") : ""
                }
                onChange={(e) => {
                  const d = moment(e.target.value, "YYYY-MM-DD").toDate();
                  setSelectedDate(d);
                }}
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
                      onClick={() => handleTimeSlotClick(time)}
                      className="text-xs px-2 py-0.5"
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              ) : selectedDate &&
                formData.staff_id &&
                (formData.menu_id || formData.coupon_id) ? (
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
                      formData.menu_id
                        ? menuList.find((m) => m.id === formData.menu_id)
                            ?.duration || 0
                        : couponList.find((c) => c.id === formData.coupon_id)
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

            {/* メモ */}
            <div className="space-y-1">
              <Label className="text-sm">メモ</Label>
              <textarea
                className="w-full border rounded-md p-1 text-sm"
                value={formData.memo}
                onChange={(e) => handleChange("memo", e.target.value)}
                placeholder="スタッフ用メモなど、自由に入力できます"
              />
            </div>

            {/* 送信・削除ボタン */}
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

      {/* スナックバー */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar(null)}
          severity={snackbar?.severity}
          sx={{ width: "100%", borderRadius: "8px", boxShadow: 3 }}
          className="text-sm"
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ReservationForm;
