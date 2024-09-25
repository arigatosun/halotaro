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

  const isFormValid = () => {
    return (
      customerInfo.lastNameKana &&
      customerInfo.firstNameKana &&
      customerInfo.lastNameKanji &&
      customerInfo.firstNameKanji &&
      customerInfo.email &&
      customerInfo.phone
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">お客様情報を入力してください</h2>
      <div className="space-y-4">
        <div className="flex space-x-4">
          <Input
            name="lastNameKana"
            placeholder="姓 (カナ)"
            value={customerInfo.lastNameKana || ""}
            onChange={handleInputChange}
          />
          <Input
            name="firstNameKana"
            placeholder="名 (カナ)"
            value={customerInfo.firstNameKana || ""}
            onChange={handleInputChange}
          />
        </div>
        <div className="flex space-x-4">
          <Input
            name="lastNameKanji"
            placeholder="姓 (漢字)"
            value={customerInfo.lastNameKanji || ""}
            onChange={handleInputChange}
          />
          <Input
            name="firstNameKanji"
            placeholder="名 (漢字)"
            value={customerInfo.firstNameKanji || ""}
            onChange={handleInputChange}
          />
        </div>
        <Input
          name="email"
          type="email"
          placeholder="メールアドレス"
          value={customerInfo.email || ""}
          onChange={handleInputChange}
        />
        <Input
          name="phone"
          type="tel"
          placeholder="電話番号"
          value={customerInfo.phone || ""}
          onChange={handleInputChange}
        />
      </div>
      <div className="space-x-4">
        <Button onClick={onBack} variant="outline">
          戻る
        </Button>
        <Button
          onClick={onNext}
          disabled={!isFormValid()}
        >
          次へ
        </Button>
      </div>
    </div>
  );
};

export default CustomerInfo;