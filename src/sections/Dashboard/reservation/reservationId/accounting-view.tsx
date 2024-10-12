// accounting-view.tsx
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
import { PlusIcon, MinusIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

// Item interface
interface Item {
  id: string;
  category: string; // 「施術」、「店販」、「割引・サービス・オプション」
  name: string;
  staff: string;
  price: number;
  quantity: number;
}

// MenuItem interface
interface MenuItem {
  id: number;
  user_id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  duration: number;
  is_reservable: boolean;
  created_at: string;
  updated_at: string;
  image_url: string | null;
}

// Staff interface
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

// ReservationCustomer interface
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

// Reservation interface
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
  scraped_customer: string | null;
  scraped_menu: string | null;
  coupon_id: string | null;
  is_staff_schedule: boolean | null;
  event: string | null;
  menu_items: MenuItem | null;
  staff: Staff | null;
  reservation_customers: ReservationCustomer | null; // 修正: 配列から単一オブジェクトに変更
}

interface AccountingPageProps {
  reservationId: string;
}

// 店販のカテゴリーとアイテムを定義
const retailCategories = [
  "シャンプー",
  "トリートメント",
  "スタイリング",
  "ヘアケア",
  "ボディケア",
];

// retailItemsをRecord<string, string[]>として定義
const retailItems: Record<string, string[]> = {
  シャンプー: [
    "モイストシャンプー",
    "ボリュームシャンプー",
    "スカルプシャンプー",
  ],
  トリートメント: [
    "モイストトリートメント",
    "ダメージケアトリートメント",
    "カラーケアトリートメント",
  ],
  スタイリング: ["ヘアオイル", "ヘアワックス", "ヘアスプレー"],
  ヘアケア: ["頭皮ケアローション", "育毛剤", "ヘアパック"],
  ボディケア: ["ボディクリーム", "ボディオイル", "ハンドクリーム"],
};

export const AccountingPage: React.FC<AccountingPageProps> = ({
  reservationId,
}) => {
  const { user, session, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedCashier, setSelectedCashier] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // 複数の支払い方法を管理するためのステート
  const [paymentMethods, setPaymentMethods] = useState<
    { method: string; amount: number }[]
  >([]);

  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorInput, setCalculatorInput] = useState("");
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<string | null>(
    null
  );
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);

  const [treatmentCategories, setTreatmentCategories] = useState<string[]>([]);
  const [treatmentItemsByCategory, setTreatmentItemsByCategory] = useState<{
    [category: string]: MenuItem[];
  }>({});

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const router = useRouter();

  const userId = user?.id;

  // フラグを設定して一度だけフェッチする
  const fetchReservationRef = useRef<boolean>(false);
  const fetchStaffRef = useRef<boolean>(false);
  const fetchMenuItemsRef = useRef<boolean>(false);
  const fetchTemporarySaveRef = useRef<boolean>(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) {
      // ユーザーがログインしていない場合の処理
      return;
    }

    if (fetchReservationRef.current) return; // 既にフェッチ済みの場合は実行しない
    fetchReservationRef.current = true;

    const fetchReservation = async () => {
      if (!reservationId || !userId || !session.access_token) return;

      try {
        const response = await fetch(`/api/reservations/${reservationId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error("予約情報の取得に失敗しました");
        }

        const data: { reservation: Reservation; accountingData?: any } = await response.json();
        setReservation(data.reservation);

        if (data.reservation.reservation_customers) {
          setCustomerName(data.reservation.reservation_customers.name);
        } else {
          setCustomerName("不明");
        }

        if (data.reservation.menu_items) {
          const menuItem: MenuItem = data.reservation.menu_items;
          const newItem: Item = {
            id: menuItem.id.toString(),
            category: "施術",
            name: menuItem.name,
            staff: data.reservation.staff?.name || selectedStaff,
            price: menuItem.price,
            quantity: 1,
          };
          setItems([newItem]);
        }

        if (data.reservation.staff) {
          setSelectedStaff(data.reservation.staff.name);
          setSelectedCashier(data.reservation.staff.name);
        }

        // 一時保存データが存在する場合は設定
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

    fetchReservation();
  }, [user, session, authLoading, reservationId, userId, selectedStaff]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) {
      // ユーザーがログインしていない場合の処理
      return;
    }

    if (fetchStaffRef.current) return; // 既にフェッチ済みの場合は実行しない
    fetchStaffRef.current = true;

    const fetchStaff = async () => {
      if (!userId || !session.access_token) return;

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

        if (data.length > 0 && !selectedStaff) {
          setSelectedStaff(data[0].name);
          setSelectedCashier(data[0].name);
        }
      } catch (error) {
        console.error("スタッフ情報の取得エラー:", error);
      }
    };

    fetchStaff();
  }, [user, session, authLoading, userId, selectedStaff]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) {
      // ユーザーがログインしていない場合の処理
      return;
    }

    if (fetchMenuItemsRef.current) return; // 既にフェッチ済みの場合は実行しない
    fetchMenuItemsRef.current = true;

    const fetchMenuItems = async () => {
      if (!userId || !session.access_token) return;

      try {
        const response = await fetch("/api/menu-items", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error("メニュー項目の取得に失敗しました");
        }

        const data: MenuItem[] = await response.json();

        const userMenuItems = data.filter((item) => item.user_id === userId);

        const categories = Array.from(
          new Set(userMenuItems.map((item) => item.category))
        ) as string[];
        setTreatmentCategories(categories);

        if (categories.length > 0 && !selectedCategory) {
          setSelectedCategory(categories[0]);
        }

        const itemsByCategory: { [category: string]: MenuItem[] } = {};
        userMenuItems.forEach((item) => {
          if (!itemsByCategory[item.category]) {
            itemsByCategory[item.category] = [];
          }
          itemsByCategory[item.category].push(item);
        });
        setTreatmentItemsByCategory(itemsByCategory);
      } catch (error) {
        console.error("メニュー項目の取得エラー:", error);
      }
    };

    fetchMenuItems();
  }, [user, session, authLoading, userId, selectedCategory]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) {
      // ユーザーがログインしていない場合の処理
      return;
    }

    if (fetchTemporarySaveRef.current) return; // 既にフェッチ済みの場合は実行しない
    fetchTemporarySaveRef.current = true;

    const fetchTemporarySave = async () => {
      if (!reservationId || !userId || !session.access_token) return;

      try {
        const response = await fetch(`/api/accounting?reservationId=${reservationId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

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

    fetchTemporarySave();
  }, [user, session, authLoading, reservationId, userId]);

  useEffect(() => {
    const newTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    setTotal(newTotal);
  }, [items]);

  const addItem = (category: string, name: string, price: number = 0) => {
    const newItem: Item = {
      id: Date.now().toString(),
      category,
      name,
      staff: selectedStaff,
      price,
      quantity: 1,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof Item, value: any) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleAccounting = async () => {
    try {
      // 支払い総額の計算
      const totalPayment = paymentMethods.reduce(
        (sum, method) => sum + method.amount,
        0
      );

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
        payment_methods: paymentMethods, // JSONB形式で送信
        total_price: total,
        isTemporary: false, // 最終会計
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

      // 予約ステータスを "paid" に更新
      await updateReservationStatus(reservationId, "paid");

      // 状態のリセット
      setItems([]);
      setTotal(0);
      setPaymentMethods([]);
      setSelectedCashier("");

      // 会計完了後に成功メッセージを表示
      alert("会計が完了しました。");

      // ダッシュボードの予約一覧にリダイレクト
      router.push("/dashboard/reservations/list");
    } catch (error: any) {
      console.error("会計情報の保存エラー:", error.message || error);
      alert(`エラー: ${error.message || "会計情報の保存に失敗しました"}`);
    }
  };

  const handleTemporarySave = async () => {
    try {
      const accountingData = {
        reservationId,
        customer_name: customerName,
        items,
        staff_name: selectedStaff,
        cashier_name: selectedCashier,
        payment_methods: paymentMethods, // JSONB形式で送信
        total_price: total,
        isTemporary: true, // 一時保存
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

  const updateReservationStatus = async (
    reservationId: string,
    status: string
  ) => {
    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        // レスポンスがJSONでない場合のエラーハンドリング
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error("サーバーから予期しないレスポンスを受け取りました");
        }
        throw new Error(
          errorData.error || "予約ステータスの更新に失敗しました"
        );
      }
    } catch (error: any) {
      console.error("予約ステータスの更新エラー:", error.message || error);
      throw error; // エラーを再スローして handleAccounting でキャッチ
    }
  };

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
    setPaymentMethods([
      ...paymentMethods,
      { method: currentPaymentMethod, amount: inputAmount },
    ]);
    setShowCalculator(false);
    setCalculatorInput("");
    setCurrentPaymentMethod(null);
  };

  const removePaymentMethod = (index: number) => {
    const updatedMethods = [...paymentMethods];
    updatedMethods.splice(index, 1);
    setPaymentMethods(updatedMethods);
  };

  const renderPaymentMethodModal = () => (
    <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <CardContent className="bg-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">支払方法選択</h2>
        <div className="space-y-2">
          {[
            "クレジットカード",
            "電子マネー",
            "ギフト券",
            "ポイント",
            "スマート支払い",
          ].map((method) => (
            <Button
              key={method}
              className="w-full justify-start"
              variant="outline"
              onClick={() => handleCardPaymentMethodSelect(method)}
            >
              {method}
            </Button>
          ))}
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

  const handleCardPaymentMethodSelect = (method: string) => {
    setCurrentPaymentMethod(method);
    setShowPaymentMethodModal(false);
    setShowCalculator(true);
    setCalculatorInput("");
  };

  const renderCalculator = () => (
    <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <CardContent className="bg-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">金額入力</h2>
        <Input value={calculatorInput} readOnly className="mb-4" />
        <div className="grid grid-cols-3 gap-2">
          {[7, 8, 9, 4, 5, 6, 1, 2, 3, 0].map((num) => (
            <Button
              key={num}
              onClick={() => handleCalculatorInput(num.toString())}
            >
              {num}
            </Button>
          ))}
          <Button onClick={() => handleCalculatorInput("00")}>00</Button>
          <Button onClick={() => handleCalculatorInput("clear")}>C</Button>
          <Button onClick={() => handleCalculatorInput("backspace")}>←</Button>
        </div>
        <Button
          className="w-full mt-4"
          onClick={() => handleCalculatorInput("total")}
        >
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

  const renderAccountingSection = () => {
    // お釣りの計算
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
            {/* 支払い方法と金額の一覧を表示 */}
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
            {/* 支払い方法の選択ボタン */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => handlePaymentMethodClick("現金")}
              >
                現金
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePaymentMethodClick("カード・その他")}
              >
                カード・その他
              </Button>
            </div>
            {/* 支払い方法の合計表示とバリデーション */}
            <div className="space-y-2">
              {paymentMethods.length > 0 && (
                <>
                  <div className="flex justify-between">
                    <span>支払い合計:</span>
                    <span className="font-bold">
                      {totalPayment.toLocaleString()}円
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>お釣り:</span>
                    <span className="font-bold">
                      {change.toLocaleString()}円
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>（内消費税:</span>
                    <span>{Math.floor(total * 0.1).toLocaleString()}円）</span>
                  </div>
                </>
              )}
            </div>
            {/* 会計ボタン */}
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
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">
                {customerName || ""} 様
              </h3>
              <div className="flex items-center space-x-4">
                {/* 指名スタッフ */}
                <div className="flex flex-col">
                  <Label htmlFor="selectedStaff" className="mb-1">
                    指名スタッフ
                  </Label>
                  <Select
                    value={selectedStaff}
                    onValueChange={setSelectedStaff}
                  >
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
                {/* レジ担当者 */}
                <div className="flex flex-col">
                  <Label htmlFor="selectedCashier" className="mb-1">
                    レジ担当者
                  </Label>
                  <Select
                    value={selectedCashier}
                    onValueChange={setSelectedCashier}
                  >
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
                {/* 一時保存ボタン */}
                <Button onClick={handleTemporarySave}>一時保存</Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-black font-bold">カテゴリ</TableHead>
                  <TableHead className="text-black font-bold">
                    メニュー・店販・割引・サービス・オプション
                  </TableHead>
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
                        onChange={(e) =>
                          updateItem(item.id, "price", Number(e.target.value))
                        }
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "quantity",
                            Number(e.target.value)
                          )
                        }
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      {(item.price * item.quantity).toLocaleString()}円
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                      >
                        <MinusIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <Tabs defaultValue="treatment">
                  <TabsList className="w-full">
                    <TabsTrigger value="treatment" className="flex-1">
                      施術
                    </TabsTrigger>
                    <TabsTrigger value="retail" className="flex-1">
                      店販
                    </TabsTrigger>
                    {/*<TabsTrigger value="discount" className="flex-1">
                      //{/* 割引・サービス・オプション
                    </TabsTrigger>*/}
                  </TabsList>
                  <TabsContent value="treatment">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {treatmentCategories.map((category) => (
                          <Button
                            key={category}
                            variant={
                              category === selectedCategory ? "default" : "outline"
                            }
                            onClick={() => setSelectedCategory(category)}
                            className={
                              category === selectedCategory
                                ? "bg-primary text-primary-foreground"
                                : ""
                            }
                          >
                            {category}
                          </Button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {treatmentItemsByCategory[selectedCategory]?.map(
                          (item: MenuItem) => (
                            <Button
                              key={item.id}
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() =>
                                addItem("施術", item.name, item.price)
                              }
                            >
                              <PlusIcon className="mr-2 h-4 w-4" />
                              {item.name}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="retail">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {retailCategories.map((category) => (
                          <Button
                            key={category}
                            variant={
                              category === selectedCategory ? "default" : "outline"
                            }
                            onClick={() => setSelectedCategory(category)}
                            className={
                              category === selectedCategory
                                ? "bg-primary text-primary-foreground"
                                : ""
                            }
                          >
                            {category}
                          </Button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {retailItems[selectedCategory]?.map((item: string) => (
                          <Button
                            key={item}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => addItem("店販", item, 0)}
                          >
                            <PlusIcon className="mr-2 h-4 w-4" />
                            {item}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="discount">
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() =>
                          addItem("割引・サービス・オプション", "初回割引", 0)
                        }
                      >
                        <PlusIcon className="mr-2 h-4 w-4" />
                        初回割引
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() =>
                          addItem(
                            "割引・サービス・オプション",
                            "ポイントサービス",
                            0
                          )
                        }
                      >
                        <PlusIcon className="mr-2 h-4 w-4" />
                        ポイントサービス
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              <div>{renderAccountingSection()}</div>
            </div>
          </div>
        </CardContent>
      </Card>
      {showCalculator && renderCalculator()}
      {showPaymentMethodModal && renderPaymentMethodModal()}
    </div>
  );
};

export default AccountingPage;
