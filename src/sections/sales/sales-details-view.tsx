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
import { Calendar as CalendarIcon } from "lucide-react";

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

// サンプルデータ生成関数
const generateSampleData = (count: number) => {
  const customers = [
    "玉山 めぐみ",
    "山木 美美子",
    "花枝",
    "佐藤 健太",
    "田中 春子",
    "鈴木 一郎",
  ];
  const types = ["施術", "その他"];
  const menus = [
    "育毛促進プレミアムヘッドスパ",
    "45分スパ(XBスパ)",
    "三ツ星ヘッドスパ",
    "カット＆カラー",
    "パーマ",
    "トリートメント",
    "ポイントカード割引",
    "次回予約",
  ];
  const staffs = ["田原 雄基", "(独)斉藤 春司", "山田 花子", "佐々木 真理"];

  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    customerName: customers[Math.floor(Math.random() * customers.length)],
    date: `2024/07/${String(Math.floor(Math.random() * 30) + 1).padStart(
      2,
      "0"
    )} ${String(Math.floor(Math.random() * 24)).padStart(2, "0")}:${String(
      Math.floor(Math.random() * 60)
    ).padStart(2, "0")}`,
    type: types[Math.floor(Math.random() * types.length)],
    menu: menus[Math.floor(Math.random() * menus.length)],
    staff: staffs[Math.floor(Math.random() * staffs.length)],
    unitPrice: Math.floor(Math.random() * 10000) + 1000,
    quantity: Math.floor(Math.random() * 3) + 1,
    get amount() {
      return this.unitPrice * this.quantity;
    },
  }));
};

const SalesDetailView: React.FC = () => {
  const [dateRange, setDateRange] = useState<
    { from: Date; to: Date } | undefined
  >();
  const [staff, setStaff] = useState<string>("");
  const [customer, setCustomer] = useState<string>("");
  const [menu, setMenu] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [allSalesData, setAllSalesData] = useState<
    ReturnType<typeof generateSampleData>
  >([]);
  const itemsPerPage = 10;

  useEffect(() => {
    // クライアントサイドでのみデータを生成
    setAllSalesData(generateSampleData(100));
  }, []);

  // ページネーションのための関数
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = allSalesData.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleSearch = () => {
    // 検索ロジックをここに実装
    console.log("検索条件:", { dateRange, staff, customer, menu });
  };

  const handleClearConditions = () => {
    setDateRange(undefined);
    setStaff("");
    setCustomer("");
    setMenu("");
  };
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">売上明細</h2>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Label>検索対象:</Label>
              <Select defaultValue="visitDate">
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
              <DatePickerWithRange />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="staff">スタッフ:</Label>
              <Select value={staff} onValueChange={setStaff}>
                <SelectTrigger id="staff">
                  <SelectValue placeholder="スタッフを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全スタッフ</SelectItem>
                  {/* スタッフリストをここに追加 */}
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
                  {/* メニューリストをここに追加 */}
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
        <p>期間：7月1日(月) 〜 7月25日(木) (来店日)</p>
        <div>
          <span className="mr-4">合計件数: 36</span>
          <span>合計金額: ¥282,400</span>
        </div>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  お客様名
                  <br />
                  会計日時
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
              {currentItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.customerName}
                    <br />
                    {item.date}
                  </TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.menu}</TableCell>
                  <TableCell>{item.staff}</TableCell>
                  <TableCell className="text-right">
                    ¥{item.unitPrice.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    ¥{item.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
          {[...Array(Math.ceil(allSalesData.length / itemsPerPage))].map(
            (_, index) => (
              <PaginationItem key={index}>
                <PaginationLink
                  onClick={() => paginate(index + 1)}
                  isActive={currentPage === index + 1}
                >
                  {index + 1}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => paginate(currentPage + 1)}
              className={
                currentPage === Math.ceil(allSalesData.length / itemsPerPage)
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
