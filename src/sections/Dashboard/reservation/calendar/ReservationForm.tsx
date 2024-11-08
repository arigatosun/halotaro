// ReservationForm.tsx
'use client'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
import debounce from 'lodash/debounce';
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
  customer_first_name?: string;
  customer_last_name?: string;
  customer_first_name_kana?: string;
  customer_last_name_kana?: string;
  customer_email?: string;
  customer_phone?: string;
  menu_id?: number;
  staff_id?: string;
  start_time?: string;
  end_time?: string;
  event?: string;
  id?: string;
  customer_id?: string;
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
  const { session } = useAuth(); // useAuthからsessionを取得
  const [formType, setFormType] = useState<"reservation" | "staffSchedule">("reservation");
  const [formData, setFormData] = useState<FormDataType>({});
  const [computedEndTime, setComputedEndTime] = useState<string>("");
  const [isOverlap, setIsOverlap] = useState<boolean>(false);
  const [overlapMessage, setOverlapMessage] = useState<string>("");
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error"; } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedMenuPrice, setSelectedMenuPrice] = useState<number>(0);
  const [selectedMenu, setSelectedMenu] = useState<MenuItemType | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 顧客検索の処理
  const searchCustomers = debounce(async (query: string) => {
    if (!query.trim() || !session?.access_token) {
      console.log("Search skipped:", { 
        reason: !query.trim() ? "Empty query" : "No access token",
        query,
        hasToken: !!session?.access_token 
      });
      setSearchResults([]);
      return;
    }
  
    setIsLoading(true);
    try {
      console.log("Sending search request:", { 
        query, 
        token: `${session.access_token.substring(0, 10)}...` 
      });
  
      const response = await fetch("/api/search-customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ query })
      });
  
      console.log("Search response status:", response.status);
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Search error response:", errorData);
        throw new Error(errorData.error || "顧客検索に失敗しました");
      }
  
      const customers = await response.json();
      console.log("Received search results:", customers);
  
      if (Array.isArray(customers)) {
        setSearchResults(customers);
        if (customers.length > 0) {
          console.log("Search results set:", customers.length, "customers found");
        } else {
          console.log("No customers found");
        }
      } else {
        console.error("Invalid response format:", customers);
        setSearchResults([]);
      }
  
    } catch (error) {
      console.error("Customer search error:", error);
      setSnackbar({
        message: error instanceof Error ? error.message : "顧客検索に失敗しました",
        severity: "error"
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
    console.log("Handling customer selection:", customer);
    setSelectedCustomer(customer);
    setIsSearchOpen(false);

    setFormData((prevFormData) => {
      const nameParts = customer.name.split(" ");
      const nameKanaParts = customer.name_kana.split(" ");

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

      console.log("Updating form data:", updatedFormData);
      return updatedFormData;
    });
  };

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
      const selectedMenu = menuList.find((menu) => menu.id === formData.menu_id);
      if (selectedMenu) {
        const menuDuration = selectedMenu.duration;
        const staffId = formData.staff_id;
        const dateStr = moment(selectedDate).format("YYYY-MM-DD");

        // 営業時間の取得
        let businessHourForDate = businessHours.find((bh) => bh.date === dateStr);
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
        const openingTime = moment(`${dateStr} ${businessHourForDate.open_time}`, "YYYY-MM-DD HH:mm:ss");
        const closingTime = moment(`${dateStr} ${businessHourForDate.close_time}`, "YYYY-MM-DD HH:mm:ss");

        // 30分単位のタイムスロット生成
        const timeSlots = [];
        let currentTime = openingTime.clone();
        while (currentTime.isBefore(closingTime)) {
          timeSlots.push(currentTime.format("HH:mm"));
          currentTime.add(30, "minutes");
        }

        // 予約可能な時間帯を特定
        const available = timeSlots.filter(time => {
          const start = moment(`${dateStr} ${time}`, "YYYY-MM-DD HH:mm");
          const end = start.clone().add(menuDuration, "minutes");

          // 営業時間外の場合は除外
          if (end.isAfter(closingTime)) return false;

          // 既存予約との重複チェック
          return !reservations.some(res => {
            // 異なるスタッフの予約は無視
            if (res.staff_id !== staffId) return false;
            
            // キャンセル済み予約は無視
            if (res.status && ['cancelled', 'salon_cancelled', 'same_day_cancelled', 'no_show'].includes(res.status)) {
              return false;
            }

            const resStart = moment.utc(res.start_time).local();
            const resEnd = moment.utc(res.end_time).local();
            
            // 同じ日付の予約のみチェック
            if (resStart.format('YYYY-MM-DD') !== dateStr) return false;

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
    if (window.confirm('この予約をキャンセルしますか？')) {
      if (formData.id && formData.start_time) {
        try {
          const now = moment();
          const startTime = moment(formData.start_time);
          
          // 予約時間が過ぎているかどうかでキャンセル種別を決定
          const cancellationType = now.isAfter(startTime) ? 'no_show' : 'salon_cancelled';
          
          onDelete(formData.id, cancellationType);
          onClose();
        } catch (error) {
          console.error('Error cancelling reservation:', error);
          setSnackbar({
            message: '予約のキャンセルに失敗しました',
            severity: 'error'
          });
        }
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
                  {/* 顧客検索UI */}
                  <div className="space-y-2 col-span-2">
                    <Label>顧客検索</Label>
                    <Popover
                      open={isSearchOpen}
                      onOpenChange={(open) => setIsSearchOpen(open)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isSearchOpen}
                          className="w-full justify-between"
                        >
                          {selectedCustomer ? (
                            <div className="flex flex-col items-start">
                              <span>{selectedCustomer.name}</span>
                              <span className="text-sm text-gray-500">
                                {selectedCustomer.name_kana}
                              </span>
                            </div>
                          ) : (
                            "顧客を検索..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                      <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="顧客名を入力..."
                            value={searchValue}
                            onValueChange={(value) => {
                              console.log("Input value changed:", value);
                              setSearchValue(value);
                              searchCustomers(value);
                            }}
                          />
                          <CommandEmpty>該当する顧客が見つかりません</CommandEmpty>
                          <CommandGroup className="max-h-60 overflow-auto">
                            {searchResults.map((customer) => {
                              console.log("Rendering customer:", customer);
                              return (
                                <CommandItem
                                  key={customer.id}
                                  onSelect={() => {
                                    console.log("Selected customer:", customer);
                                    handleCustomerSelect(customer);
                                  }}
                                  className="flex items-center justify-between p-2"
                                >
                                  <div>
                                    <div className="font-medium">{customer.name}</div>
                                    <div className="text-sm text-gray-500">
                                      {customer.name_kana}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {customer.email}
                                    </div>
                                  </div>
                                  {selectedCustomer?.id === customer.id && (
                                    <CheckIcon className="h-4 w-4" />
                                  )}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* 顧客情報フォームフィールド */}
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
