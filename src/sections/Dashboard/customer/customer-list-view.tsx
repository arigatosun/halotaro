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
import { Checkbox } from "@/components/ui/checkbox";

// Customer型を定義
type Customer = {
  id: number;
  kana: string;
  name: string;
  gender: string;
  visits: number;
  lastVisit: string;
};

// SortKey型を定義
type SortKey = keyof Customer;

const CustomerListPage: React.FC<{ initialCustomers: Customer[] }> = ({
  initialCustomers,
}) => {
  const [isClient, setIsClient] = useState(false);
  const [customers] = useState(initialCustomers);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "ascending" | "descending";
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 1ページあたりの表示件数
  const itemsPerPage = 10;

  // 検索語でフィルタリングされたお客様リスト
  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (customer) =>
        customer.kana.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  // フィルタリングされたリストをソート
  const sortedCustomers = useMemo(() => {
    let sortableItems = [...filteredCustomers];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredCustomers, sortConfig]);

  // 現在のページに表示するお客様リスト
  const currentCustomers = sortedCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 総ページ数を計算
  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);

  // ソート要求を処理する関数
  const requestSort = (key: SortKey) => {
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

  if (!isClient) {
    return null; // または適切なローディング表示
  }

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">お客様情報一覧</h2>

      {/* 検索条件入力部分 */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="space-y-4">
            <DatePickerWithRange />
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="お客様名(カナ)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-auto"
              />
              <Input placeholder="電話番号" className="w-full md:w-auto" />
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

      {/* 検索結果件数と新規登録ボタン */}
      <div className="flex justify-between items-center mb-4">
        <p>該当するお客様情報が {sortedCustomers.length} 件あります</p>
        <Button>お客様情報を新しく登録する</Button>
      </div>

      {/* 検索条件入力カード */}
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
                <TableHead>性別</TableHead>
                <TableHead>来店回数</TableHead>
                <TableHead>前回来店日</TableHead>
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
                  <TableCell>{customer.gender}</TableCell>
                  <TableCell>{customer.visits}</TableCell>
                  <TableCell>{customer.lastVisit}</TableCell>
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
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
