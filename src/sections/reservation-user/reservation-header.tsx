import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface ReservationHeaderProps {
  currentStep: number;
}

const steps = [
  "クーポン・メニューを選択",
  "日時を指定する",
  "お客様情報入力",
  "予約内容の確認",
  "予約完了",
];

const ReservationHeader: React.FC<ReservationHeaderProps> = ({
  currentStep,
}) => {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <h1 className="text-2xl font-bold mb-4">HOOD BARBER</h1>
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center ${
                index === currentStep
                  ? "text-orange-500 font-bold"
                  : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                  index === currentStep
                    ? "bg-orange-500 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {index + 1}
              </div>
              <span className="hidden md:inline">{step}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReservationHeader;
