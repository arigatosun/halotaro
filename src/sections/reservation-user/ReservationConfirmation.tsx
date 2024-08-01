import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReservation } from "@/contexts/reservationcontext";

interface ReservationConfirmationProps {
  onNext: () => void;
  onBack: () => void;
}

const ReservationConfirmation: React.FC<ReservationConfirmationProps> = ({
  onNext,
  onBack,
}) => {
  const {
    selectedMenus,
    selectedDate,
    selectedTime,
    selectedStaff,
    customerInfo,
  } = useReservation();

  // この部分は実際のメニューデータと連携する必要があります
  const menuItems = [
    { id: "1", name: "カット", price: 5000 },
    { id: "2", name: "カラー", price: 8000 },
    // ...
  ];

  const selectedMenuItems = menuItems.filter((item) =>
    selectedMenus.includes(item.id)
  );
  const totalPrice = selectedMenuItems.reduce(
    (sum, item) => sum + item.price,
    0
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">予約内容の確認</h2>
      <Card>
        <CardHeader>
          <CardTitle>予約詳細</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div>
              <dt className="font-semibold">選択したメニュー:</dt>
              <dd>
                {selectedMenuItems
                  .map((item) => `${item.name} (¥${item.price})`)
                  .join(", ")}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">予約日時:</dt>
              <dd>
                {selectedDate?.toLocaleDateString()} {selectedTime}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">担当スタッフ:</dt>
              <dd>{selectedStaff}</dd>
            </div>
            <div>
              <dt className="font-semibold">お客様情報:</dt>
              <dd>
                {customerInfo.name} - {customerInfo.email} -{" "}
                {customerInfo.phone}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">合計金額:</dt>
              <dd>¥{totalPrice.toLocaleString()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <div className="space-x-4">
        <Button onClick={onBack} variant="outline">
          戻る
        </Button>
        <Button onClick={onNext}>予約を確定する</Button>
      </div>
    </div>
  );
};

export default ReservationConfirmation;
