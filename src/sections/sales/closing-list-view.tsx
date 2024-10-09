"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/authcontext";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("ja");

// 日本時間に設定
dayjs.tz.setDefault("Asia/Tokyo");

const RegisterClosingList: React.FC = () => {
  const { session, user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [closingData, setClosingData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClosingData = async () => {
    if (!session || !user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/register-closings', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        params: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      setClosingData(response.data.data);
    } catch (err) {
      console.error('レジ締めデータの取得エラー:', err);
      setError('データの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchClosingData();
  };

  const handleClearConditions = () => {
    setStartDate("");
    setEndDate("");
    setClosingData([]);
  };

  // 日本時間で昨日と今日の日付を取得する関数
  const getJapaneseDateString = (daysOffset: number = 0) => {
    return dayjs().tz("Asia/Tokyo").add(daysOffset, 'day').format("YYYY-MM-DD");
  };

  return (
    <div className="p-4 w-full mx-auto">
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
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  const yesterday = getJapaneseDateString(-1);
                  setStartDate(yesterday);
                  setEndDate(yesterday);
                }}
              >
                昨日
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  const today = getJapaneseDateString(0);
                  setStartDate(today);
                  setEndDate(today);
                }}
              >
                今日
              </Button>
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleClearConditions}
            >
              <X className="mr-2 h-4 w-4" />
              条件をクリア
            </Button>
            <Button
              size="sm"
              className="h-8 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleSearch}
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
          {loading ? (
            <p>読み込み中...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : closingData.length === 0 ? (
            <p>データがありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%] text-center">
                      レジ締め日
                      <br />
                      (レジ締め実施日時)
                    </TableHead>
                    <TableHead className="w-[25%] text-center">レジ過不足金</TableHead>
                    <TableHead className="w-[25%] text-center">レジ締め担当者</TableHead>
                    <TableHead className="w-[25%] text-center">レジ締めメモ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closingData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center">
                        <Link
                          href={`/dashboard/sales/closing-list/${item.id}`}
                          className="text-orange-500 hover:text-orange-600 hover:underline"
                        >
                          {dayjs(item.closing_date).format("YYYY/MM/DD")}
                        </Link>
                        <br />
                        ({dayjs(item.closing_date).format("YYYY/MM/DD HH:mm")})
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={item.cash_difference < 0 ? "text-red-500" : "text-green-500"}>
                          {item.cash_difference.toLocaleString()} 円
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{item.closing_staff?.name || '-'}</TableCell>
                      <TableCell className="text-center">{item.closing_memo || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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