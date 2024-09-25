import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReservation } from "@/contexts/reservationcontext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface CustomerInfoProps {
  onNext: () => void;
  onBack: () => void;
}

export default function CustomerInfo({ onNext, onBack }: CustomerInfoProps) {
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">お客様情報入力</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lastNameKana">姓 (カナ)</Label>
                <Input
                  id="lastNameKana"
                  name="lastNameKana"
                  placeholder="ヤマダ"
                  value={customerInfo.lastNameKana || ""}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstNameKana">名 (カナ)</Label>
                <Input
                  id="firstNameKana"
                  name="firstNameKana"
                  placeholder="タロウ"
                  value={customerInfo.firstNameKana || ""}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lastNameKanji">姓 (漢字)</Label>
                <Input
                  id="lastNameKanji"
                  name="lastNameKanji"
                  placeholder="山田"
                  value={customerInfo.lastNameKanji || ""}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstNameKanji">名 (漢字)</Label>
                <Input
                  id="firstNameKanji"
                  name="firstNameKanji"
                  placeholder="太郎"
                  value={customerInfo.firstNameKanji || ""}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@example.com"
                value={customerInfo.email || ""}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="090-1234-5678"
                value={customerInfo.phone || ""}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          戻る
        </Button>
        <Button
          onClick={onNext}
          disabled={!isFormValid()}
        >
          次へ
        </Button>
      </CardFooter>
    </Card>
  );
}