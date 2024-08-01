"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
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

const RegisterClosingDetail: React.FC = () => {
  const params = useParams();
  const id = params.id as string;
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // この部分は実際のデータフェッチロジックに置き換える必要があります
  const closingData = {
    date: "2024年07月28日",
    targetDate: "2024年07月28日(日)17:50 ～",
    staff: "鈴木 一郎",
    memo: "特記事項なし",
    cashInfo: [
      { label: "現金", value: 14000 },
      { label: "ギフト券", value: 0 },
      { label: "ポイント", value: 0 },
      { label: "スマート支払い", value: 0 },
      { label: "クレジットカード", value: 0 },
      { label: "電子マネー", value: 0 },
    ],
    otherInfo: {
      preparedCash: 10000,
      cashIn: 0,
      cashOut: 0,
    },
    calculationResult: {
      expected: 14000,
      difference: -14000,
      actual: 0,
    },
    accountingList: [
      {
        datetime: "2024/07/28 15:00",
        customer: "山田 太郎",
        staff: "佐藤 花子",
        service: "カット・カラー",
        amount: 12000,
        paymentMethod: "現金",
      },
      {
        datetime: "2024/07/28 16:30",
        customer: "鈴木 一郎",
        staff: "田中 優子",
        service: "パーマ",
        amount: 15000,
        paymentMethod: "クレジットカード",
      },
    ],
  };

  const handlePrint = () => {
    window.print();
    setIsPrintModalOpen(false);
  };

  const PrintableContent: React.FC = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">レジ締めジャーナル</h2>
      <div className="mb-4">
        <p>
          <strong>レジ締め日:</strong> {closingData.date}
        </p>
        <p>
          <strong>レジ締め対象日:</strong> {closingData.targetDate}
        </p>
        <p>
          <strong>レジ締め担当者:</strong> {closingData.staff}
        </p>
      </div>
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-2">会計のレジ金情報</h3>
        <Table>
          <TableBody>
            {closingData.cashInfo.map((item) => (
              <TableRow key={item.label}>
                <TableCell>{item.label}</TableCell>
                <TableCell className="text-right">
                  {item.value.toLocaleString()} 円
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-2">レジ金計算結果</h3>
        <p>
          <strong>想定のレジ金:</strong>{" "}
          {closingData.calculationResult.expected.toLocaleString()} 円
        </p>
        <p>
          <strong>レジ過不足金額:</strong>{" "}
          {closingData.calculationResult.difference.toLocaleString()} 円
        </p>
        <p>
          <strong>実際のレジ金:</strong>{" "}
          {closingData.calculationResult.actual.toLocaleString()} 円
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
            {closingData.accountingList.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.datetime}</TableCell>
                <TableCell>{item.customer}</TableCell>
                <TableCell>{item.staff}</TableCell>
                <TableCell>{item.service}</TableCell>
                <TableCell>{item.amount.toLocaleString()}円</TableCell>
                <TableCell>{item.paymentMethod}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div>
        <h3 className="text-xl font-bold mb-2">レジ締めメモ</h3>
        <p>{closingData.memo}</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">レジ締め詳細</h1>
        <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              ジャーナル印刷
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>ジャーナル印刷プレビュー</DialogTitle>
            </DialogHeader>
            <PrintableContent />
            <Button onClick={handlePrint}>印刷する</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-semibold mb-2 text-sm">会計のレジ金情報</h3>
              <Table>
                <TableBody className="text-sm">
                  {closingData.cashInfo.map((item) => (
                    <TableRow key={item.label}>
                      <TableCell className="py-1">{item.label}</TableCell>
                      <TableCell className="text-right py-1">
                        {item.value.toLocaleString()} 円
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-sm">
                会計以外のレジ金情報
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>レジ準備金</span>
                  <span>
                    {closingData.otherInfo.preparedCash.toLocaleString()} 円
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>レジ入金額</span>
                  <span>
                    {closingData.otherInfo.cashIn.toLocaleString()} 円
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>レジ出金額</span>
                  <span className="text-red-500">
                    -{closingData.otherInfo.cashOut.toLocaleString()} 円
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-sm">レジ金計算結果</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>想定のレジ金</span>
                  <span className="font-bold">
                    {closingData.calculationResult.expected.toLocaleString()} 円
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>レジ過不足金額</span>
                  <span className="font-bold text-red-500">
                    {closingData.calculationResult.difference.toLocaleString()}{" "}
                    円
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>実際のレジ金</span>
                  <span>
                    {closingData.calculationResult.actual.toLocaleString()} 円
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-semibold mb-2 text-sm">レジ締め日</h3>
              <p className="text-sm">{closingData.date}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-sm">レジ締め対象日</h3>
              <p className="text-sm">{closingData.targetDate}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-sm">レジ締め担当者</h3>
              <p className="text-sm">{closingData.staff}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2 text-sm">レジ締めメモ</h3>
          <p className="text-sm">{closingData.memo}</p>
        </CardContent>
      </Card>

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
              {closingData.accountingList.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.datetime}</TableCell>
                  <TableCell>{item.customer}</TableCell>
                  <TableCell>{item.staff}</TableCell>
                  <TableCell>{item.service}</TableCell>
                  <TableCell>{item.amount.toLocaleString()}円</TableCell>
                  <TableCell>{item.paymentMethod}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterClosingDetail;
