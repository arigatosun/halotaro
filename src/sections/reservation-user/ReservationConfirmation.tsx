import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useReservation } from "@/contexts/reservationcontext";
import { useAuth } from "@/lib/authContext";
import { Separator } from "@/components/ui/separator";
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ScissorsIcon,
  CreditCardIcon,
  MailIcon,
  PhoneIcon,
  Info,
} from "lucide-react";

interface ReservationConfirmationProps {
  onNext: () => void;
  onBack: () => void;
}

interface CancelPolicy {
  id: string;
  days: number;
  feePercentage: number;
}

interface PoliciesData {
  policies: CancelPolicy[];
  customText: string;
}

export default function ReservationConfirmation({
  onNext,
  onBack,
}: ReservationConfirmationProps) {
  const {
    selectedMenus,
    selectedDateTime,
    selectedStaff,
    customerInfo,
    calculateTotalAmount,
  } = useReservation();
  const { user } = useAuth();

  const totalPrice = calculateTotalAmount(selectedMenus);

  const [policiesData, setPoliciesData] = useState<PoliciesData>({
    policies: [],
    customText: "",
  });
  const [loadingPolicies, setLoadingPolicies] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchPolicies = async () => {
      try {
        const response = await fetch(`/api/cancel-policies?userId=${user.id}`);
        const data = await response.json();
        if (data.policies) {
          // data.policies は { policies: [...], customText: "..." }の形
          const fetchedPolicies = data.policies.policies || [];
          const fetchedCustomText = data.policies.customText || "";
          setPoliciesData({
            policies: fetchedPolicies,
            customText: fetchedCustomText,
          });
        }
      } catch (error) {
        console.error("キャンセルポリシー取得エラー:", error);
      } finally {
        setLoadingPolicies(false);
      }
    };
    fetchPolicies();
  }, [user]);

  const formatDate = (date: Date) => {
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "long",
    });
  };

  const getFullName = (kanji: boolean) => {
    if (kanji) {
      return `${customerInfo.lastNameKanji} ${customerInfo.firstNameKanji}`;
    } else {
      return `${customerInfo.lastNameKana} ${customerInfo.firstNameKana}`;
    }
  };

  // ポリシーが未設定の場合のデフォルト文面生成
  const generatePolicyText = (policies: CancelPolicy[]) => {
    if (policies.length === 0) {
      return "キャンセルポリシー:\n・キャンセルポリシーは設定されていません。";
    }

    const sortedPolicies = [...policies].sort((a, b) => b.days - a.days);
    let policyText = "キャンセルポリシー:\n";
    sortedPolicies.forEach((policy, index) => {
      if (index === 0) {
        policyText += `・予約日の${policy.days}日前から${policy.feePercentage}%のキャンセル料が発生します。\n`;
      } else {
        policyText += `・予約日の${policy.days}日前から${policy.feePercentage}%のキャンセル料となります。\n`;
      }
    });
    policyText += "・上記以前のキャンセルは全額返金されます。";
    return policyText;
  };

  const displayPolicyText =
    policiesData.customText.trim() === ""
      ? generatePolicyText(policiesData.policies)
      : policiesData.customText;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          予約内容の確認
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <ScissorsIcon className="w-5 h-5 mt-1 text-primary" />
            <div className="flex-1">
              <h3 className="font-semibold">選択したメニュー</h3>
              <ul className="list-disc list-inside">
                {selectedMenus.map((item, index) => (
                  <li key={index}>
                    {item.name}{" "}
                    <span className="text-primary">
                      ¥{item.price.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Separator />
          <div className="flex items-start space-x-3">
            <CalendarIcon className="w-5 h-5 mt-1 text-primary" />
            <div>
              <h3 className="font-semibold">予約日時</h3>
              <p>
                {selectedDateTime
                  ? formatDate(selectedDateTime.start)
                  : "日時未選択"}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <ClockIcon className="w-5 h-5 mt-1 text-primary" />
            <div>
              <h3 className="font-semibold">予約時間</h3>
              <p>
                {selectedDateTime
                  ? `${selectedDateTime.start.toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} - ${selectedDateTime.end.toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "時間未選択"}
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-start space-x-3">
            <UserIcon className="w-5 h-5 mt-1 text-primary" />
            <div>
              <h3 className="font-semibold">担当スタッフ</h3>
              <p>{selectedStaff ? selectedStaff.name : "指定なし"}</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <h3 className="font-semibold">お客様情報</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <UserIcon className="w-4 h-4 text-primary" />
                <p>{getFullName(true)}</p>
              </div>
              <div className="flex items-center space-x-2">
                <UserIcon className="w-4 h-4 text-primary" />
                <p>{getFullName(false)}</p>
              </div>
              <div className="flex items-center space-x-2">
                <MailIcon className="w-4 h-4 text-primary" />
                <p>{customerInfo.email}</p>
              </div>
              <div className="flex items-center space-x-2">
                <PhoneIcon className="w-4 h-4 text-primary" />
                <p>{customerInfo.phone}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* キャンセルポリシー表示部 */}
          {!loadingPolicies && (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center space-x-2">
                <Info className="w-4 h-4 text-primary" />
                <span>キャンセルポリシー</span>
              </h3>
              <pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded text-sm">
                {displayPolicyText}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <CreditCardIcon className="w-5 h-5 text-primary" />
          <span className="text-lg font-semibold">合計金額: </span>
          <span className="text-2xl font-bold text-primary">
            ¥{totalPrice.toLocaleString()}
          </span>
        </div>
        <div className="flex space-x-4">
          <Button onClick={onBack} variant="outline">
            戻る
          </Button>
          <Button onClick={onNext}>事前決済する</Button>
        </div>
      </CardFooter>
    </Card>
  );
}
