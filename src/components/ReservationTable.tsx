import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Reservation } from "@/app/actions/reservationActions"
import { format, differenceInMinutes } from "date-fns"
import { ja } from "date-fns/locale"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { Clock, User, Scissors } from "lucide-react"

const statusMapping: Record<string, string> = {
  confirmed: "受付待ち",
  salon_cancelled: "サロンキャンセル",
  paid: "会計済み",
  cancelled: "お客様キャンセル",
  same_day_cancelled: "当日キャンセル",
  no_show: "無断キャンセル",
}

const statusColorMapping: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-800",
  salon_cancelled: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-yellow-100 text-yellow-800",
  same_day_cancelled: "bg-orange-100 text-orange-800",
  no_show: "bg-purple-100 text-purple-800",
}

interface ReservationTableProps {
  reservations: Reservation[]
  loading: boolean
  error: Error | null
  page: number
  limit: number
  totalCount: number
  onPageChange: (page: number) => void
}

export default function ReservationTable({
  reservations,
  loading,
  error,
  page,
  limit,
  totalCount,
  onPageChange,
}: ReservationTableProps) {
  const isMobile = useMediaQuery("(max-width: 640px)")

  if (loading) {
    return <div>読み込み中...</div>
  }

  if (error) {
    return <div>エラー: {error.message}</div>
  }

  const totalPages = Math.ceil(totalCount / limit)
  const now = new Date()

  return (
    <>
      {isMobile ? (
        <div className="grid gap-4">
          {reservations.map((reservation) => {
            const startTime = new Date(reservation.start_time)
            const endTime = new Date(reservation.end_time)
            const duration = differenceInMinutes(endTime, startTime)
            const formattedDuration = duration >= 60
              ? `${Math.floor(duration / 60)}時間${duration % 60 > 0 ? `${duration % 60}分` : ''}`
              : `${duration}分`

            return (
              <Card key={reservation.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className={`p-2 ${statusColorMapping[reservation.status] || 'bg-gray-100 text-gray-800'}`}>
                    {statusMapping[reservation.status] || reservation.status}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="text-lg font-semibold">
                        {format(startTime, "yyyy/MM/dd HH:mm", { locale: ja })}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        所要時間 {formattedDuration}
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="w-4 h-4 mr-2" />
                      {reservation.staff_name}
                    </div>
                    <div className="text-sm">{reservation.customer_name} 様</div>
                    <div className="flex items-center text-sm">
                      <Scissors className="w-4 h-4 mr-2" />
                      {reservation.menu_name}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日時</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>お客様名</TableHead>
              <TableHead>メニュー</TableHead>
              <TableHead>担当スタッフ</TableHead>
              <TableHead>合計金額</TableHead>
              <TableHead>会計</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((reservation) => {
              const reservationStartTime = new Date(reservation.start_time)
              const isFutureReservation = reservationStartTime > now
              const disableAccountingButton =
                reservation.status !== "confirmed" || isFutureReservation

              return (
                <TableRow key={reservation.id}>
                  <TableCell>
                    {format(new Date(reservation.start_time), "yyyy-MM-dd HH:mm:ss", {
                      locale: ja,
                    })}
                  </TableCell>
                  <TableCell>
                    {statusMapping[reservation.status] || reservation.status}
                  </TableCell>
                  <TableCell>{reservation.customer_name}</TableCell>
                  <TableCell>{reservation.menu_name}</TableCell>
                  <TableCell>{reservation.staff_name}</TableCell>
                  <TableCell>¥{reservation.total_price.toLocaleString()}</TableCell>
                  <TableCell>
                    {disableAccountingButton ? (
                      <Button
                        variant="outline"
                        disabled
                        className="bg-gray-300 text-gray-700 cursor-not-allowed"
                      >
                        会計
                      </Button>
                    ) : (
                      <Link href={`/dashboard/reservations/${reservation.id}/accounting`}>
                        <Button variant="outline">会計</Button>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
      <div className="mt-4 flex justify-between items-center">
        <Button onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          前の{limit}件
        </Button>
        <span>
          ページ {page} / {totalPages}
        </span>
        <Button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          次の{limit}件
        </Button>
      </div>
    </>
  )
}