// closing-list-view-id.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { Label } from "@/components/ui/label";

interface AccountingMethod {
  method: string;
  amount: number;
}

interface AccountingItem {
  id: string;
  reservation_id: string;
  customer_name: string;
  staff_name: string;
  payment_methods: AccountingMethod[];
  items: { name: string; price: number }[];
  total_price: number;
  created_at: string;
}

interface Staff {
  id: string;
  name: string;
}

interface RegisterClosingData {
  id: string;
  closing_date: string;
  prepared_cash: number;
  prepared_cash_details: any; // 必要に応じて型を調整
  actual_cash: number;
  cash_difference: number;
  closing_memo: string | null;
  cash_in: number;
  cash_out: number;
  created_at: string;
  updated_at: string;
  closing_staff: Staff;
  accounting_information: AccountingItem[];
}

const RegisterClosingDetail: React.FC = () => {
  const params = useParams();
  const id = params.id as string;
  const { session, user } = useAuth();

  const [closingData, setClosingData] = useState<RegisterClosingData | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // 支払い方法の定義
  const paymentMethods = [
    "現金",
    "クレジットカード",
    "電子マネー",
    "ギフト券",
    "ポイント",
    "スマート支払い",
  ];

  const fetchClosingData = async () => {
    if (!session || !user || !id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/register-closings/${id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      setClosingData(response.data.data);
    } catch (err: any) {
      console.error(
        "レジ締めデータの取得エラー:",
        err.response?.data || err.message
      );
      setError("データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosingData();
  }, [session, user, id]);

  const handlePrint = () => {
    window.print();
    setIsPrintModalOpen(false);
  };

  if (loading) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!closingData) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <p>データが見つかりません。</p>
      </div>
    );
  }

  // 支払い方法ごとの合計金額を計算
  const totalByPaymentMethod: { [key: string]: number } = {};
  paymentMethods.forEach((method) => {
    totalByPaymentMethod[method] = 0;
  });

  closingData.accounting_information.forEach((record) => {
    record.payment_methods.forEach((method) => {
      if (paymentMethods.includes(method.method)) {
        totalByPaymentMethod[method.method] += method.amount;
      }
    });
  });

  // 会計情報のレジ金合計
  const accountingCashTotal = totalByPaymentMethod["現金"] || 0;

  // その他の情報
  const preparedCash = closingData.prepared_cash || 0;
  const cashIn = closingData.cash_in || 0;
  const cashOut = closingData.cash_out || 0;
  const actualCash = closingData.actual_cash || 0;
  const cashDifference = closingData.cash_difference || 0;

  const expectedCash = accountingCashTotal + preparedCash + cashIn - cashOut;

  // 印刷用コンテンツ
  const PrintableContent: React.FC = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">レジ締めジャーナル</h2>
      <div className="mb-4">
        <p>
          <strong>レジ締め日:</strong>{" "}
          {new Date(closingData.closing_date).toLocaleDateString("ja-JP")}
        </p>
        <p>
          <strong>レジ締め対象日:</strong>{" "}
          {new Date(closingData.closing_date).toLocaleString("ja-JP")} ～
        </p>
        <p>
          <strong>レジ締め担当者:</strong> {closingData.closing_staff.name}
        </p>
        <p>
          <strong>レジ締めメモ:</strong> {closingData.closing_memo || "なし"}
        </p>
      </div>
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-2">会計のレジ金情報</h3>
        <Table>
          <TableBody>
            {paymentMethods.map((method) => (
              <TableRow key={method}>
                <TableCell>{method}</TableCell>
                <TableCell className="text-right">
                  {totalByPaymentMethod[method].toLocaleString()} 円
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-2">レジ金計算結果</h3>
        <p>
          <strong>想定のレジ金:</strong> {expectedCash.toLocaleString()} 円
        </p>
        <p>
          <strong>レジ過不足金額:</strong>{" "}
          <span className="text-red-500">
            {cashDifference.toLocaleString()} 円
          </span>
        </p>
        <p>
          <strong>実際のレジ金:</strong> {actualCash.toLocaleString()} 円
        </p>
      </div>
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-2">レジ締め対象 会計一覧</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>来店日時</TableHead>
              <TableHead>お客様名</TableHead>
              <TableHead>スタッフ</TableHead>
              <TableHead>メニュー・店販</TableHead>
              <TableHead>お支払金額</TableHead>
              <TableHead>支払方法</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {closingData.accounting_information.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {new Date(item.created_at).toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>{item.customer_name}</TableCell>
                <TableCell>{item.staff_name}</TableCell>
                <TableCell>
                  {item.items.map((service) => service.name).join(", ")}
                </TableCell>
                <TableCell>{item.total_price.toLocaleString()} 円</TableCell>
                <TableCell>
                  {item.payment_methods
                    .map(
                      (method) =>
                        `${method.method}: ¥${method.amount.toLocaleString()}`
                    )
                    .join(", ")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">レジ締め詳細</h1>
        <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
          <DialogTrigger asChild>
            {/* <Button variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              ジャーナル印刷
            </Button>*/}
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>ジャーナル印刷プレビュー</DialogTitle>
            </DialogHeader>
            <PrintableContent />
            <Button onClick={handlePrint} className="mt-4">
              印刷する
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* 会計のレジ金情報 */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 会計のレジ金情報 */}
            <div>
              <h3 className="font-semibold mb-2 text-sm">会計のレジ金情報</h3>
              <Table>
                <TableBody className="text-sm">
                  {paymentMethods.map((method) => (
                    <TableRow key={method}>
                      <TableCell className="py-1">{method}</TableCell>
                      <TableCell className="text-right py-1">
                        {totalByPaymentMethod[method].toLocaleString()} 円
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 会計以外のレジ金情報 */}
            <div>
              <h3 className="font-semibold mb-2 text-sm">
                会計以外のレジ金情報
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>レジ準備金</span>
                  <span>{preparedCash.toLocaleString()} 円</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>レジ入金額</span>
                  <span>{cashIn.toLocaleString()} 円</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>レジ出金額</span>
                  <span className="text-red-500">
                    -{cashOut.toLocaleString()} 円
                  </span>
                </div>
              </div>
            </div>

            {/* レジ金計算結果 */}
            <div>
              <h3 className="font-semibold mb-2 text-sm">レジ金計算結果</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>想定のレジ金</span>
                  <span className="font-bold">
                    {expectedCash.toLocaleString()} 円
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>レジ過不足金額</span>
                  <span className="font-bold text-red-500">
                    {cashDifference.toLocaleString()} 円
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>実際のレジ金</span>
                  <span>{actualCash.toLocaleString()} 円</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* レジ締め情報 */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-semibold mb-2 text-sm">レジ締め日</h3>
              <p className="text-sm">
                {new Date(closingData.closing_date).toLocaleDateString("ja-JP")}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-sm">レジ締め対象日</h3>
              <p className="text-sm">
                {new Date(closingData.closing_date).toLocaleString("ja-JP")} ～
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-sm">レジ締め担当者</h3>
              <p className="text-sm">{closingData.closing_staff.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* レジ締めメモ */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2 text-sm">レジ締めメモ</h3>
          <p className="text-sm">{closingData.closing_memo || "-"}</p>
        </CardContent>
      </Card>

      {/* レジ締め対象 会計一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>レジ締め対象 会計一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>来店日時</TableHead>
                <TableHead>お客様名</TableHead>
                <TableHead>スタッフ</TableHead>
                <TableHead>メニュー・店販</TableHead>
                <TableHead>お支払金額</TableHead>
                <TableHead>支払方法</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closingData.accounting_information.map(
                (item: AccountingItem) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {new Date(item.created_at).toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>{item.customer_name}</TableCell>
                    <TableCell>{item.staff_name}</TableCell>
                    <TableCell>
                      {item.items.map((service) => service.name).join(", ")}
                    </TableCell>
                    <TableCell>
                      {item.total_price.toLocaleString()} 円
                    </TableCell>
                    <TableCell>
                      {item.payment_methods
                        .map(
                          (method) =>
                            `${
                              method.method
                            }: ¥${method.amount.toLocaleString()}`
                        )
                        .join(", ")}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterClosingDetail;
