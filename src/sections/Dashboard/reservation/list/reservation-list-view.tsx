'use client'

import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range"
import ReservationTable from "@/components/ReservationTable"
import { DateRange } from "react-day-picker"
import { Search, X, ChevronDown } from "lucide-react"
import { useReservations } from "@/hooks/useReservations"
import { useAuth } from "@/contexts/authcontext"
import { supabase } from "@/lib/supabaseClient"
import { format, addDays, subDays } from "date-fns"

interface FilterOptions {
  dateRange: DateRange | undefined
  statuses: string[]
  customerName: string
  menu: string
  staff: string
  reservationRoute: string
}

interface Staff {
  id: string
  name: string
}

const statusOptions = [
  { value: "paid", label: "会計済み" },
  { value: "confirmed", label: "受付待ち" },
  { value: "cancelled", label: "お客様キャンセル" },
  { value: "salon_cancelled", label: "サロンキャンセル" },
  { value: "same_day_cancelled", label: "当日キャンセル" },
  { value: "no_show", label: "無断キャンセル" },
]

export default function ReservationListView() {
  const { user } = useAuth()
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    dateRange: { from: new Date(), to: new Date() },
    statuses: [],
    customerName: "",
    menu: "",
    staff: "all",
    reservationRoute: "all",
  })
  const [page, setPage] = useState(1)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const limit = 10

  const { reservations, loading, error, totalCount } = useReservations(
    filterOptions,
    page,
    limit
  )

  useEffect(() => {
    if (user) {
      const fetchStaffData = async () => {
        const { data, error } = await supabase
          .from("staff")
          .select("*")
          .eq("user_id", user.id)

        if (error) {
          console.error("スタッフ情報の取得エラー:", error)
        } else if (data) {
          setStaffList(data as Staff[])
        }
      }

      fetchStaffData()
    }
  }, [user])

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setFilterOptions((prev) => ({ ...prev, dateRange: range }))
    setPage(1)
  }

  const handleStatusChange = (status: string, checked: boolean) => {
    setFilterOptions((prev) => ({
      ...prev,
      statuses: checked
        ? [...prev.statuses, status]
        : prev.statuses.filter((s) => s !== status),
    }))
    setPage(1)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFilterOptions((prev) => ({ ...prev, [name]: value }))
    setPage(1)
  }

  const handleSelectChange = (name: string, value: string) => {
    setFilterOptions((prev) => ({ ...prev, [name]: value }))
    setPage(1)
  }

  const handleSearch = () => {
    setPage(1)
    setIsFilterOpen(false)
  }

  const handleClear = () => {
    setFilterOptions({
      dateRange: { from: new Date(), to: new Date() },
      statuses: [],
      customerName: "",
      menu: "",
      staff: "all",
      reservationRoute: "all",
    })
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen)
  }

  const handleDateChange = (direction: 'previous' | 'today' | 'next') => {
    const currentDate = filterOptions.dateRange?.from || new Date()
    let newDate: Date

    switch (direction) {
      case 'previous':
        newDate = subDays(currentDate, 1)
        break
      case 'today':
        newDate = new Date()
        break
      case 'next':
        newDate = addDays(currentDate, 1)
        break
    }

    setFilterOptions((prev) => ({
      ...prev,
      dateRange: { from: newDate, to: newDate },
    }))
    setPage(1)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl md:text-3xl font-bold">予約一覧</h2>
        <div className="flex space-x-2">
          <Button size="sm" onClick={() => handleDateChange('previous')}>前日</Button>
          <Button size="sm" onClick={() => handleDateChange('today')}>本日</Button>
          <Button size="sm" onClick={() => handleDateChange('next')}>翌日</Button>
        </div>
      </div>

      <div className="md:hidden mb-4">
        <Button onClick={toggleFilter} className="w-full justify-between">
          絞り込み検索 <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      <Card className={`mb-4 md:mb-8 ${isFilterOpen ? '' : 'hidden md:block'}`}>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            <DatePickerWithRange
              date={filterOptions.dateRange}
              onDateChange={handleDateRangeChange}
            />
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(({ value, label }) => (
                <div key={value} className="flex items-center space-x-2">
                  <Checkbox
                    id={value}
                    checked={filterOptions.statuses.includes(value)}
                    onCheckedChange={(checked) =>
                      handleStatusChange(value, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {label}
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
                name="menu"
                placeholder="メニュー"
                className="w-full md:w-auto"
                value={filterOptions.menu}
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
                  {staffList.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
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
  )
}