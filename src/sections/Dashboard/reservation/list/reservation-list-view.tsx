"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Calendar, Users, DollarSign, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range"; // この新しいコンポーネントは別途実装が必要です
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import generateRandomReservations from "@/utils/generateRandomReservations";

interface Reservation {
  key: string;
  date: string;
  time: string;
  status: string;
  customerName: string;
  staff: string;
  service: string;
  price: number;
}

const ReservationListPage: React.FC = () => {
  const [reservations] = useState<Reservation[]>(
    generateRandomReservations(10)
  );

  const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
  }> = ({ title, value, icon }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">予約一覧</h2>

      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="space-y-4">
            <DatePickerWithRange />
            <div className="flex flex-wrap gap-2">
              {[
                "受付済み",
                "施術中",
                "来店処理済み",
                "お客様キャンセル",
                "サロンキャンセル",
                "無断キャンセル",
              ].map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox id={status} />
                  <label
                    htmlFor={status}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {status}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="お客様名(カナ)"
                className="w-full md:w-auto"
              />
              <Input placeholder="予約番号" className="w-full md:w-auto" />
              <Select>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="すべてのスタッフ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべてのスタッフ</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="すべての予約経路" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての予約経路</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full md:w-auto">
                <Search className="mr-2 h-4 w-4" /> 検索する
              </Button>
              <Button variant="outline" className="w-full md:w-auto">
                <X className="mr-2 h-4 w-4" /> 条件をクリア
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>来店日時</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>お客様名</TableHead>
                <TableHead>スタッフ</TableHead>
                <TableHead>メニュー</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((reservation) => (
                <TableRow key={reservation.key}>
                  <TableCell>
                    {reservation.date} {reservation.time}
                  </TableCell>
                  <TableCell>{reservation.status}</TableCell>
                  <TableCell>{reservation.customerName}</TableCell>
                  <TableCell>{reservation.staff}</TableCell>
                  <TableCell>{reservation.service}</TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/reservations/${reservation.key}/accounting`}
                    >
                      <Button variant="outline">会計</Button>
                    </Link>
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

export default ReservationListPage;
