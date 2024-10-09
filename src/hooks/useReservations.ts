// useReservations.ts
import { useState, useEffect } from 'react';
import { getReservations, Reservation } from '@/app/actions/reservationActions';
import { DateRange } from "react-day-picker";
import { format } from 'date-fns';

interface FilterOptions {
  dateRange: DateRange | undefined;
  statuses: string[];
  customerName: string;
  menu: string;
  staff: string;
  reservationRoute: string;
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
          // 日本時間に合わせて日付をフォーマット
          date = format(filterOptions.dateRange.from, 'yyyy-MM-dd');
        }
        const { data, count } = await getReservations(
          date,
          filterOptions.staff,
          filterOptions.menu,
          filterOptions.statuses, // ステータスを追加
          page,
          limit
        );

        // お客様名によるフィルタリング（クライアントサイド）
        const filteredData = filterOptions.customerName
          ? data.filter(reservation =>
              reservation.customer_name.includes(filterOptions.customerName)
            )
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
