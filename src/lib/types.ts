// lib/types.ts

/**
 * 顧客の基本情報
 */
export interface CustomerInfo {
  lastNameKana: string;
  firstNameKana: string;
  lastNameKanji: string;
  firstNameKanji: string;
  email: string;
  phone: string;
}

/**
 * 決済情報
 */
export interface PaymentInfo {
  method: string; // 例: "credit_card"
  status: string; // 例: "requires_capture"
  stripePaymentIntentId?: string; // 例: "pi_XXXXXX"
  amount: number;
  isOver30Days?: boolean; // trueなら、予約日まで30日以上
}

/**
 * create-reservation API のリクエストボディ
 */
export interface CreateReservationBody {
  userId: string;
  menuId: string; // 数値文字列 or クーポンUUID
  staffId: string;
  startTime: string; // ISO形式の日時文字列
  endTime: string; // ISO形式の日時文字列
  totalPrice: number;
  customerInfo: CustomerInfo;
  paymentInfo: PaymentInfo;
  paymentMethodId?: string; // 任意
  customerEmail?: string; // 任意
}
