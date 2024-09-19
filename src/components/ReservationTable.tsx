import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Reservation } from "@/types/reservation";
import Link from 'next/link';
import { format } from 'date-fns';

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
            <TableHead>お客様ID</TableHead>
            <TableHead>メニューID</TableHead>
            <TableHead>スタッフID</TableHead>
            <TableHead>合計金額</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((reservation) => (
            <TableRow key={reservation.id}>
              <TableCell>{format(new Date(reservation.start_time), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
              <TableCell>{reservation.status}</TableCell>
              <TableCell>{reservation.id}</TableCell>
              <TableCell>{reservation.menu_id}</TableCell>
              <TableCell>{reservation.staff_id || 'N/A'}</TableCell>
              <TableCell>¥{reservation.total_price.toLocaleString()}</TableCell>
              <TableCell>
                <Link href={`/reservations/${reservation.id}`}>
                  <Button variant="outline">詳細</Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
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