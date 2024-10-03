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

// ステータスの型を定義
type ReservationStatus =
  | "confirmed"
  | "canceled"
  | "paid"
  | "completed"
  | "in_progress"
  | "no_show";

// ステータスのマッピングを定義
const statusMapping: Record<ReservationStatus, string> = {
  confirmed: "予約確定",
  canceled: "キャンセル",
  paid: "会計済み",
  completed: "完了",
  in_progress: "進行中",
  no_show: "無断キャンセル",
};

interface ReservationTableProps {
  filterOptions?: {
    dateRange: undefined | [Date, Date];
    statuses: string[];
    customerName: string;
    reservationNumber: string;
    staff: string;
    reservationRoute: string;
  };
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
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  const totalPages = Math.ceil(totalCount / limit);

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
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((reservation) => {
            // 予約ステータスが "paid"（支払い済み）の場合、ボタンを無効化しリンクを外す
            const ispaid = reservation.status === "paid";
            return (
              <TableRow key={reservation.id}>
                <TableCell>
                  {format(new Date(reservation.start_time), "yyyy-MM-dd HH:mm:ss")}
                </TableCell>
                <TableCell>
                  {statusMapping[reservation.status as ReservationStatus] ||
                    reservation.status}
                </TableCell>
                <TableCell>{reservation.customer_name}</TableCell>
                <TableCell>{reservation.menu_name}</TableCell>
                <TableCell>{reservation.staff_name}</TableCell>
                <TableCell>¥{reservation.total_price.toLocaleString()}</TableCell>
                <TableCell>
                  {ispaid ? (
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
          Previous
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          Next
        </Button>
      </div>
    </>
  );
};

export default ReservationTable;
