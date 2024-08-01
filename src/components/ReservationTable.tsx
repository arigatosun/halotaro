"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import generateRandomReservations from "@/utils/generateRandomReservations";
import { DateRange } from "react-day-picker";

// FilterOptions インターフェースを直接定義
interface FilterOptions {
  dateRange: DateRange | undefined;
  statuses: string[];
  customerName: string;
  reservationNumber: string;
  staff: string;
  reservationRoute: string;
}

interface Reservation {
  key: string;
  date: string;
  time: string;
  status: string;
  customerName: string;
  staff: string;
  service: string;
  price: number;
}

interface ReservationTableProps {
  filterOptions: FilterOptions;
}

const ReservationTable: React.FC<ReservationTableProps> = ({
  filterOptions,
}) => {
  const [allReservations] = useState<Reservation[]>(
    generateRandomReservations(50)
  );
  const [filteredReservations, setFilteredReservations] =
    useState<Reservation[]>(allReservations);

  useEffect(() => {
    const filtered = allReservations.filter((reservation) => {
      const dateInRange =
        !filterOptions.dateRange ||
        (filterOptions.dateRange.from &&
          filterOptions.dateRange.to &&
          new Date(reservation.date) >= filterOptions.dateRange.from &&
          new Date(reservation.date) <= filterOptions.dateRange.to);

      const statusMatch =
        filterOptions.statuses.length === 0 ||
        filterOptions.statuses.includes(reservation.status);

      const customerNameMatch =
        filterOptions.customerName === "" ||
        reservation.customerName
          .toLowerCase()
          .includes(filterOptions.customerName.toLowerCase());

      const reservationNumberMatch =
        filterOptions.reservationNumber === "" ||
        reservation.key.includes(filterOptions.reservationNumber);

      const staffMatch =
        filterOptions.staff === "all" ||
        reservation.staff === filterOptions.staff;

      // 予約経路のフィルタリングはこの例では省略しています

      return (
        dateInRange &&
        statusMatch &&
        customerNameMatch &&
        reservationNumberMatch &&
        staffMatch
      );
    });

    setFilteredReservations(filtered);
  }, [filterOptions, allReservations]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>来店日時</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>お客様名</TableHead>
          <TableHead>スタッフ</TableHead>
          <TableHead>メニュー</TableHead>
          <TableHead>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredReservations.map((reservation) => (
          <TableRow key={reservation.key}>
            <TableCell>
              {reservation.date} {reservation.time}
            </TableCell>
            <TableCell>{reservation.status}</TableCell>
            <TableCell>{reservation.customerName}</TableCell>
            <TableCell>{reservation.staff}</TableCell>
            <TableCell>{reservation.service}</TableCell>
            <TableCell>
              <Link
                href={`/dashboard/reservations/${reservation.key}/accounting`}
              >
                <Button variant="outline">会計</Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ReservationTable;
