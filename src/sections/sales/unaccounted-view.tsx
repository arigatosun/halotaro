"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import ReservationTable from "@/components/ReservationTable";

const CompactRegisterClosingUI: React.FC = () => {
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">レジ締め</h1>
      <Alert className="mb-4">
        <AlertTitle>注意事項</AlertTitle>
        <AlertDescription className="text-sm">
          一日の業務終了時にレジ締めを行い、お金のやり取りが正しかったかを確認してください。
          営業開始時にお釣り用に準備していたお金を[レジ準備金]に、実際にキャッシュドロアに入っている金額を[実際のレジ金]に入力し、レジ金の過不足が発生していないかを確認してください。
        </AlertDescription>
      </Alert>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-semibold mb-2 text-sm">会計のレジ金情報</h3>
              <Table>
                <TableBody className="text-sm">
                  {[
                    { label: "現金", value: 14000 },
                    { label: "ギフト券", value: 0 },
                    { label: "ポイント", value: 0 },
                    { label: "スマート支払い", value: 0 },
                    { label: "クレジットカード", value: 0 },
                    { label: "電子マネー", value: 0 },
                  ].map((item) => (
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
                  <Label htmlFor="preparedCash" className="text-sm">
                    レジ準備金
                  </Label>
                  <div className="flex items-center">
                    <Input
                      id="preparedCash"
                      type="number"
                      className="w-24 text-right text-sm h-8"
                      defaultValue="0"
                    />
                    <span className="ml-1">円</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>レジ入金額</span>
                  <span>0 円</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>レジ出金額</span>
                  <span className="text-red-500">-0 円</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-sm">レジ金計算結果</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>想定のレジ金</span>
                  <span className="font-bold">14,000 円</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>レジ過不足金額</span>
                  <span className="font-bold text-red-500">-14,000 円</span>
                </div>
                <div>
                  <Label htmlFor="actualCash" className="text-sm">
                    実際のレジ金
                  </Label>
                  <div className="flex items-center mt-1">
                    <Input
                      id="actualCash"
                      type="number"
                      className="text-right text-sm h-8"
                      defaultValue="0"
                    />
                    <span className="ml-1">円</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <Label htmlFor="closingDate" className="text-sm">
            レジ締め日
          </Label>
          <Input id="closingDate" type="date" className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-sm">レジ締め対象日</Label>
          <Input
            value="2024年07月28日(日)17:50 ～"
            readOnly
            className="mt-1 bg-gray-100 h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="closingStaff" className="text-sm">
            レジ締め担当者
          </Label>
          <Select>
            <SelectTrigger id="closingStaff" className="mt-1 h-8 text-sm">
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff1">スタッフ1</SelectItem>
              <SelectItem value="staff2">スタッフ2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-5">
        <Label htmlFor="closingMemo" className="text-sm">
          レジ締めメモ
        </Label>
        <Textarea
          id="closingMemo"
          placeholder="メモを入力"
          className="mt-1 text-sm"
          rows={3}
        />
      </div>

      <div className="flex justify-end mb-8">
        <Button
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          レジ締めの完了
        </Button>
      </div>

      <Card className="mb-5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>未会計予約一覧</CardTitle>
          <AlertDescription className="text-sm text-red-500">
            以下の予約は会計が行われていません。必要に応じて会計やキャンセルを行ってください。
          </AlertDescription>
        </CardHeader>
        <CardContent>
          <ReservationTable
            reservations={[]}
            loading={false}
            error={null}
            page={1}
            limit={10}
            totalCount={0}
            onPageChange={() => {}}
            filterOptions={{
              dateRange: undefined,
              statuses: ["受付待ち"],
              customerName: "",
              reservationNumber: "",
              staff: "all",
              reservationRoute: "all",
            }}
          />
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
              <TableRow>
                <TableCell>2024/07/28 15:00</TableCell>
                <TableCell>山田 太郎</TableCell>
                <TableCell>佐藤 花子</TableCell>
                <TableCell>カット・カラー</TableCell>
                <TableCell>12,000円</TableCell>
                <TableCell>現金</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2024/07/28 16:30</TableCell>
                <TableCell>鈴木 一郎</TableCell>
                <TableCell>田中 優子</TableCell>
                <TableCell>パーマ</TableCell>
                <TableCell>15,000円</TableCell>
                <TableCell>クレジットカード</TableCell>
              </TableRow>
              {/* 必要に応じて行を追加 */}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompactRegisterClosingUI;
