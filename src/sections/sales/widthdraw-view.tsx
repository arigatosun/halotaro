"use client";

import React, { useEffect, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Calendar, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Portal } from "@radix-ui/react-select";

// ダミーデータ
const withdrawalHistory = [
  { id: 1, date: "2023-07-01", amount: 100000, status: "処理中" },
  { id: 2, date: "2023-06-15", amount: 150000, status: "完了" },
  { id: 3, date: "2023-06-01", amount: 200000, status: "完了" },
];

const WithdrawalRequestView: React.FC = () => {
  const [amount, setAmount] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ここで出金申請の処理を実装
    console.log("出金申請:", { amount, bankAccount });
    // 申請後の処理（例：成功メッセージの表示、フォームのリセットなど）
  };
  return (
    <div className="p-8 max-w-full">
      <h2 className="text-2xl font-bold mb-6">出金申請</h2>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">出金可能額</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">¥1,500,000</div>
            <p className="text-xs text-muted-foreground">
              最終更新: 2023年7月15日 10:00
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">次回出金予定日</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">2023年7月31日</div>
            <p className="text-xs text-muted-foreground">
              ※申請から3営業日以内に振込予定
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">出金申請フォーム</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount" className="text-sm">
                  出金額
                </Label>
                <Input
                  id="amount"
                  placeholder="出金額を入力"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bank-account" className="text-sm">
                  振込先口座
                </Label>
                <Select
                  onValueChange={setBankAccount}
                  required
                  onOpenChange={(open) => setIsSelectOpen(open)}
                >
                  <SelectTrigger id="bank-account">
                    <SelectValue placeholder="振込先口座を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="account1">
                      ●●銀行 東京支店 普通 1234567
                    </SelectItem>
                    <SelectItem value="account2">
                      ▲▲銀行 大阪支店 普通 7654321
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit">出金を申請する</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Alert
        variant="default"
        className="mt-6 bg-yellow-100 border-yellow-400 text-yellow-800"
      >
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="text-sm font-medium">注意</AlertTitle>
        <AlertDescription className="text-sm">
          出金申請は1日1回までです。申請後のキャンセルはできませんのでご注意ください。
        </AlertDescription>
      </Alert>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">出金履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">日付</TableHead>
                <TableHead className="text-sm text-right">金額</TableHead>
                <TableHead className="text-sm">ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawalHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">{item.date}</TableCell>
                  <TableCell className="text-sm text-right">
                    ¥{item.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        item.status === "完了"
                          ? "bg-green-100 text-green-800"
                          : item.status === "処理中"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {item.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalRequestView;
