"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DateRange } from "react-day-picker";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useAuth } from "@/lib/authContext";
import { supabase } from "@/lib/supabaseClient";

// dayjsプラグインの設定
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Tokyo");

// 単日選択時に `to` を `from` と同日にそろえるための関数
const normalizeDateRange = (
  range: DateRange | undefined
): DateRange | undefined => {
  if (!range) return undefined;
  // from があるのに to が無い場合は、単日の選択とみなして同一日にそろえる
  if (range.from && !range.to) {
    return {
      from: range.from,
      to: range.from,
    };
  }
  return range;
};

const SalesDetailView: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [staff, setStaff] = useState<string>("all");
  const [customer, setCustomer] = useState<string>("");
  const [menu, setMenu] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTarget, setSearchTarget] = useState<string>("visitDate");

  const { session, user } = useAuth();

  // スタッフとメニューの状態変数
  const [staffList, setStaffList] = useState<any[]>([]);
  const [menuList, setMenuList] = useState<any[]>([]);

  // タイムゾーンを考慮した ISOString を返す関数
  const convertToTimezoneDateString = (
    date: Date | undefined,
    isEndDate: boolean = false
  ): string => {
    if (!date) return "";

    const d = dayjs(date).tz("Asia/Tokyo");
    if (isEndDate) {
      // 終了日の場合は 23:59:59.999 に設定
      return d.endOf("day").toISOString();
    }
    // 開始日の場合は 00:00:00.000 に設定
    return d.startOf("day").toISOString();
  };

  // スタッフデータを取得
  const fetchStaffData = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("staff")
      .select("id, name")
      .eq("user_id", user.id);

    if (error) {
      console.error("スタッフデータの取得エラー:", error);
    } else {
      setStaffList(data);
    }
  };

  // メニューデータを取得
  const fetchMenuData = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("menu_items")
      .select("id, name")
      .eq("user_id", user.id);

    if (error) {
      console.error("メニューデータの取得エラー:", error);
    } else {
      setMenuList(data);
    }
  };

  useEffect(() => {
    fetchStaffData();
    fetchMenuData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchSalesData = async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      // 単日選択時などに備えて range を正規化
      const normalizedRange = normalizeDateRange(dateRange);

      const params: Record<string, any> = {
        page: currentPage,
        itemsPerPage,
        sortBy: searchTarget === "visitDate" ? "start_time" : "closing_date",
        sortOrder: "desc",
        searchTarget,
      };

      // 日付範囲の設定
      if (normalizedRange?.from) {
        params.startDate = convertToTimezoneDateString(normalizedRange.from);
      }
      if (normalizedRange?.to) {
        params.endDate = convertToTimezoneDateString(normalizedRange.to, true);
      }

      // その他のフィルター条件
      if (staff && staff !== "all") {
        params.staff = staff;
      }
      if (customer.trim()) {
        params.customer = customer.trim();
      }
      if (menu && menu !== "all") {
        params.menu = menu;
      }

      // パラメータのクリーンアップ（undefinedや空文字を除去）
      const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== "") {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      const queryString = new URLSearchParams(cleanParams).toString();
      const response = await axios.get(`/api/sales-details?${queryString}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const { data, totalItems } = response.data;
      setSalesData(data);
      setTotalItems(totalItems);
    } catch (error) {
      console.error("売上データの取得エラー:", error);
      setError("売上データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchSalesData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, session]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchSalesData();
  };

  const handleClearConditions = () => {
    setDateRange(undefined);
    setStaff("all");
    setCustomer("");
    setMenu("all");
    setSearchTarget("visitDate");
    setCurrentPage(1);
    fetchSalesData();
  };

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // 日付フォーマット用のユーティリティ関数
  const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return "";
    return dayjs(dateString).tz("Asia/Tokyo").format("YYYY/MM/DD HH:mm");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">売上明細</h2>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Label>検索対象:</Label>
              <Select value={searchTarget} onValueChange={setSearchTarget}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="検索対象を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visitDate">来店日</SelectItem>
                  <SelectItem value="registrationDate">レジ締め日</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Label>検索期間:</Label>
              {/* DatePickerWithRange は from と to を両方持っている場合に2日範囲選択、
                  単日選択時は from のみになるケースがある */}
              <DatePickerWithRange
                date={dateRange}
                onDateChange={(newDateRange) => setDateRange(newDateRange)}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="customer">お客様名:</Label>
              <Input
                id="customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="お客様名を入力"
              />
            </div>
            <div>
              <Label htmlFor="staff">スタッフ:</Label>
              <Select value={staff} onValueChange={setStaff}>
                <SelectTrigger id="staff">
                  <SelectValue placeholder="スタッフを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全スタッフ</SelectItem>
                  {staffList.map((staffMember) => (
                    <SelectItem key={staffMember.id} value={staffMember.name}>
                      {staffMember.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="menu">メニュー:</Label>
              <Select value={menu} onValueChange={setMenu}>
                <SelectTrigger id="menu">
                  <SelectValue placeholder="メニューを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全メニュー</SelectItem>
                  {menuList.map((menuItem) => (
                    <SelectItem key={menuItem.id} value={menuItem.name}>
                      {menuItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleClearConditions}>
              条件をクリア
            </Button>
            <Button onClick={handleSearch}>検索する</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mb-4">
        <p>
          期間：
          {dateRange?.from
            ? dayjs(dateRange.from).tz("Asia/Tokyo").format("YYYY年MM月DD日")
            : ""}
          {dateRange?.to
            ? ` 〜 ${dayjs(dateRange.to)
                .tz("Asia/Tokyo")
                .format("YYYY年MM月DD日")}`
            : ""}{" "}
          ({searchTarget === "visitDate" ? "来店日" : "レジ締め日"})
        </p>
        <div>
          <span className="mr-4">合計件数: {totalItems}</span>
          <span>
            合計金額: ¥
            {salesData
              .reduce((total, item) => total + item.amount, 0)
              .toLocaleString()}
          </span>
        </div>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <p>読み込み中...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    お客様名
                    <br />
                    {searchTarget === "visitDate" ? "来店日時" : "レジ締め日時"}
                  </TableHead>
                  <TableHead>区分</TableHead>
                  <TableHead>
                    メニュー・店販
                    <br />
                    割引・サービス・オプション
                  </TableHead>
                  <TableHead>スタッフ</TableHead>
                  <TableHead className="text-right">単価</TableHead>
                  <TableHead className="text-right">個数</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {item.customer_name}
                      <br />
                      {searchTarget === "visitDate"
                        ? formatDateTime(item.start_time)
                        : formatDateTime(item.closing_date)}
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.staff}</TableCell>
                    <TableCell className="text-right">
                      ¥{item.price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      ¥{item.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => paginate(currentPage - 1)}
              className={
                currentPage === 1 ? "pointer-events-none opacity-50" : ""
              }
            />
          </PaginationItem>
          {[...Array(Math.ceil(totalItems / itemsPerPage))].map((_, index) => (
            <PaginationItem key={index}>
              <PaginationLink
                onClick={() => paginate(index + 1)}
                isActive={currentPage === index + 1}
              >
                {index + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => paginate(currentPage + 1)}
              className={
                currentPage === Math.ceil(totalItems / itemsPerPage)
                  ? "pointer-events-none opacity-50"
                  : ""
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default SalesDetailView;
