"use client";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { getReservations} from "@/app/actions/reservationActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Reservation } from "@/types/reservation";

const ReservationView: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching reservations...");
      console.log("Params:", {
        date: format(selectedDate, "yyyy-MM-dd"),
        staff: selectedStaff,
        page,
        limit
      });
      const { data, count } = await getReservations(
        format(selectedDate, "yyyy-MM-dd"),
        selectedStaff,
        page,
        limit
      );
      console.log("Fetched reservations:", data);
      console.log("Total count:", count);
      setReservations(data);
      setTotalCount(count);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      setError("予約の取得中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [selectedDate, selectedStaff, page]);

  const handleDateChange = (date: Date) => {
    console.log("Date changed to:", date);
    setSelectedDate(date);
    setPage(1);
  };

  const handleStaffChange = (value: string) => {
    console.log("Staff changed to:", value);
    setSelectedStaff(value);
    setPage(1);
  };

  const handleNextPage = () => {
    setPage((prevPage) => prevPage + 1);
  };

  const handlePrevPage = () => {
    setPage((prevPage) => Math.max(prevPage - 1, 1));
  };

  console.log("Current reservations:", reservations);

  return (
    <div className="p-4">
      <div className="mb-4 flex space-x-4">
        <Input
          type="date"
          value={format(selectedDate, "yyyy-MM-dd")}
          onChange={(e) => handleDateChange(new Date(e.target.value))}
        />
        <Select value={selectedStaff} onValueChange={handleStaffChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {/* Add more staff options here */}
          </SelectContent>
        </Select>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日時</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>お客様名</TableHead>
                <TableHead>メニュー</TableHead>
                <TableHead>スタッフ</TableHead>
                <TableHead>合計金額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
  {reservations.length === 0 ? (
    <TableRow>
      <TableCell colSpan={6}>No reservations found</TableCell>
    </TableRow>
  ) : (
    reservations.map((reservation) => (
      <TableRow key={reservation.id}>
        <TableCell>{format(new Date(reservation.start_time), "yyyy-MM-dd")}</TableCell>
        <TableCell>{format(new Date(reservation.start_time), "HH:mm")}</TableCell>
        <TableCell>{reservation.user_id}</TableCell>
        <TableCell>-</TableCell> {/* メニューは空白 */}
        <TableCell>{reservation.staff_id || "Unassigned"}</TableCell>
        <TableCell>{reservation.status}</TableCell>
        <TableCell>¥{reservation.total_price.toLocaleString()}</TableCell>
      </TableRow>
    ))
  )}
</TableBody>
          </Table>
          <div className="mt-4 flex justify-between">
            <Button onClick={handlePrevPage} disabled={page === 1}>
              Previous
            </Button>
            <span>
              Page {page} of {Math.ceil(totalCount / limit)}
            </span>
            <Button onClick={handleNextPage} disabled={page * limit >= totalCount}>
              Next
            </Button>
          </div>
        </>
      )}
      <div className="mt-4">
        <h3>Debug Info:</h3>
        <pre>{JSON.stringify({ selectedDate, selectedStaff, page, limit, totalCount }, null, 2)}</pre>
        <h3>Reservations:</h3>
        <pre>{JSON.stringify(reservations, null, 2)}</pre>
      </div>
    </div>
  );
};

export default ReservationView;