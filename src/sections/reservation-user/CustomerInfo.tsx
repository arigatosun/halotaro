import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReservation } from "@/contexts/reservationcontext";

interface CustomerInfoProps {
  onNext: () => void;
  onBack: () => void;
}

const CustomerInfo: React.FC<CustomerInfoProps> = ({ onNext, onBack }) => {
  const { customerInfo, setCustomerInfo } = useReservation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerInfo((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">お客様情報を入力してください</h2>
      <div className="space-y-4">
        <Input
          name="name"
          placeholder="お名前"
          value={customerInfo.name}
          onChange={handleInputChange}
        />
        <Input
          name="email"
          type="email"
          placeholder="メールアドレス"
          value={customerInfo.email}
          onChange={handleInputChange}
        />
        <Input
          name="phone"
          type="tel"
          placeholder="電話番号"
          value={customerInfo.phone}
          onChange={handleInputChange}
        />
      </div>
      <div className="space-x-4">
        <Button onClick={onBack} variant="outline">
          戻る
        </Button>
        <Button
          onClick={onNext}
          disabled={
            !customerInfo.name || !customerInfo.email || !customerInfo.phone
          }
        >
          次へ
        </Button>
      </div>
    </div>
  );
};

export default CustomerInfo;
