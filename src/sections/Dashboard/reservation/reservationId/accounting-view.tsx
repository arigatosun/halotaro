"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/authcontext";
import { PlusIcon, MinusIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

// --------------------------
// 1) 型定義
// --------------------------
interface Item {
  id: string;
  category: string; // 「施術」 or 「店販」 or 「割引」など
  name: string;
  staff: string;
  price: number;   // 割引ならマイナス金額
  quantity: number;
  // 以下を追加: discount_type, discount_value など
  discount_type?: "fixed" | "fraction" | "percent";
  discount_value?: number; // percent時はパーセンテージ
}

// DB上のカテゴリ
interface DBCategory {
  id: number;
  name: string;
}

// JOIN結果を含むメニュー (施術)
interface DBMenuItem {
  id: number;
  user_id: string;
  name: string;
  price: number;
  duration: number;
  description: string | null;
  is_reservable: boolean;
  created_at: string;
  updated_at: string;
  image_url: string | null;
  categories?: DBCategory | null; // category_id が NULL なら null
}

// 店販メニュー
interface DBSalesMenuItem {
  id: number;
  user_id: string;
  name: string;
  category: string;  // 店販は category カラムを直接使う
  price: number;
  description: string | null;
  created_at: string;
  updated_at: string;
  image_url: string | null;
  categories?: DBCategory | null;
}

// 割引アイテム
interface DBDiscountItem {
  id: number;
  user_id: string;
  name: string;
  discount_value: number; // 割引額 (fixedやpercentの場合の値)
  created_at: string;
  updated_at: string;
  image_url: string | null;
  // 新たに discount_type を持つ想定
  discount_type?: "fixed" | "fraction" | "percent";
}

interface Staff {
  id: string;
  name: string;
  role: string;
  experience: string | null;
  is_published: boolean;
  image: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface ReservationCustomer {
  id: string;
  reservation_id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
  name_kana: string | null;
  reservation_count: number;
  cancellation_count: number;
}

interface Reservation {
  id: string;
  user_id: string;
  menu_id: number | null;
  staff_id: string | null;
  status: string;
  total_price: number;
  created_at: string;
  updated_at: string;
  start_time: string;
  end_time: string;
  scraped_customer?: string | null;
  scraped_menu?: string | null;
  coupon_id: string | null;
  is_staff_schedule: boolean | null;
  event: string | null;
  menu_items: DBMenuItem | null;
  staff: Staff | null;
  reservation_customers: ReservationCustomer | null;
}

interface AccountingPageProps {
  reservationId: string;
}

// --------------------------
// 2) カテゴリ名グルーピング関数 (施術用)
// --------------------------
function groupMenuItemsByCategory(
  menuItems: DBMenuItem[]
): Record<string, DBMenuItem[]> {
  const grouped: Record<string, DBMenuItem[]> = {};

  menuItems.forEach((item) => {
    // categories?.name があればその値、なければ "未分類"
    const catName = item.categories?.name || "未分類";
    if (!grouped[catName]) {
      grouped[catName] = [];
    }
    grouped[catName].push(item);
  });

  return grouped;
}

// --------------------------
// 端数計算関数 (fraction)
// --------------------------
// 例えば "1円の桁を0にする" → (subtotal % 10) を引く など
function calcFractionDiscount(subtotal: number, fractionType: "1" | "10" | "100"): number {
  if (fractionType === "1") {
    // 1円桁を 0 にする
    return subtotal % 10;
  } else if (fractionType === "10") {
    // 10円桁を 0 にする
    return subtotal % 100;
  } else {
    // 100円桁を 0 にする
    return subtotal % 1000;
  }
}

// --------------------------
// 3) メインコンポーネント
// --------------------------
export const AccountingPage: React.FC<AccountingPageProps> = ({
  reservationId,
}) => {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  // --------------------------
  // 3-1) ローカルState
  // --------------------------
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedCashier, setSelectedCashier] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // 決済方法
  const [paymentMethods, setPaymentMethods] = useState<
    { method: string; amount: number }[]
  >([]);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorInput, setCalculatorInput] = useState("");
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<string | null>(
    null
  );
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);

  // 施術メニュー
  const [treatmentCategories, setTreatmentCategories] = useState<string[]>([]);
  const [treatmentItemsByCategory, setTreatmentItemsByCategory] = useState<{
    [category: string]: DBMenuItem[];
  }>({});

  // 店販メニュー
  const [retailCategories, setRetailCategories] = useState<string[]>([]);
  const [retailItemsByCategory, setRetailItemsByCategory] = useState<{
    [category: string]: DBSalesMenuItem[];
  }>({});

  // 割引メニュー
  const [discountItems, setDiscountItems] = useState<DBDiscountItem[]>([]);

  // 割引 新規作成用
  const [discountName, setDiscountName] = useState("");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<"fixed"|"fraction"|"percent">("fixed");

  // 予約・スタッフ関連
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [staffList, setStaffList] = useState<Staff[]>([]);

  // フェッチ制御用
  const fetchReservationRef = useRef<boolean>(false);
  const fetchStaffRef = useRef<boolean>(false);
  const fetchMenuItemsRef = useRef<boolean>(false);
  const fetchSalesMenuItemsRef = useRef<boolean>(false);
  const fetchDiscountItemsRef = useRef<boolean>(false);
  const fetchTemporarySaveRef = useRef<boolean>(false);

  const userId = user?.id;

  // ------------------------------------
  // 4) 予約情報の取得
  // ------------------------------------
  useEffect(() => {
    if (authLoading || !user || !session) return;
    if (fetchReservationRef.current) return;
    fetchReservationRef.current = true;

    const fetchReservation = async () => {
      try {
        const response = await fetch(`/api/reservations/${reservationId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error("予約情報の取得に失敗しました");
        }

        const data: { reservation: Reservation; accountingData?: any } =
          await response.json();

        setReservation(data.reservation);

        // 顧客名
        const nameFromCustomer =
          data.reservation.reservation_customers?.name ||
          data.reservation.reservation_customers?.name_kana ||
          data.reservation.scraped_customer ||
          "不明";
        setCustomerName(nameFromCustomer);

        // 予約に紐づくメニューがあれば先に1件追加
        let newItem: Item | null = null;
        if (data.reservation.menu_items) {
          const m = data.reservation.menu_items;
          newItem = {
            id: m.id.toString(),
            category: "施術", // 仮で「施術」として扱う
            name: m.name,
            staff: data.reservation.staff?.name || "",
            price: m.price,
            quantity: 1,
          };
        } else if (data.reservation.scraped_menu) {
          newItem = {
            id: Date.now().toString(),
            category: "施術",
            name: data.reservation.scraped_menu,
            staff: data.reservation.staff?.name || "",
            price: data.reservation.total_price || 0,
            quantity: 1,
          };
        }
        if (newItem) {
          setItems([newItem]);
        }

        // スタッフ
        if (data.reservation.staff) {
          setSelectedStaff(data.reservation.staff.name);
          setSelectedCashier(data.reservation.staff.name);
        }

        // 一時保存データがあれば復元
        if (data.accountingData) {
          const tempData = data.accountingData;
          setCustomerName(tempData.customer_name);
          setItems(tempData.items);
          setSelectedStaff(tempData.staff_name);
          setSelectedCashier(tempData.cashier_name);
          setPaymentMethods(tempData.payment_methods);
          setTotal(tempData.total_price);
        }
      } catch (error) {
        console.error("予約情報の取得エラー:", error);
      }
    };

    if (reservationId && userId && session.access_token) {
      fetchReservation();
    }
  }, [authLoading, user, session, reservationId, userId]);

  // ------------------------------------
  // 5) スタッフ一覧の取得
  // ------------------------------------
  useEffect(() => {
    if (authLoading || !user || !session) return;
    if (fetchStaffRef.current) return;
    fetchStaffRef.current = true;

    const fetchStaff = async () => {
      try {
        const response = await fetch("/api/staff", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error("スタッフ情報の取得に失敗しました");
        }

        const data: Staff[] = await response.json();
        setStaffList(data);

        // デフォルト選択
        if (data.length > 0 && !selectedStaff) {
          setSelectedStaff(data[0].name);
          setSelectedCashier(data[0].name);
        }
      } catch (error) {
        console.error("スタッフ情報の取得エラー:", error);
      }
    };

    if (userId && session.access_token) {
      fetchStaff();
    }
  }, [authLoading, user, session, userId, selectedStaff]);

  // ------------------------------------
  // 6) 施術メニュー一覧の取得
  // ------------------------------------
  useEffect(() => {
    if (authLoading || !user || !session) return;
    if (fetchMenuItemsRef.current) return;
    fetchMenuItemsRef.current = true;

    const fetchMenuItems = async () => {
      try {
        const response = await fetch("/api/menu-items", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (!response.ok) {
          throw new Error("メニュー項目の取得に失敗しました");
        }

        // JOIN済みデータ: DBMenuItem[]
        const data: DBMenuItem[] = await response.json();

        // user_id が一致するものだけに絞る
        const userMenuItems = data.filter((m) => m.user_id === userId);

        // カテゴリごとにグループ
        const grouped = groupMenuItemsByCategory(userMenuItems);

        // カテゴリ名一覧
        const catNames = Object.keys(grouped);
        setTreatmentCategories(catNames);

        // 初期選択
        if (catNames.length > 0 && !selectedCategory) {
          setSelectedCategory(catNames[0]);
        }

        setTreatmentItemsByCategory(grouped);
      } catch (error) {
        console.error("メニュー項目の取得エラー:", error);
      }
    };

    if (userId && session.access_token) {
      fetchMenuItems();
    }
  }, [authLoading, user, session, userId, selectedCategory]);

  // ------------------------------------
  // 7) 店販メニュー一覧の取得
  // ------------------------------------
  useEffect(() => {
    if (authLoading || !user || !session) return;
    if (fetchSalesMenuItemsRef.current) return;
    fetchSalesMenuItemsRef.current = true;

    const fetchSalesMenuItems = async () => {
      try {
        const response = await fetch("/api/sales-menu-items", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (!response.ok) {
          throw new Error("店販項目の取得に失敗しました");
        }

        const data: DBSalesMenuItem[] = await response.json();

        // user_id が一致するものだけに絞る
        const userSalesMenuItems = data.filter((m) => m.user_id === userId);

        // カテゴリごとにグループ
        const grouped: Record<string, DBSalesMenuItem[]> = {};
        userSalesMenuItems.forEach((item) => {
          const catName = item.category || "未分類";
          if (!grouped[catName]) {
            grouped[catName] = [];
          }
          grouped[catName].push(item);
        });

        const catNames = Object.keys(grouped);
        setRetailCategories(catNames);

        if (catNames.length > 0 && !selectedCategory) {
          setSelectedCategory(catNames[0]);
        }

        setRetailItemsByCategory(grouped);
      } catch (error) {
        console.error("店販項目の取得エラー:", error);
      }
    };

    if (userId && session.access_token) {
      fetchSalesMenuItems();
    }
  }, [authLoading, user, session, userId, selectedCategory]);

  // ------------------------------------
  // 8) 割引メニュー一覧の取得
  // ------------------------------------
  useEffect(() => {
    if (authLoading || !user || !session) return;
    if (fetchDiscountItemsRef.current) return;
    fetchDiscountItemsRef.current = true;

    const fetchDiscountItems = async () => {
      try {
        const response = await fetch("/api/discount-items", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (!response.ok) {
          throw new Error("割引アイテムの取得に失敗しました");
        }

        const data: DBDiscountItem[] = await response.json();
        setDiscountItems(data);
      } catch (error) {
        console.error("割引アイテムの取得エラー:", error);
      }
    };

    if (userId && session.access_token) {
      fetchDiscountItems();
    }
  }, [authLoading, user, session, userId]);

  // ------------------------------------
  // 9) 一時保存データの取得
  // ------------------------------------
  useEffect(() => {
    if (authLoading || !user || !session) return;
    if (fetchTemporarySaveRef.current) return;
    fetchTemporarySaveRef.current = true;

    const fetchTemporarySave = async () => {
      try {
        const response = await fetch(
          `/api/accounting?reservationId=${reservationId}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            console.log("一時保存データが存在しません");
            return;
          }
          throw new Error("一時保存データの取得に失敗しました");
        }

        const result = await response.json();
        if (result.customer_name) {
          setCustomerName(result.customer_name);
          setItems(result.items);
          setSelectedStaff(result.staff_name);
          setSelectedCashier(result.cashier_name);
          setPaymentMethods(result.payment_methods);
          setTotal(result.total_price);
        }
      } catch (error) {
        console.error("一時保存データの取得エラー:", error);
      }
    };

    if (reservationId && userId && session.access_token) {
      fetchTemporarySave();
    }
  }, [authLoading, user, session, reservationId, userId]);

  // ------------------------------------
  // 10) itemsが変わるたびに合計を再計算
  // ------------------------------------
  useEffect(() => {
    const newTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    setTotal(newTotal);
  }, [items]);

// ------------------------------------
// 10-A&B) 割引を「パーセント→端数」の順で再計算
// ------------------------------------
useEffect(() => {
  // 1) 割引アイテムを抜き出す
  const discountItemsInCart = items.filter((it) => it.category === "割引");
  if (discountItemsInCart.length === 0) return;

  // 2) パーセント割引・端数割引 を分類
  const percentItems = discountItemsInCart.filter(
    (it) => it.discount_type === "percent"
  );
  const fractionItems = discountItemsInCart.filter(
    (it) => it.discount_type === "fraction"
  );
  // 他の割引 (fixedなど) もある場合はここで分類してもOK

  // 3) まず「パーセント割引」を順次適用
  //    パーセント割引を除くアイテムたちの小計
  let currentSubtotal = items
    .filter((it) => !percentItems.includes(it) && !fractionItems.includes(it))
    .reduce((sum, it) => sum + it.price * it.quantity, 0);

  percentItems.forEach((pItem) => {
    const pct = pItem.discount_value ?? 0;
    const discountAmount = Math.floor(currentSubtotal * (pct / 100));
    const newPrice = -discountAmount;
    if (pItem.price !== newPrice) {
      setItems((prev) =>
        prev.map((x) => (x.id === pItem.id ? { ...x, price: newPrice } : x))
      );
    }
    currentSubtotal -= discountAmount;
  });

  // 4) 続いて「端数割引」を適用
  fractionItems.forEach((fItem) => {
    // 端数の種類を決める
    let fractionType: "1" | "10" | "100" = "1";
    if (fItem.name.includes("10円")) fractionType = "10";
    if (fItem.name.includes("100円")) fractionType = "100";

    const fracValue = calcFractionDiscount(currentSubtotal, fractionType);
    const newPrice = -fracValue;
    if (fItem.price !== newPrice) {
      setItems((prev) =>
        prev.map((x) => (x.id === fItem.id ? { ...x, price: newPrice } : x))
      );
    }
    currentSubtotal -= fracValue;
  });
}, [items]);


  // ------------------------------------
  // 11) アイテム操作系
  // ------------------------------------
  const addItem = (category: string, name: string, price: number = 0) => {
    const newItem: Item = {
      id: Date.now().toString(),
      category,
      name,
      staff: selectedStaff,
      price,
      quantity: 1,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const updateItem = (id: string, field: keyof Item, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // 割引を「マイナス金額」として追加する
  // discount_type に応じて後から動的に再計算する
  const addDiscountItem = (discount: DBDiscountItem) => {
    const newItem: Item = {
      id: Date.now().toString(),
      category: "割引",
      name: discount.name,
      staff: "",
      discount_type: discount.discount_type,     // ← 追加
      discount_value: discount.discount_value,   // ← 追加
      price: -discount.discount_value,           // "fixed" の場合はこのまま
      quantity: 1,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // ------------------------------------
  // 割引アイテムの削除
  // ------------------------------------
  const handleDeleteDiscountItem = async (discountId: number) => {
    if (!session) return;

    try {
      const response = await fetch("/api/discount-items", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ discountItemId: discountId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "割引アイテムの削除に失敗しました");
      }

      // 削除成功したら discountItems ステートから除外
      setDiscountItems((prev) => prev.filter((item) => item.id !== discountId));
      alert("割引アイテムを削除しました");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "エラーが発生しました");
    }
  };

  // ------------------------------------
  // 12) 会計処理
  // ------------------------------------
  const handleAccounting = async () => {
    try {
      const totalPayment = paymentMethods.reduce((sum, pm) => sum + pm.amount, 0);
      if (totalPayment !== total) {
        alert("支払い金額の合計が現計と一致しません");
        return;
      }

      const accountingData = {
        reservationId,
        customer_name: customerName,
        items,
        staff_name: selectedStaff,
        cashier_name: selectedCashier,
        payment_methods: paymentMethods,
        total_price: total,
        isTemporary: false,
      };

      const response = await fetch("/api/accounting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(accountingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "会計情報の保存に失敗しました");
      }

      // 予約ステータスを paid に更新
      await updateReservationStatus(reservationId, "paid");

      // 状態リセット
      setItems([]);
      setTotal(0);
      setPaymentMethods([]);
      setSelectedCashier("");

      alert("会計が完了しました。");
      router.push("/dashboard/reservations/list");
    } catch (error: any) {
      console.error("会計情報の保存エラー:", error.message || error);
      alert(`エラー: ${error.message || "会計情報の保存に失敗しました"}`);
    }
  };

  // ------------------------------------
  // 13) 一時保存
  // ------------------------------------
  const handleTemporarySave = async () => {
    try {
      const accountingData = {
        reservationId,
        customer_name: customerName,
        items,
        staff_name: selectedStaff,
        cashier_name: selectedCashier,
        payment_methods: paymentMethods,
        total_price: total,
        isTemporary: true,
      };

      const response = await fetch("/api/accounting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(accountingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "一時保存に失敗しました");
      }

      alert("一時保存が完了しました。");
    } catch (error: any) {
      console.error("一時保存のエラー:", error.message || error);
      alert(`エラー: ${error.message || "一時保存に失敗しました"}`);
    }
  };

  // ------------------------------------
  // 14) 予約ステータス更新
  // ------------------------------------
  const updateReservationStatus = async (resId: string, status: string) => {
    try {
      const response = await fetch(`/api/reservations/${resId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "予約ステータスの更新に失敗しました"
        );
      }
    } catch (error: any) {
      console.error("予約ステータスの更新エラー:", error.message || error);
      throw error;
    }
  };

  // ------------------------------------
  // 15) 決済UI (電卓 & 決済方法)
  // ------------------------------------
  const handlePaymentMethodClick = (method: string) => {
    if (method === "カード・その他") {
      setShowPaymentMethodModal(true);
    } else {
      setCurrentPaymentMethod(method);
      setShowCalculator(true);
      setCalculatorInput("");
    }
  };

  const handleCalculatorInput = (value: string) => {
    if (value === "clear") {
      setCalculatorInput("");
    } else if (value === "backspace") {
      setCalculatorInput((prev) => prev.slice(0, -1));
    } else if (value === "total") {
      setCalculatorInput(total.toString());
    } else {
      setCalculatorInput((prev) => prev + value);
    }
  };

  const handleCalculatorConfirm = () => {
    const inputAmount = parseFloat(calculatorInput);
    if (isNaN(inputAmount) || !currentPaymentMethod) {
      return;
    }
    setPaymentMethods((prev) => [
      ...prev,
      { method: currentPaymentMethod, amount: inputAmount },
    ]);
    setShowCalculator(false);
    setCalculatorInput("");
    setCurrentPaymentMethod(null);
  };

  const removePaymentMethod = (index: number) => {
    setPaymentMethods((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleCardPaymentMethodSelect = (method: string) => {
    setCurrentPaymentMethod(method);
    setShowPaymentMethodModal(false);
    setShowCalculator(true);
    setCalculatorInput("");
  };

  // ------------------------------------
  // 16) 割引アイテムの新規作成 (POST)
  // ------------------------------------
  const handleCreateDiscount = async () => {
    if (!session) return;
    try {
      const formData = new FormData();
      formData.append("name", discountName);
      formData.append("discount_value", discountValue.toString());
      formData.append("discount_type", discountType); // ← 新規追加

      // 画像をアップロードしたい場合は formData.append("image", file) 等を追加

      const response = await fetch("/api/discount-items", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error("割引アイテムの作成に失敗しました");
      }

      const createdItem = await response.json();
      // State に追加して更新
      setDiscountItems((prev) => [createdItem, ...prev]);
      setDiscountName("");
      setDiscountValue(0);
      setDiscountType("fixed"); // リセット
      alert("割引を登録しました");
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました");
    }
  };

  // ------------------------------------
  // 17) モーダル等の描画コンポーネント
  // ------------------------------------
  const renderPaymentMethodModal = () => (
    <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <CardContent className="bg-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">支払方法選択</h2>
        <div className="space-y-2">
          {["クレジットカード", "電子マネー", "ギフト券", "ポイント", "スマート支払い"].map(
            (method) => (
              <Button
                key={method}
                className="w-full justify-start"
                variant="outline"
                onClick={() => handleCardPaymentMethodSelect(method)}
              >
                {method}
              </Button>
            )
          )}
        </div>
        <Button
          className="w-full mt-4"
          variant="outline"
          onClick={() => setShowPaymentMethodModal(false)}
        >
          キャンセル
        </Button>
      </CardContent>
    </Card>
  );

  const renderCalculator = () => (
    <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <CardContent className="bg-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">金額入力</h2>
        <Input value={calculatorInput} readOnly className="mb-4" />
        <div className="grid grid-cols-3 gap-2">
          {[7, 8, 9, 4, 5, 6, 1, 2, 3, 0].map((num) => (
            <Button key={num} onClick={() => handleCalculatorInput(num.toString())}>
              {num}
            </Button>
          ))}
          <Button onClick={() => handleCalculatorInput("00")}>00</Button>
          <Button onClick={() => handleCalculatorInput("clear")}>C</Button>
          <Button onClick={() => handleCalculatorInput("backspace")}>←</Button>
        </div>
        <Button className="w-full mt-4" onClick={() => handleCalculatorInput("total")}>
          {total.toLocaleString()}
        </Button>
        <Button className="w-full mt-2" onClick={handleCalculatorConfirm}>
          確定
        </Button>
        <Button
          className="w-full mt-2"
          variant="outline"
          onClick={() => setShowCalculator(false)}
        >
          キャンセル
        </Button>
      </CardContent>
    </Card>
  );

  // ------------------------------------
  // 18) 会計セクションの描画
  // ------------------------------------
  const renderAccountingSection = () => {
    const totalPayment = paymentMethods.reduce((sum, pm) => sum + pm.amount, 0);
    const change = totalPayment - total;

    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="font-bold">現計:</span>
              <span className="font-bold">{total.toLocaleString()}円</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>（内消費税:</span>
              <span>{Math.floor(total * 0.1).toLocaleString()}円）</span>
            </div>

            <div className="space-y-2">
              {paymentMethods.map((pm, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span>
                    {pm.method}: {pm.amount.toLocaleString()}円
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePaymentMethod(index)}
                    className="hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handlePaymentMethodClick("現金")}>
                現金
              </Button>
              <Button variant="outline" onClick={() => handlePaymentMethodClick("カード・その他")}>
                カード・その他
              </Button>
            </div>

            {paymentMethods.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>支払い合計:</span>
                  <span className="font-bold">{totalPayment.toLocaleString()}円</span>
                </div>
                <div className="flex justify-between">
                  <span>お釣り:</span>
                  <span className="font-bold">{change.toLocaleString()}円</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>（内消費税:</span>
                  <span>{Math.floor(total * 0.1).toLocaleString()}円）</span>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <Button
                onClick={handleAccounting}
                disabled={totalPayment !== total}
                className="w-full"
              >
                会計
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ------------------------------------
  // 19) レンダリング
  // ------------------------------------
  if (authLoading) {
    return <div>認証状態を確認中...</div>;
  }
  if (!user) {
    return <div>認証に失敗しました。ページをリロードしてください。</div>;
  }

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">会計</h2>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* 顧客名やスタッフ選択 */}
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">{customerName || ""} 様</h3>
              <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                  <Label htmlFor="selectedStaff" className="mb-1">
                    指名スタッフ
                  </Label>
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger id="selectedStaff" className="w-[200px]">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((staff) => (
                        <SelectItem key={staff.id} value={staff.name}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col">
                  <Label htmlFor="selectedCashier" className="mb-1">
                    レジ担当者
                  </Label>
                  <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((staff) => (
                        <SelectItem key={staff.id} value={staff.name}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleTemporarySave}>一時保存</Button>
              </div>
            </div>

            {/* 選択済みアイテム一覧 */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-black font-bold">カテゴリ</TableHead>
                  <TableHead className="text-black font-bold">メニュー・店販・割引</TableHead>
                  <TableHead className="text-black font-bold">スタッフ</TableHead>
                  <TableHead className="text-black font-bold">単価</TableHead>
                  <TableHead className="text-black font-bold">個数</TableHead>
                  <TableHead className="text-black font-bold">金額</TableHead>
                  <TableHead className="text-black font-bold"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.staff}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, "price", Number(e.target.value))}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, "quantity", Number(e.target.value))
                        }
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>{(item.price * item.quantity).toLocaleString()}円</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                        <MinusIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* タブ: 施術 / 店販 / 割引 */}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <Tabs
                  defaultValue="treatment"
                  onValueChange={(tabValue) => {
                    if (tabValue === "treatment") {
                      if (treatmentCategories.length > 0) {
                        setSelectedCategory(treatmentCategories[0]);
                      } else {
                        setSelectedCategory("");
                      }
                    } else if (tabValue === "retail") {
                      if (retailCategories.length > 0) {
                        setSelectedCategory(retailCategories[0]);
                      } else {
                        setSelectedCategory("");
                      }
                    } else if (tabValue === "discount") {
                      // 割引タブ
                      setSelectedCategory("");
                    }
                  }}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="treatment" className="flex-1">
                      施術
                    </TabsTrigger>
                    <TabsTrigger value="retail" className="flex-1">
                      店販
                    </TabsTrigger>
                    <TabsTrigger value="discount" className="flex-1">
                      割引
                    </TabsTrigger>
                  </TabsList>

                  {/* 施術タブ */}
                  <TabsContent value="treatment">
                    <div className="space-y-4">
                      {/* カテゴリ一覧ボタン */}
                      <div className="flex flex-wrap gap-2">
                        {treatmentCategories.map((catName) => (
                          <Button
                            key={catName}
                            variant={catName === selectedCategory ? "default" : "outline"}
                            onClick={() => setSelectedCategory(catName)}
                            className={
                              catName === selectedCategory
                                ? "bg-primary text-primary-foreground"
                                : ""
                            }
                          >
                            {catName}
                          </Button>
                        ))}
                      </div>
                      {/* カテゴリに紐づく施術メニュー一覧 */}
                      <div className="space-y-2">
                        {treatmentItemsByCategory[selectedCategory]?.map((m) => (
                          <Button
                            key={m.id}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => addItem("施術", m.name, m.price)}
                          >
                            <PlusIcon className="mr-2 h-4 w-4" />
                            {m.name} （{m.price}円）
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* 店販タブ */}
                  <TabsContent value="retail">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {retailCategories.map((catName) => (
                          <Button
                            key={catName}
                            variant={catName === selectedCategory ? "default" : "outline"}
                            onClick={() => setSelectedCategory(catName)}
                            className={
                              catName === selectedCategory
                                ? "bg-primary text-primary-foreground"
                                : ""
                            }
                          >
                            {catName}
                          </Button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {retailItemsByCategory[selectedCategory]?.map((m) => (
                          <Button
                            key={m.id}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => addItem("店販", m.name, m.price)}
                          >
                            <PlusIcon className="mr-2 h-4 w-4" />
                            {m.name} （{m.price}円）
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* 割引タブ */}
                  <TabsContent value="discount">
                    <div className="space-y-4">
                      {/* 割引の新規作成フォーム */}
                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder="割引名"
                          value={discountName}
                          onChange={(e) => setDiscountName(e.target.value)}
                        />
                        <Input
                          placeholder="割引額 or 割引率(%)"
                          type="number"
                          className="w-24"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(Number(e.target.value))}
                        />

                        {/* 割引タイプを選択: fixed / fraction / percent */}
                        <Select value={discountType} onValueChange={(val) => setDiscountType(val as "fixed"|"fraction"|"percent")}>
                          <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="種類" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">固定割引</SelectItem>
                            
                            <SelectItem value="percent">％割引</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button onClick={handleCreateDiscount}>新規作成</Button>
                      </div>

                      {/* 登録済み割引一覧 */}
                      <div className="space-y-2">
                        {discountItems.map((d) => (
                          <div key={d.id} className="flex items-center space-x-2">
                            {/* 割引アイテム追加ボタン */}
                            <Button
                              variant="outline"
                              className="flex-1 justify-start"
                              onClick={() => addDiscountItem(d)}
                            >
                              <PlusIcon className="mr-2 h-4 w-4" />
                              {d.name} 
                              {d.discount_type === "percent"
                                ? `（${d.discount_value}%割引）`
                                : d.discount_type === "fraction"
                                ? ``
                                : `（ -${d.discount_value}円 ）`
                              }
                            </Button>

                            {/* 削除ボタン */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDiscountItem(d.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* 右側: 会計セクション */}
              <div>{renderAccountingSection()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 電卓 & カード支払いモーダル */}
      {showCalculator && renderCalculator()}
      {showPaymentMethodModal && renderPaymentMethodModal()}
    </div>
  );
};

export default AccountingPage;
