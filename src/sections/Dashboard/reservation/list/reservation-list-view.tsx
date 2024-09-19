"use client";
import React, { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import ReservationTable from "@/components/ReservationTable";
import { DateRange } from "react-day-picker";
import { Search, X } from "lucide-react";
import { useReservations } from "@/hooks/useReservations";

interface FilterOptions {
  dateRange: DateRange | undefined;
  statuses: string[];
  customerName: string;
  reservationNumber: string;
  staff: string;
  reservationRoute: string;
}

const ReservationListView: React.FC = () => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    dateRange: undefined,
    statuses: [],
    customerName: "",
    reservationNumber: "",
    staff: "all",
    reservationRoute: "all",
  });
  const [page, setPage] = useState(1);
  const limit = 10;

  const { reservations, loading, error, totalCount } = useReservations(
    filterOptions,
    page,
    limit
  );

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setFilterOptions((prev) => ({ ...prev, dateRange: range }));
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    setFilterOptions((prev) => ({
      ...prev,
      statuses: checked
        ? [...prev.statuses, status]
        : prev.statuses.filter((s) => s !== status),
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilterOptions((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFilterOptions((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    // 検索ボタンが押されたときの処理（必要に応じて）
    setPage(1); // 検索時にページを1にリセット
  };

  const handleClear = () => {
    setFilterOptions({
      dateRange: undefined,
      statuses: [],
      customerName: "",
      reservationNumber: "",
      staff: "all",
      reservationRoute: "all",
    });
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">予約一覧</h2>

      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="space-y-4">
            <DatePickerWithRange
              date={filterOptions.dateRange}
              onDateChange={handleDateRangeChange}
            />
            <div className="flex flex-wrap gap-2">
              {[
                "受付待ち",
                "受付済み",
                "施術中",
                "来店処理済み",
                "お客様キャンセル",
                "サロンキャンセル",
                "無断キャンセル",
              ].map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={status}
                    checked={filterOptions.statuses.includes(status)}
                    onCheckedChange={(checked) =>
                      handleStatusChange(status, checked as boolean)
                    }
                  />
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
                name="customerName"
                placeholder="お客様名(カナ)"
                className="w-full md:w-auto"
                value={filterOptions.customerName}
                onChange={handleInputChange}
              />
              <Input
                name="reservationNumber"
                placeholder="予約番号"
                className="w-full md:w-auto"
                value={filterOptions.reservationNumber}
                onChange={handleInputChange}
              />
              <Select
                value={filterOptions.staff}
                onValueChange={(value) => handleSelectChange("staff", value)}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="すべてのスタッフ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべてのスタッフ</SelectItem>
                  {/* スタッフの選択肢を追加 */}
                </SelectContent>
              </Select>
              <Select
                value={filterOptions.reservationRoute}
                onValueChange={(value) =>
                  handleSelectChange("reservationRoute", value)
                }
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="すべての予約経路" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての予約経路</SelectItem>
                  {/* 予約経路の選択肢を追加 */}
                </SelectContent>
              </Select>
              <Button className="w-full md:w-auto" onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" /> 検索する
              </Button>
              <Button
                variant="outline"
                className="w-full md:w-auto"
                onClick={handleClear}
              >
                <X className="mr-2 h-4 w-4" /> 条件をクリア
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <ReservationTable
            reservations={reservations}
            loading={loading}
            error={error}
            page={page}
            limit={limit}
            totalCount={totalCount}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ReservationListView;
