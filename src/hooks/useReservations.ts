import { useState, useEffect, useCallback } from "react";
import { Reservation, getReservations } from "@/app/actions/reservationActions";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";

interface FilterOptions {
  dateRange: DateRange | undefined;
  statuses: string[];
  customerName: string;
  menu: string;
  staff: string;
  reservationRoute: string;
}

export const useReservations = (
  user_id: string | undefined,
  filterOptions: FilterOptions,
  page: number,
  limit: number
) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReservations = useCallback(async () => {
    if (!user_id) {
      setError(new Error("ユーザーが認証されていません"));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let dateFrom: string | undefined;
      let dateTo: string | undefined;
      if (filterOptions.dateRange?.from) {
        dateFrom = format(filterOptions.dateRange.from, "yyyy-MM-dd");
      }
      if (filterOptions.dateRange?.to) {
        dateTo = format(filterOptions.dateRange.to, "yyyy-MM-dd");
      }

      const { data, count } = await getReservations(
        supabase,
        user_id,
        {
          dateFrom,
          dateTo,
          staff: filterOptions.staff,
          menu: filterOptions.menu,
          statuses: filterOptions.statuses,
          customerName: filterOptions.customerName,
          reservationRoute: filterOptions.reservationRoute,
        },
        page,
        limit
      );

      setReservations(data);
      setTotalCount(count);
    } catch (err) {
      console.error("Error in fetchReservations:", err);
      setError(
        err instanceof Error ? err : new Error("Unknown error occurred")
      );
    } finally {
      setLoading(false);
    }
  }, [user_id, filterOptions, page, limit]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  return {
    reservations,
    totalCount,
    loading,
    error,
    refetch: fetchReservations,
  };
};
