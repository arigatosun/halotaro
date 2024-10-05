"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import Link from "next/link";
import { DateRange } from "react-day-picker";
import { useAuth } from "@/contexts/authcontext"; // AuthContextをインポート

// Customer型を定義
type Customer = {
  id: string;
  name: string;
  kana: string;
  email: string;
  phone: string;
  visits: number;
  gender: string;
  lastVisit: string; // ISO文字列
};

const CustomerListPage: React.FC = () => {
  const { session, user } = useAuth(); // セッションとユーザー情報を取得
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Customer;
    direction: "ascending" | "descending";
  } | null>({
    key: "lastVisit",
    direction: "descending",
  }); // 初期ソート設定
  const [kanaSearchTerm, setKanaSearchTerm] = useState("");
  const [phoneSearchTerm, setPhoneSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(true);

  // APIからデータを取得
  const fetchCustomers = async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // クエリパラメータの構築
      const params = new URLSearchParams();
      if (dateRange?.from) {
        params.append("startDate", dateRange.from.toISOString().split("T")[0]);
      }
      if (dateRange?.to) {
        params.append("endDate", dateRange.to.toISOString().split("T")[0]);
      }
      if (kanaSearchTerm) {
        params.append("kanaSearchTerm", kanaSearchTerm);
      }
      if (phoneSearchTerm) {
        params.append("phoneSearchTerm", phoneSearchTerm);
      }

      const response = await fetch(`/api/customer-data?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        const mappedCustomers = data.customers.map((customer: any) => ({
          id: customer.id,
          name: customer.name,
          kana: customer.kana || "",
          email: customer.email || "",
          phone: customer.phone || "",
          visits: customer.visits || 0,
          gender: customer.gender || "",
          lastVisit: customer.lastVisit || "",
        }));
        setCustomers(mappedCustomers);
        setCurrentPage(1); // ページをリセット
      } else {
        console.error("Error fetching customers:", data.error);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]); // セッションが変わったときに再取得

  // ハンドル検索ボタンのクリック
  const handleSearch = () => {
    fetchCustomers();
  };

  // ハンドルクリアボタンのクリック
  const handleClear = () => {
    setKanaSearchTerm("");
    setPhoneSearchTerm("");
    setDateRange(undefined);
    fetchCustomers();
  };

  // 1ページあたりの表示件数
  const itemsPerPage = 10;

  // フィルタリングされたリストをソート
  const sortedCustomers = useMemo(() => {
    let sortableItems = [...customers];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === "lastVisit") {
          const dateA = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
          const dateB = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;

          if (dateA < dateB) return sortConfig.direction === "ascending" ? -1 : 1;
          if (dateA > dateB) return sortConfig.direction === "ascending" ? 1 : -1;
          return 0;
        } else {
          const aValue = a[sortConfig.key];
          const bValue = b[sortConfig.key];

          if (aValue < bValue) {
            return sortConfig.direction === "ascending" ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === "ascending" ? 1 : -1;
          }
          return 0;
        }
      });
    }
    return sortableItems;
  }, [customers, sortConfig]);

  // 現在のページに表示するお客様リスト
  const currentCustomers = useMemo(() => {
    return sortedCustomers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [sortedCustomers, currentPage]);

  // 総ページ数を計算
  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);

  // ソート要求を処理する関数
  const requestSort = (key: keyof Customer) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>ログインしてください。</div>;
  }

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">お客様情報一覧</h2>

      {/* 検索条件入力部分 */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="space-y-4">
            <DatePickerWithRange
              date={dateRange}
              onDateChange={(newDateRange) => setDateRange(newDateRange)}
            />
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="お客様名(カナ)"
                value={kanaSearchTerm}
                onChange={(e) => setKanaSearchTerm(e.target.value)}
                className="w-full md:w-auto"
              />
              <Input
                placeholder="電話番号"
                value={phoneSearchTerm}
                onChange={(e) => setPhoneSearchTerm(e.target.value)}
                className="w-full md:w-auto"
              />
              <Select>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="すべての性別" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての性別</SelectItem>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full md:w-auto" onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" /> 検索する
              </Button>
              <Button variant="outline" className="w-full md:w-auto" onClick={handleClear}>
                <X className="mr-2 h-4 w-4" /> 条件をクリア
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 検索結果件数と新規登録ボタン */}
      <div className="flex justify-between items-center mb-4">
        <p>該当するお客様情報が {sortedCustomers.length} 件あります</p>
        <Button>お客様情報を新しく登録する</Button>
      </div>

      {/* 検索結果表示テーブル */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("kana")}
                >
                  氏名 (カナ){" "}
                  {sortConfig?.key === "kana" &&
                    (sortConfig.direction === "ascending" ? (
                      <ChevronUp className="inline" />
                    ) : (
                      <ChevronDown className="inline" />
                    ))}
                </TableHead>
                <TableHead>氏名 (漢字)</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("phone")}
                >
                  電話番号{" "}
                  {sortConfig?.key === "phone" &&
                    (sortConfig.direction === "ascending" ? (
                      <ChevronUp className="inline" />
                    ) : (
                      <ChevronDown className="inline" />
                    ))}
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("gender")}
                >
                  性別{" "}
                  {sortConfig?.key === "gender" &&
                    (sortConfig.direction === "ascending" ? (
                      <ChevronUp className="inline" />
                    ) : (
                      <ChevronDown className="inline" />
                    ))}
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("visits")}
                >
                  来店回数{" "}
                  {sortConfig?.key === "visits" &&
                    (sortConfig.direction === "ascending" ? (
                      <ChevronUp className="inline" />
                    ) : (
                      <ChevronDown className="inline" />
                    ))}
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort("lastVisit")}
                >
                  前回来店日{" "}
                  {sortConfig?.key === "lastVisit" &&
                    (sortConfig.direction === "ascending" ? (
                      <ChevronUp className="inline" />
                    ) : (
                      <ChevronDown className="inline" />
                    ))}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/customer/${customer.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {customer.kana}
                    </Link>
                  </TableCell>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.phone}</TableCell> {/* 電話番号の表示 */}
                  <TableCell>{customer.gender}</TableCell>
                  <TableCell>{customer.visits}</TableCell>
                  <TableCell>
                    {customer.lastVisit
                      ? new Date(customer.lastVisit).toLocaleDateString()
                      : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ページネーション */}
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() =>
                setCurrentPage((prev) => Math.max(prev - 1, 1))
              }
              className={
                currentPage === 1 ? "pointer-events-none opacity-50" : ""
              }
            />
          </PaginationItem>
          {[...Array(totalPages)].map((_, i) => (
            <PaginationItem key={i}>
              <PaginationLink
                onClick={() => setCurrentPage(i + 1)}
                isActive={currentPage === i + 1}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              className={
                currentPage === totalPages
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

export default CustomerListPage;
