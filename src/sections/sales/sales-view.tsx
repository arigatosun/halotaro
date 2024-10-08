"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Calendar, DollarSign, TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import { useAuth } from "@/contexts/authcontext";

dayjs.locale("ja");

interface SalesSummary {
  totalSales: number;
  averageSalesPerDay: number;
  previousTotalSales?: number;
  previousAverageSalesPerDay?: number;
}

interface DailySales {
  date: string;
  total: number;
}

const SalesManagement: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month() + 1); // 1-12
  const [salesSummary, setSalesSummary] = useState<SalesSummary>({
    totalSales: 0,
    averageSalesPerDay: 0,
  });
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { session } = useAuth(); // ユーザー情報を取得

  const fetchSalesSummary = async (year: number, month: number) => {
    if (!session) return;

    setLoading(true);
    setError(null);
    try {
      // 現在の月のデータを取得
      const responseCurrent = await axios.get("/api/sales-summary", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        params: {
          year,
          month, // 1-12
        },
      });

      const { salesSummary: currentSummary, dailySales: currentDailySales } =
        responseCurrent.data;

      // 先月の年と月を計算
      const date = new Date(year, month - 2, 1); // 先月
      const prevMonth = date.getMonth() + 1; // 1-12
      const prevYear = date.getFullYear();

      // 先月のデータを取得
      let previousSummary: { totalSales: number; averageSalesPerDay: number } | null =
        null;
      try {
        const responsePrev = await axios.get("/api/sales-summary", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          params: {
            year: prevYear,
            month: prevMonth, // 1-12
          },
        });

        previousSummary = responsePrev.data.salesSummary;
      } catch (error) {
        console.warn(
          "先月の売上データが存在しないか取得できませんでした。"
        );
      }

      // 状態を更新（現在と先月のデータ）
      setSalesSummary({
        totalSales: currentSummary.totalSales,
        averageSalesPerDay: currentSummary.averageSalesPerDay,
        previousTotalSales: previousSummary?.totalSales,
        previousAverageSalesPerDay: previousSummary?.averageSalesPerDay,
      });

      // 全ての日を含むデータを生成（未来の日付を除外）
      const preparedDailySales = prepareDailySalesData(
        currentDailySales,
        year,
        month
      );
      setDailySales(preparedDailySales);
    } catch (error: any) {
      console.error("月間売上データの取得エラー:", error);
      setError("売上データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 選択された月の過去の日付（および今日）までの売上データを準備します。
   * 売上がない日は total を 0 に設定し、未来の日付は除外します。
   * データは昇順（古い日付から新しい日付）にソートされます。
   */
  const prepareDailySalesData = (
    dailySales: DailySales[],
    year: number,
    month: number
  ): DailySales[] => {
    const selectedDate = dayjs(`${year}-${month}-01`);
    const daysInMonth = selectedDate.daysInMonth();
    const today = dayjs();
    const isCurrentMonth =
      selectedDate.year() === today.year() &&
      selectedDate.month() === today.month();

    // 選択された月の基準日付
    const endDay = isCurrentMonth ? today.date() : daysInMonth;

    // 全ての対象日を生成
    const allDays: DailySales[] = Array.from({ length: endDay }, (_, i) => {
      const day = i + 1;
      return {
        date: dayjs(`${year}-${month}-${day}`).format("YYYY-MM-DD"),
        total: 0,
      };
    });

    // 売上データをマップ化
    const salesMap = new Map(dailySales.map((sale) => [sale.date, sale.total]));

    // 売上がある日は total を設定
    const preparedData = allDays.map((day) => ({
      date: day.date,
      total: salesMap.get(day.date) || 0,
    }));

    // 昇順（古い日付順）にソート
    return preparedData.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  };

  useEffect(() => {
    if (session) {
      fetchSalesSummary(selectedYear, selectedMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, selectedYear, selectedMonth]);

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(Number(event.target.value));
  };

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(Number(event.target.value));
  };

  const getPercentageChange = (
    current: number,
    previous?: number
  ) => {
    if (previous === undefined || previous === 0) {
      return "---";
    }
    const change = ((current - previous) / previous) * 100;
    return `${change.toFixed(2)}%`;
  };

  if (loading) {
    return <p className="p-4">読み込み中...</p>;
  }

  // 年の選択肢を生成（例えば、過去50年から現在まで）
  const currentYear = dayjs().year();
  const years = Array.from(new Array(50), (_, index) => currentYear - index);

  // 月の選択肢を生成
  const months = Array.from(new Array(12), (_, index) => index + 1);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">売上管理</h1>

      {/* エラーメッセージの表示 */}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="flex items-center mb-6">
        <Calendar className="w-5 h-5 mr-2 text-gray-500" />

        {/* 年選択ドロップダウン */}
        <select
          value={selectedYear}
          onChange={handleYearChange}
          className="border p-2 rounded mr-2"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}年
            </option>
          ))}
        </select>

        {/* 月選択ドロップダウン */}
        <select
          value={selectedMonth}
          onChange={handleMonthChange}
          className="border p-2 rounded"
        >
          {months.map((month) => (
            <option key={month} value={month}>
              {month}月
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SalesCard
          title="月間売上"
          value={`¥${salesSummary.totalSales.toLocaleString()}`}
          icon={<DollarSign className="w-6 h-6" />}
          trend={`${getPercentageChange(
            salesSummary.totalSales,
            salesSummary.previousTotalSales
          )} 先月比`}
        />
        <SalesCard
          title="平均売上/日"
          value={`¥${salesSummary.averageSalesPerDay.toLocaleString()}`}
          icon={<TrendingUp className="w-6 h-6" />}
          trend={`${getPercentageChange(
            salesSummary.averageSalesPerDay,
            salesSummary.previousAverageSalesPerDay
          )} 先月比`}
        />
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            売上推移（{dayjs(`${selectedYear}-${selectedMonth}-01`).format("YYYY年M月")}）
          </h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailySales}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => dayjs(date).format("D")}
              interval="preserveStartEnd"
            />
            <YAxis />
            <Tooltip labelFormatter={(date) => dayjs(date).format("M月D日")} />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#8884d8"
              name="日間売上"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            売上詳細（{dayjs(`${selectedYear}-${selectedMonth}-01`).format("YYYY年M月")}）
          </h2>
          {/* 一旦非表示
          <Button variant={"outline"}>
            <Download className="w-4 h-4 mr-2" />
            エクスポート
          </Button>*/}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">日付</th>
                <th className="px-4 py-2 text-right">総売上</th>
              </tr>
            </thead>
            <tbody>
              {dailySales
                .slice()
                .reverse() // データを降順に並び替え
                .map((day, index) => (
                  <tr
                    key={day.date} // キーを日付に変更
                    className={index % 2 === 0 ? "bg-gray-50" : ""}
                  >
                    <td className="px-4 py-2">
                      {dayjs(day.date).format("YYYY/MM/DD")}
                    </td>
                    <td className="px-4 py-2 text-right">
                      ¥{day.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface SalesCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
}

const SalesCard: React.FC<SalesCardProps> = ({
  title,
  value,
  icon,
  trend,
}) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      {icon}
    </div>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-sm text-gray-500">{trend}</div>
  </div>
);

export default SalesManagement;
