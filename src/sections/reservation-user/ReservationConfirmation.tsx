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
    calculateTotalAmount,
  } = useReservation();
  console.log("selectedMenus:", selectedMenus);
  // selectedMenus はすでに必要な情報を含んでいるため、
  // 追加のフィルタリングは不要です
  const totalPrice = calculateTotalAmount(selectedMenus);

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
                {selectedMenus
                  .map(
                    (item) => `${item.name} (¥${item.price.toLocaleString()})`
                  )
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
