// ReservationTable.tsx
"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Reservation } from "@/app/actions/reservationActions";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

// ステータスのマッピングを定義（'staff'を削除）
const statusMapping: Record<string, string> = {
  confirmed: "受付待ち",
  salon_cancelled: "サロンキャンセル",
  paid: "会計済み",
  cancelled: "お客様キャンセル",
  same_day_cancelled: "当日キャンセル",
  no_show: "無断キャンセル",
};

interface ReservationTableProps {
  reservations: Reservation[];
  loading: boolean;
  error: Error | null;
  page: number;
  limit: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

const ReservationTable: React.FC<ReservationTableProps> = ({
  reservations,
  loading,
  error,
  page,
  limit,
  totalCount,
  onPageChange,
}) => {
  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div>エラー: {error.message}</div>;
  }

  const totalPages = Math.ceil(totalCount / limit);
  const now = new Date();

  return (
    <>
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
            // 予約の開始日時が現在時刻より未来かどうかを判定
            const reservationStartTime = new Date(reservation.start_time);
            const isFutureReservation = reservationStartTime > now;

            // 会計ボタンを無効化する条件
            const disableAccountingButton =
              reservation.status !== "confirmed" || isFutureReservation;

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
            );
          })}
        </TableBody>
      </Table>
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
  );
};

export default ReservationTable;
