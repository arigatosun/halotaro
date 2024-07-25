"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CreditCard, DollarSign } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ServiceSettingsView: React.FC = () => {
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [cardNumber, setCardNumber] = useState("**** **** **** 1234");
  const [cardExpiry, setCardExpiry] = useState("12/25");
  const [isAutoRenewal, setIsAutoRenewal] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value);
  };

  const handleUpdatePaymentInfo = () => {
    // 支払い情報更新のロジックをここに実装
    console.log("支払い情報を更新しました");
  };

  const handleCancelSubscription = () => {
    // 解約処理のロジックをここに実装
    console.log("サービスを解約しました");
    setIsDialogOpen(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">サービス利用設定</h2>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">決済設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-method">決済方法</Label>
            <Select
              value={paymentMethod}
              onValueChange={handlePaymentMethodChange}
            >
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="決済方法を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit_card">クレジットカード</SelectItem>
                <SelectItem value="bank_transfer">銀行振込</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === "credit_card" && (
            <div className="space-y-2">
              <Label>登録済みカード情報</Label>
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-gray-500" />
                <span>{cardNumber}</span>
                <span>{cardExpiry}</span>
              </div>
              <Button variant="outline" onClick={handleUpdatePaymentInfo}>
                カード情報を更新
              </Button>
            </div>
          )}

          {paymentMethod === "bank_transfer" && (
            <div className="space-y-2">
              <Label>振込先口座情報</Label>
              <div>
                <p>銀行名: サンプル銀行</p>
                <p>支店名: 本店</p>
                <p>口座種別: 普通</p>
                <p>口座番号: 1234567</p>
                <p>口座名義: カブシキガイシャサンプル</p>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="auto-renewal"
              checked={isAutoRenewal}
              onCheckedChange={setIsAutoRenewal}
            />
            <Label htmlFor="auto-renewal">自動更新を有効にする</Label>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">プラン情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-semibold">現在のプラン: スタンダードプラン</p>
            <p>月額: ¥9,800 (税込)</p>
            <p>次回更新日: 2024年8月1日</p>
          </div>
          <Button variant="outline">プランを変更する</Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg text-red-600">解約</CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">サービスを解約する</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>サービス解約の確認</DialogTitle>
                <DialogDescription>
                  本当にサービスを解約しますか？解約後はすべてのデータが削除され、元に戻すことはできません。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelSubscription}
                >
                  解約する
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <p className="mt-2 text-sm text-gray-600">
            解約すると、次回更新日以降はサービスを利用できなくなります。
          </p>
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>注意</AlertTitle>
        <AlertDescription>
          決済設定の変更は即時反映されます。解約は次回更新日から適用されます。
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ServiceSettingsView;
