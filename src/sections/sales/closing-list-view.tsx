"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import Link from "next/link";

const RegisterClosingList: React.FC = () => {
  const [startDate, setStartDate] = useState("2024/06/01");
  const [endDate, setEndDate] = useState("2024/07/31");
  const [isPrinted, setIsPrinted] = useState(true);
  const [isNotPrinted, setIsNotPrinted] = useState(true);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const closingData = [
    {
      id: "1",
      date: "2024/07/28",
      time: "17:50",
      difference: -16200,
      printed: false,
      staff: "鳥山 涼花",
    },
    {
      id: "2",
      date: "2024/07/27",
      time: "17:23",
      difference: -8000,
      printed: false,
      staff: "鳥山 涼花",
    },
    // ... 他の項目も同様に
  ];

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">レジ締め一覧</h1>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="startDate" className="text-sm">
                レジ締め日（開始）
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm">
                レジ締め日（終了）
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div className="flex space-x-4">
              <Button size="sm" variant="outline" className="h-8">
                昨日
              </Button>
              <Button size="sm" variant="outline" className="h-8">
                今日
              </Button>
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-4">
            <Label className="text-sm">ジャーナル印刷:</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="printed"
                checked={isPrinted}
                onCheckedChange={(checked) => setIsPrinted(checked as boolean)}
              />
              <Label htmlFor="printed" className="text-sm">
                印刷済み
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notPrinted"
                checked={isNotPrinted}
                onCheckedChange={(checked) =>
                  setIsNotPrinted(checked as boolean)
                }
              />
              <Label htmlFor="notPrinted" className="text-sm">
                未印刷
              </Label>
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" size="sm" className="h-8">
              <X className="mr-2 h-4 w-4" />
              条件をクリア
            </Button>
            <Button
              size="sm"
              className="h-8 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Search className="mr-2 h-4 w-4" />
              検索する
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            該当するレジ締め情報が {closingData.length} 件あります
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">
                  レジ締め日
                  <br />
                  (レジ締め実施日時)
                </TableHead>
                <TableHead className="text-right">レジ過不足金</TableHead>
                <TableHead>ジャーナル印刷</TableHead>
                <TableHead>レジ締め担当者</TableHead>
                <TableHead>レジ締めメモ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closingData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/sales/closing-list/${item.id}`}
                      className="text-orange-500 hover:text-orange-600 hover:underline"
                    >
                      {item.date}
                    </Link>
                    <br />({item.date} {item.time})
                  </TableCell>
                  <TableCell className="text-right text-red-500">
                    {item.difference.toLocaleString()} 円
                  </TableCell>
                  <TableCell>{item.printed ? "印刷済み" : "未印刷"}</TableCell>
                  <TableCell>{item.staff}</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">1/1ページ</div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
                前へ
              </Button>
              <Button variant="outline" size="sm" disabled>
                次へ
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterClosingList;
