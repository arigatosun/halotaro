import { useState, useEffect } from 'react';
import { getReservations, Reservation } from '@/app/actions/reservationActions';
import { DateRange } from "react-day-picker";

interface FilterOptions {
  dateRange: DateRange | undefined;
  statuses: string[];
  staff: string;
}

export const useReservations = (filterOptions: FilterOptions, page: number, limit: number) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(true);
        let date: string | undefined;
        if (filterOptions.dateRange?.from) {
          date = filterOptions.dateRange.from.toISOString().split('T')[0];
        }
        const { data, count } = await getReservations(date, filterOptions.staff, page, limit);
        
        // ステータスによるフィルタリング（クライアントサイド）
        const filteredData = filterOptions.statuses.length > 0
          ? data.filter(reservation => filterOptions.statuses.includes(reservation.status))
          : data;

        console.log("Filtered reservations:", filteredData);

        setReservations(filteredData);
        setTotalCount(count);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [filterOptions, page, limit]);

  return { reservations, totalCount, loading, error };
};