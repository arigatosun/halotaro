"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Copy, Check, Trash2, Plus, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/authcontext";

interface CancelPolicy {
  id: string;
  days: number;
  feePercentage: number;
}

interface ReservationMessage {
  id: string;
  days: number;
  message: string;
}

const BasicInfoSettingsView: React.FC = () => {
  const { user } = useAuth();
  const [reservationUrl, setReservationUrl] = useState("");
  const [isCustomDomainEnabled, setIsCustomDomainEnabled] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isReservationEnabled, setIsReservationEnabled] = useState(true);
  const [cancelPolicies, setCancelPolicies] = useState<CancelPolicy[]>([]);
  const [cancelPolicyText, setCancelPolicyText] = useState("");
  const [reservationMessages, setReservationMessages] = useState<
    ReservationMessage[]
  >([]);

  useEffect(() => {
    if (user) {
      setReservationUrl(`https://harotalo.com/reservation-user/${user.id}`);
      fetchCancelPolicies(user.id);
      fetchReservationMessages(user.id);
    }
  }, [user]);

  const fetchCancelPolicies = async (userId: string) => {
    try {
      const response = await fetch(`/api/cancel-policies?userId=${userId}`);
      const data = await response.json();
      // data.policiesが { policies: [...], customText: ... } の構造を想定
      const policiesArray = data?.policies?.policies || [];
      const customText = data?.policies?.customText || "";

      setCancelPolicies(policiesArray);
      setCancelPolicyText(customText);
    } catch (error) {
      console.error("キャンセルポリシーの取得に失敗しました:", error);
    }
  };

  const fetchReservationMessages = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/reservation-messages?userId=${userId}`
      );
      const data = await response.json();
      if (data.messages) {
        setReservationMessages(data.messages);
      }
    } catch (error) {
      console.error("予約メッセージの取得に失敗しました:", error);
    }
  };

  const saveCancelPolicies = async () => {
    if (!user) return;

    try {
      // DBに保存する際、customTextも一緒に送る
      const response = await fetch("/api/cancel-policies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          // DB側では { policies: [...], customText: "..."} という形で保持
          policies: {
            policies: cancelPolicies,
            customText: cancelPolicyText,
          },
        }),
      });

      if (!response.ok) {
        console.error("キャンセルポリシーの保存に失敗しました");
      }
    } catch (error) {
      console.error("キャンセルポリシーの保存中にエラーが発生しました:", error);
    }
  };

  const saveReservationMessages = async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/reservation-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          messages: reservationMessages,
        }),
      });

      if (!response.ok) {
        console.error("予約メッセージの保存に失敗しました");
      }
    } catch (error) {
      console.error("予約メッセージの保存中にエラーが発生しました:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCancelPolicies();
    await saveReservationMessages();
    console.log("基本情報を保存:", {
      reservationUrl,
      isCustomDomainEnabled,
      isReservationEnabled,
      cancelPolicies,
      cancelPolicyText,
      reservationMessages,
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reservationUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const addCancelPolicy = () => {
    const newPolicies = [
      ...cancelPolicies,
      { id: Date.now().toString(), days: 0, feePercentage: 0 },
    ];
    setCancelPolicies(newPolicies);
  };

  const updateCancelPolicy = (
    id: string,
    field: "days" | "feePercentage",
    value: number
  ) => {
    const newPolicies = cancelPolicies.map((policy) =>
      policy.id === id ? { ...policy, [field]: value } : policy
    );
    setCancelPolicies(newPolicies);
  };

  const removeCancelPolicy = (id: string) => {
    const newPolicies = cancelPolicies.filter((policy) => policy.id !== id);
    setCancelPolicies(newPolicies);
  };

  // ユーザーがcancelPolicyTextを空にしている場合のみ、自動生成テキストを表示するロジック
  const generatedPolicyText = React.useMemo(() => {
    const sortedPolicies = [...cancelPolicies].sort((a, b) => b.days - a.days);
    let policyText = "キャンセルポリシー:\n";
    if (sortedPolicies.length === 0) {
      policyText += "・キャンセルポリシーは設定されていません。\n";
    } else {
      sortedPolicies.forEach((policy, index) => {
        if (index === 0) {
          policyText += `・予約日の${policy.days}日前から${policy.feePercentage}%のキャンセル料が発生します。\n`;
        } else {
          policyText += `・予約日の${policy.days}日前から${policy.feePercentage}%のキャンセル料となります。\n`;
        }
      });
      policyText += "・上記以前のキャンセルは全額返金されます。";
    }
    return policyText;
  }, [cancelPolicies]);

  const displayText =
    cancelPolicyText.trim() === "" ? generatedPolicyText : cancelPolicyText;

  const addReservationMessage = () => {
    setReservationMessages([
      ...reservationMessages,
      { id: Date.now().toString(), days: 0, message: "" },
    ]);
  };

  const updateReservationMessage = (
    id: string,
    field: "days" | "message",
    value: number | string
  ) => {
    setReservationMessages(
      reservationMessages.map((msg) =>
        msg.id === id ? { ...msg, [field]: value } : msg
      )
    );
  };

  const removeReservationMessage = (id: string) => {
    setReservationMessages(reservationMessages.filter((msg) => msg.id !== id));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">基本情報設定</h2>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">予約URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="reservation-url">予約URL</Label>
              <div className="flex">
                <Input
                  id="reservation-url"
                  value={reservationUrl}
                  onChange={(e) => setReservationUrl(e.target.value)}
                  readOnly
                  className="flex-grow"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={copyToClipboard}
                        className="ml-2"
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isCopied ? "コピーしました" : "URLをコピー"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">予約設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="reservation-enabled"
                checked={isReservationEnabled}
                onCheckedChange={setIsReservationEnabled}
              />
              <Label htmlFor="reservation-enabled">
                オンライン予約を有効にする
              </Label>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center">
                キャンセル料設定
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 ml-2 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        キャンセル料は予約金額に対する割合です。
                        <br />
                        100%の場合、予約金額全額のキャンセル料が発生します。
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              {cancelPolicies.map((policy) => (
                <div key={policy.id} className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={policy.days}
                    onChange={(e) =>
                      updateCancelPolicy(
                        policy.id,
                        "days",
                        Number(e.target.value)
                      )
                    }
                    placeholder="日数"
                    className="w-24"
                    min="0"
                  />
                  <span>日前から</span>
                  <Input
                    type="number"
                    value={policy.feePercentage}
                    onChange={(e) =>
                      updateCancelPolicy(
                        policy.id,
                        "feePercentage",
                        Number(e.target.value)
                      )
                    }
                    placeholder="％"
                    className="w-24"
                    min="0"
                    max="100"
                  />
                  <span>％のキャンセル料</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCancelPolicy(policy.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addCancelPolicy}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                キャンセル料設定を追加
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancel-policy-text">
                キャンセルポリシー（未設定の場合は下記ポリシーに基づく文面が表示されます）
              </Label>
              <Textarea
                id="cancel-policy-text"
                value={cancelPolicyText}
                onChange={(e) => setCancelPolicyText(e.target.value)}
                rows={5}
              />
              <div className="text-sm text-gray-500 mt-2">
                現在表示されるテキスト:
              </div>
              <pre className="bg-gray-100 p-2 rounded text-sm whitespace-pre-wrap">
                {displayText}
              </pre>
            </div>
          </CardContent>
        </Card>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">予約者へのメッセージ設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reservationMessages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={message.days}
                    onChange={(e) =>
                      updateReservationMessage(
                        message.id,
                        "days",
                        Number(e.target.value)
                      )
                    }
                    placeholder="日数"
                    className="w-24"
                    min="0"
                  />
                  <span>日前に送信</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeReservationMessage(message.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={message.message}
                  onChange={(e) =>
                    updateReservationMessage(
                      message.id,
                      "message",
                      e.target.value
                    )
                  }
                  placeholder="メッセージを入力"
                  rows={3}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addReservationMessage}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              メッセージ設定を追加
            </Button>
          </CardContent>
        </Card>

        <Alert className="mb-6 bg-yellow-100 border-yellow-400 text-yellow-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>注意</AlertTitle>
          <AlertDescription>
            基本情報の変更は、すぐにお客様に公開されます。内容を十分に確認してから保存してください。
          </AlertDescription>
        </Alert>

        <Button type="submit" className="w-full" onClick={handleSubmit}>
          保存する
        </Button>
      </form>
    </div>
  );
};

export default BasicInfoSettingsView;
