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

// Reservation や Staff, MenuItem, BusinessHour などの型定義
import {
  BusinessHour,
  Reservation,
  Staff,
  MenuItem as MenuItemType,
} from "@/types/reservation";

// -----------------------------
// 顧客検索用の型
// -----------------------------
interface Customer {
  id: string;
  name: string;
  name_kana: string;
  email: string;
  phone: string;
}

// -----------------------------
// フォーム内部のステート型
// -----------------------------
interface FormDataType {
  customer_first_name: string;
  customer_last_name: string;
  customer_first_name_kana: string;
  customer_last_name_kana: string;
  customer_email: string;
  customer_phone: string;
  menu_id?: number; // メニューID (number)
  coupon_id?: string; // クーポンID (uuid)
  staff_id: string;
  start_time: string; // 常に "YYYY-MM-DDTHH:mm" (ローカル) で保持
  end_time: string; // 同上
  event: string;
  id: string;
  customer_id: string;
}

// -----------------------------
// ReservationFormProps
// -----------------------------
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

// -----------------------------
// メニューとクーポンを共通で扱うための型
// -----------------------------
type ItemType = "menu" | "coupon";
interface CombinedItem {
  id: string; // menu_id (number→string化) or coupon_id (uuid)
  name: string;
  duration?: number;
  price?: number;
  type: ItemType; // "menu" or "coupon"
}

// -----------------------------
// カタカナのバリデーション
// -----------------------------
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
}) => {
  // 認証情報
  const { session } = useAuth();

  // useReservationCalendar から couponList を取得
  const { couponList } = useReservationCalendar();

  // -----------------------------
  // "メニュー + クーポン" をまとめた配列
  // -----------------------------
  const combinedItems: CombinedItem[] = useMemo(() => {
    const menus = menuList.map((m) => ({
      id: String(m.id),
      name: m.name,
      duration: m.duration,
      price: m.price,
      type: "menu" as const,
    }));
    const coupons = couponList.map((c) => ({
      id: c.id,
      name: c.name,
      duration: c.duration,
      price: c.price,
      type: "coupon" as const,
    }));
    return [...menus, ...coupons];
  }, [menuList, couponList]);

  // -----------------------------
  // フォームの初期値
  // -----------------------------
  const initialFormData: FormDataType = {
    customer_first_name: "",
    customer_last_name: "",
    customer_first_name_kana: "",
    customer_last_name_kana: "",
    customer_email: "",
    customer_phone: "",
    menu_id: undefined,
    coupon_id: undefined,
    staff_id: "",
    start_time: "", // ローカル "YYYY-MM-DDTHH:mm"
    end_time: "",
    event: "",
    id: "",
    customer_id: "",
  };

  const [formData, setFormData] = useState<FormDataType>(initialFormData);

  // 重複チェック関連
  const [isOverlap, setIsOverlap] = useState<boolean>(false);
  const [overlapMessage, setOverlapMessage] = useState<string>("");

  // スナックバー
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);

  // 日付・時刻スロット
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  // メニュー/クーポン選択
  const [selectedItem, setSelectedItem] = useState<CombinedItem | null>(null);
  const [selectedMenuPrice, setSelectedMenuPrice] = useState<number>(0);

  // 顧客検索関連
  interface Customer {
    id: string;
    name: string;
    name_kana: string;
    email: string;
    phone: string;
  }
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCustomerSelected, setIsCustomerSelected] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // カナバリデーションエラー
  const [validationErrors, setValidationErrors] = useState<{
    customer_last_name_kana?: string;
    customer_first_name_kana?: string;
  }>({});

  // -----------------------------
  // 顧客検索 (debounce)
  // -----------------------------
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

  // -----------------------------
  // 顧客選択
  // -----------------------------
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsSearchOpen(false);
    setSearchValue(customer.name);
    setIsCustomerSelected(true);

    // 姓名を分割
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

  // -----------------------------
  // フォームクリア
  // -----------------------------
  const handleClearForm = () => {
    setFormData(initialFormData);
    setSelectedCustomer(null);
    setIsCustomerSelected(false);
    setSearchValue("");
    setSelectedTimeSlot(null);
    setAvailableTimes([]);
    setValidationErrors({});
  };

  // -----------------------------
  // 既存予約を読み込む（ローカル時刻へ変換）
  // -----------------------------
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
        menu_id: reservation.menu_id,
        coupon_id: reservation.coupon_id,
        staff_id: reservation.staff_id || "",
        start_time: "",
        end_time: "",
      };

      // coupon or menu 選択
      if (reservation.coupon_id) {
        const found = combinedItems.find(
          (x) => x.type === "coupon" && x.id === reservation.coupon_id
        );
        if (found) setSelectedItem(found);
      } else if (reservation.menu_id) {
        const found = combinedItems.find(
          (x) => x.type === "menu" && x.id === String(reservation.menu_id)
        );
        if (found) setSelectedItem(found);
      }

      // start_time (UTC) → ローカル文字列
      if (reservation.start_time) {
        const startMoment = moment.utc(reservation.start_time).tz("Asia/Tokyo");
        newFormData.start_time = startMoment.format("YYYY-MM-DDTHH:mm");

        // カレンダー用に Date オブジェクト
        const localDate = startMoment.toDate();
        setSelectedDate(localDate);

        // スロットも確定
        setSelectedTimeSlot(startMoment.format("HH:mm"));
      }

      // end_time (UTC) → ローカル文字列
      if (reservation.end_time) {
        const endMoment = moment.utc(reservation.end_time).tz("Asia/Tokyo");
        newFormData.end_time = endMoment.format("YYYY-MM-DDTHH:mm");
      }

      setFormData(newFormData);

      // duration 分から price を確定
      if (reservation.menu_id) {
        const m = menuList.find((menu) => menu.id === reservation.menu_id);
        if (m) {
          setSelectedMenuPrice(m.price);
        }
      } else if (reservation.coupon_id) {
        const c = couponList.find((cp) => cp.id === reservation.coupon_id);
        if (c?.price) {
          setSelectedMenuPrice(c.price);
        }
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
      setSelectedItem(null);
      setSelectedMenuPrice(0);
    }
  }, [reservation, isCreatingFromButton, couponList, menuList, combinedItems]);

  // -----------------------------
  // フィールド更新ハンドラ
  // -----------------------------
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

  // -----------------------------
  // メニュー/クーポン選択
  // -----------------------------
  const handleSelectItem = (item: CombinedItem) => {
    setSelectedItem(item);
    if (item.type === "menu") {
      setFormData((prev) => ({
        ...prev,
        menu_id: Number(item.id),
        coupon_id: undefined,
      }));
      setSelectedMenuPrice(item.price || 0);
    } else {
      setFormData((prev) => ({
        ...prev,
        coupon_id: item.id,
        menu_id: undefined,
      }));
      setSelectedMenuPrice(item.price || 0);
    }
  };

  // -----------------------------
  // 予約日変更 → 可能な時間帯更新
  // -----------------------------
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
        // デフォルト営業時間（例）
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

          // スロットが既存の予約とかぶるかどうか
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

  // -----------------------------
  // 時間帯をクリック → ローカル時刻セット
  // -----------------------------
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

  // ---------------------------------------------------------------------------------
  // 方式A: start_time or 選択メニューが変わるたびに、end_time を自動再計算する useEffect
  // ---------------------------------------------------------------------------------
  useEffect(() => {
    // start_time が未設定、またはまだメニュー/クーポンが未選択の場合は何もしない
    if (!formData.start_time) return;
    if (!selectedItem?.duration) return;

    // すでにタイムスロットをクリックして end_time が入っている場合でも、
    // 「start_time を再度変更 or メニュー変更」したら正しく再計算して上書きする
    const startMoment = moment.tz(
      formData.start_time,
      "YYYY-MM-DDTHH:mm",
      "Asia/Tokyo"
    );
    if (!startMoment.isValid()) return;

    const endMoment = startMoment.clone().add(selectedItem.duration, "minutes");
    setFormData((prev) => ({
      ...prev,
      end_time: endMoment.format("YYYY-MM-DDTHH:mm"),
    }));
  }, [formData.start_time, selectedItem]);

  // -----------------------------
  // 送信ボタン
  // -----------------------------
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // カナバリデーション
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

    // もし「スロット選択が必須」なら、ここでエラーチェックも可能
    if (isOverlap || !selectedTimeSlot) {
      setSnackbar({
        message: overlapMessage || "予約情報に問題があります",
        severity: "error",
      });
      return;
    }

    // 姓名結合
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

    // ローカル → UTC文字列へ変換
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

    // 最終ペイロード
    const updatedReservation: Partial<Reservation> = {
      ...formData,
      customer_name,
      customer_name_kana,
      start_time: utcStart,
      end_time: utcEnd,
      total_price: selectedMenuPrice,
      is_staff_schedule: false,
    };

    onSubmit(updatedReservation, isNew);
    onClose();
  };

  // -----------------------------
  // 予約削除
  // -----------------------------
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

  // -----------------------------
  // 外部クリックで検索結果を閉じる
  // -----------------------------
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

            {/* 顧客情報フィールド */}
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

            {/* メニュー or クーポン選択 */}
            <div className="space-y-1">
              <Label className="text-sm">メニュー / クーポン</Label>
              <Listbox value={selectedItem} onChange={handleSelectItem}>
                <div className="relative">
                  <Listbox.Button className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-1 pl-2 pr-8 text-left text-sm focus:outline-none">
                    <span className="block truncate">
                      {selectedItem
                        ? `${selectedItem.name} (${
                            selectedItem.type === "menu"
                              ? "メニュー"
                              : "クーポン"
                          })`
                        : "メニュー / クーポンを選択"}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon
                        className="h-4 w-4 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </Listbox.Button>
                  <Listbox.Options className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg text-sm">
                    {/* メニューグループ */}
                    <div className="px-2 py-1 text-gray-500 text-xs">
                      --- メニュー ---
                    </div>
                    {combinedItems
                      .filter((x) => x.type === "menu")
                      .map((item) => (
                        <Listbox.Option
                          key={item.id}
                          value={item}
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
                                {item.name} ({item.duration}分)
                              </span>
                              {selected ? (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-1 text-blue-600">
                                  <CheckIcon className="h-3 w-3" />
                                </span>
                              ) : null}
                            </>
                          )}
                        </Listbox.Option>
                      ))}

                    {/* クーポングループ */}
                    <div className="px-2 py-1 text-gray-500 text-xs">
                      --- クーポン ---
                    </div>
                    {combinedItems
                      .filter((x) => x.type === "coupon")
                      .map((item) => (
                        <Listbox.Option
                          key={item.id}
                          value={item}
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
                                {item.name}
                              </span>
                              {selected ? (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-1 text-blue-600">
                                  <CheckIcon className="h-3 w-3" />
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

            {/* メニュー or クーポンの価格表示 */}
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
                    .add(selectedItem?.duration || 0, "minutes")
                    .format("HH:mm")}
                </p>
              </div>
            )}

            {isOverlap && (
              <Alert severity="error" className="text-xs">
                {overlapMessage}
              </Alert>
            )}

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
