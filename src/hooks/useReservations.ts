import { useState, useEffect, useCallback } from "react";
import { Reservation } from "@/app/actions/reservationActions";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useAuth } from "@/contexts/authcontext";
import { useRouter } from "next/router";

interface FilterOptions {
  dateRange: DateRange | undefined;
  statuses: string[];
  customerName: string;
  menu: string;
  staff: string;
  reservationRoute: string;
}

export const useReservations = (
  filterOptions: FilterOptions,
  page: number,
  limit: number
) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchReservations = useCallback(async () => {
    if (!user) {
      setError(new Error("ユーザーが認証されていません"));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let date: string | undefined;
      if (filterOptions.dateRange?.from) {
        date = format(filterOptions.dateRange.from, "yyyy-MM-dd");
      }

      const params = new URLSearchParams();
      if (date) params.append("date", date);
      if (filterOptions.staff && filterOptions.staff !== "all")
        params.append("staff", filterOptions.staff);
      if (filterOptions.menu) params.append("menu", filterOptions.menu);
      if (filterOptions.statuses.length > 0)
        params.append("statuses", filterOptions.statuses.join(","));
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const response = await fetch(
        `/api/get-reservations?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "user-id": user.id,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "データの取得に失敗しました");
      }

      const { data = [], count = 0 } = await response.json();

      const filteredData = filterOptions.customerName
        ? data.filter((reservation: Reservation) =>
            reservation.customer_name.includes(filterOptions.customerName)
          )
        : data;

      setReservations(filteredData);
      setTotalCount(count);
    } catch (err) {
      console.error("Error in fetchReservations:", err);
      setError(
        err instanceof Error ? err : new Error("Unknown error occurred")
      );
    } finally {
      setLoading(false);
    }
  }, [filterOptions, page, limit, user]);

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
