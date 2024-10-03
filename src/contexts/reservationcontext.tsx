// contexts/reservationcontext.tsx

import React, { createContext, useContext, useState } from "react";

// 選択されたメニュー項目の型定義
interface SelectedMenuItem {
  id: string;
  name: string;
  price: number;
  duration: number;
}

// 選択されたスタッフの型定義
interface SelectedStaff {
  id: string;
  name: string;
}

// 予約日時の型定義（開始時間と終了時間）
export interface SelectedDateTime {
  start: Date;
  end: Date;
}

// 更新された顧客情報の型定義
export interface CustomerInfo {
  lastNameKana: string;
  firstNameKana: string;
  lastNameKanji: string;
  firstNameKanji: string;
  email: string;
  phone: string;
  [key: string]: string;
}

// PaymentInfo の型定義
export interface PaymentInfo {
  method: string;
  status: string;
  stripePaymentIntentId: string;
  amount: number;
  reservationId?: string; // オプションフィールドとして追加
}

// 予約コンテキストの型定義
interface ReservationContextType {
  selectedMenus: SelectedMenuItem[];
  setSelectedMenus: React.Dispatch<React.SetStateAction<SelectedMenuItem[]>>;
  selectedDateTime: SelectedDateTime | null;
  setSelectedDateTime: React.Dispatch<React.SetStateAction<SelectedDateTime | null>>;
  selectedStaff: SelectedStaff | null;
  setSelectedStaff: React.Dispatch<React.SetStateAction<SelectedStaff | null>>;
  customerInfo: CustomerInfo;
  setCustomerInfo: React.Dispatch<React.SetStateAction<CustomerInfo>>;
  calculateTotalAmount: (menus: SelectedMenuItem[]) => number;
  paymentInfo: PaymentInfo | null;
  setPaymentInfo: React.Dispatch<React.SetStateAction<PaymentInfo | null>>;
}

// 予約コンテキストの作成
const ReservationContext = createContext<ReservationContextType | undefined>(undefined);

// 予約プロバイダーコンポーネント
export const ReservationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 各種状態の初期化
  const [selectedMenus, setSelectedMenus] = useState<SelectedMenuItem[]>([]);
  const [selectedDateTime, setSelectedDateTime] = useState<SelectedDateTime | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<SelectedStaff | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    lastNameKana: "",
    firstNameKana: "",
    lastNameKanji: "",
    firstNameKanji: "",
    email: "",
    phone: "",
  });

  // 合計金額の計算関数
  const calculateTotalAmount = (menus: SelectedMenuItem[]) => {
    return menus.reduce((total, menu) => total + menu.price, 0);
  };

  // コンテキスト値の提供
  return (
    <ReservationContext.Provider
      value={{
        selectedMenus,
        setSelectedMenus,
        selectedDateTime,
        setSelectedDateTime,
        selectedStaff,
        setSelectedStaff,
        customerInfo,
        setCustomerInfo,
        paymentInfo,
        setPaymentInfo,
        calculateTotalAmount,
      }}
    >
      {children}
    </ReservationContext.Provider>
  );
};

// カスタムフック: 予約コンテキストの使用
export const useReservation = () => {
  const context = useContext(ReservationContext);
  if (context === undefined) {
    throw new Error("useReservation must be used within a ReservationProvider");
  }
  return context;
};
