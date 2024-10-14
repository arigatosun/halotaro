import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface ReservationHeaderProps {
  currentStep: number;
  userId: string;
}

const steps = [
  "メニュー・クーポン選択",
  "スタッフ選択",
  "日時選択",
  "お客様情報入力",
  "事前決済",
  "予約完了",
];

export default function Component({ currentStep, userId }: ReservationHeaderProps) {
  const [salonData, setSalonData] = useState<{
    salon_name: string;
    address: string;
    main_image_url: string;
  } | null>(null);

  useEffect(() => {
    const fetchSalonData = async () => {
      const { data, error } = await supabase
        .from("salons")
        .select("salon_name, address, main_image_url")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("サロン情報の取得中にエラーが発生しました:", error);
      } else {
        setSalonData(data);
      }
    };

    fetchSalonData();
  }, [userId]);

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <h1 className="text-2xl font-bold mb-2">
          {salonData?.salon_name || "サロン名"}
        </h1>
        <p className="text-gray-600 mb-4">{salonData?.address || "住所"}</p>
        {/* 画像をモバイル画面のみ表示 */}
        {salonData?.main_image_url && (
          <div className="md:hidden">
            <img
              src={salonData.main_image_url}
              alt={salonData.salon_name}
              className="mb-4 w-full h-auto object-cover rounded"
            />
          </div>
        )}
        {/* ステップナビゲーション（デスクトップ表示） */}
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
        {/* モバイル表示 */}
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