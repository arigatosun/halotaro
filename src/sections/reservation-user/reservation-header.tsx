import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface ReservationHeaderProps {
  currentStep: number;
}

const steps = [
  "メニュー・クーポン選択",
  "スタッフ選択",
  "日時選択",
  "お客様情報入力",
  "予約内容確認",
  "予約完了",
];

export default function ReservationHeader({ currentStep }: ReservationHeaderProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <h1 className="text-2xl font-bold mb-4">HOOD BARBER</h1>
        <div className="hidden md:flex justify-between items-center">
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
              <span>{step}</span>
            </div>
          ))}
        </div>
        <div className="md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center mr-2">
                {currentStep + 1}
              </div>
              <span className="font-bold">{steps[currentStep]}</span>
            </div>
            <div className="text-gray-400">
              {currentStep + 1} / {steps.length}
            </div>
          </div>
          {currentStep < steps.length - 1 && (
            <div className="mt-2 text-sm text-gray-400 flex items-center">
              次のステップ: {steps[currentStep + 1]}
              <ChevronRight className="ml-1 w-4 h-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}