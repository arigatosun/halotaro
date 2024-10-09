// Dashboard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Calendar, DollarSign, Clock, LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import CancellationCard from "@/components/CancellationCard";
import { useAuth } from "@/contexts/authcontext";
import dayjs from "dayjs";

// 型定義
interface AnimatedNumberProps {
  value: number;
}

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  subtext: React.ReactNode; // string から React.ReactNode に変更
}

interface Appointment {
  time: string;
  client: string;
  service: string;
  staff: string;
}

interface SalesSummary {
  totalSales: number;
  averageSalesPerDay: number;
}

interface DailySale {
  date: string;
  total: number;
}

interface DashboardData {
  salesSummary: SalesSummary;
  dailySales: DailySale[];
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 2000;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setDisplayValue(end);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  subtext,
}) => (
  <Card className="bg-white border-none shadow-lg h-full">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs opacity-70">{subtext}</p>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { user, session, loading: authLoading } = useAuth();

  const [todayReservations, setTodayReservations] = useState<number>(0);
  const [yesterdayReservations, setYesterdayReservations] = useState<number>(0);
  const [todaySales, setTodaySales] = useState<number>(0);
  const [yesterdaySales, setYesterdaySales] = useState<number>(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return; // 認証情報がロード中の場合は待機
    if (!user || !session) {
      setError("ユーザーがログインしていません。");
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 今日と昨日の日付を取得
        const today = dayjs();
        const yesterday = today.subtract(1, "day");

        const year = today.format("YYYY");
        const month = today.format("MM");
        const day = today.format("DD");

        // 1. 売上データを取得
        const salesResponse = await fetch(
          `/api/sales-summary?year=${year}&month=${month}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (!salesResponse.ok) {
          const errorData = await salesResponse.json();
          throw new Error(errorData.error || "売上データの取得に失敗しました");
        }

        const salesData: DashboardData = await salesResponse.json();

        // 今日の売上
        const todaySalesData = salesData.dailySales.find(
          (daySale: DailySale) => daySale.date === today.format("YYYY-MM-DD")
        );
        setTodaySales(todaySalesData ? todaySalesData.total : 0);

        // 昨日の売上
        const yesterdaySalesData = salesData.dailySales.find(
          (daySale: DailySale) => daySale.date === yesterday.format("YYYY-MM-DD")
        );
        setYesterdaySales(yesterdaySalesData ? yesterdaySalesData.total : 0);

        // 2. 今日の予約数を取得
        const reservationsTodayResponse = await fetch(`/api/reservations/today`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!reservationsTodayResponse.ok) {
          const errorData = await reservationsTodayResponse.json();
          throw new Error(errorData.error || "今日の予約データの取得に失敗しました");
        }

        const reservationsTodayData: { count: number } = await reservationsTodayResponse.json();
        setTodayReservations(reservationsTodayData.count);

        // 3. 昨日の予約数を取得
        const reservationsYesterdayResponse = await fetch(`/api/reservations/yesterday`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!reservationsYesterdayResponse.ok) {
          const errorData = await reservationsYesterdayResponse.json();
          throw new Error(errorData.error || "昨日の予約データの取得に失敗しました");
        }

        const reservationsYesterdayData: { count: number } = await reservationsYesterdayResponse.json();
        setYesterdayReservations(reservationsYesterdayData.count);

        // 4. 次の予約一覧を取得（本日の予約のみ、現在時刻より後、最大3件）
        const appointmentsResponse = await fetch(`/api/reservations/upcoming`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!appointmentsResponse.ok) {
          const errorData = await appointmentsResponse.json();
          throw new Error(errorData.error || "予約一覧の取得に失敗しました");
        }

        const appointmentsData: Appointment[] = await appointmentsResponse.json();
        setUpcomingAppointments(appointmentsData);
      } catch (err: any) {
        console.error("ダッシュボードデータの取得エラー:", err);
        setError(err.message || "データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, session, authLoading]);

  // 前日比の計算
  const reservationDifference = todayReservations - yesterdayReservations;
  const reservationDifferenceText =
    reservationDifference >= 0
      ? `前日比 +${reservationDifference}`
      : `前日比 ${reservationDifference}`;

  const salesDifference =
    yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0;
  const salesDifferenceText =
    salesDifference >= 0
      ? `前日比 +${salesDifference.toFixed(2)}%`
      : `前日比 ${salesDifference.toFixed(2)}%`;

  if (authLoading || loading) {
    return (
      <div className="p-8 pt-0">
        <h2 className="text-3xl font-bold mb-8">ダッシュボード</h2>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 pt-0">
        <h2 className="text-3xl font-bold mb-8">ダッシュボード</h2>
        <p className="text-red-500">エラー: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 pt-0">
      <h2 className="text-3xl font-bold mb-8">ダッシュボード</h2>
      <div className="grid gap-4 lg:grid-cols-3 mb-8">
        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-rows-2 lg:gap-4">
          <StatCard
            title="本日の予約"
            value={<AnimatedNumber value={todayReservations} />}
            icon={Calendar}
            subtext={
              <span
                className={`text-xs ${
                  reservationDifference >= 0 ? "text-green-500" : "text-red-500"
                } opacity-70`}
              >
                {reservationDifferenceText}
              </span>
            }
          />
          <StatCard
            title="本日の売上"
            value={
              <>
                ¥<AnimatedNumber value={todaySales} />
              </>
            }
            icon={DollarSign}
            subtext={
              <span
                className={`text-xs ${
                  salesDifference >= 0 ? "text-green-500" : "text-red-500"
                } opacity-70`}
              >
                {salesDifferenceText}
              </span>
            }
          />
        </div>
        <Card className="bg-white border-none shadow-lg lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>次の予約</CardTitle>
            <Link
              href="/dashboard/reservations"
              className="text-sm text-orange-500 hover:underline"
            >
              予約一覧→
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment, index) => (
                  <div key={index} className="flex items-center p-3 rounded-md">
                    <Clock className="h-4 w-4 text-orange-500 mr-2" />
                    <div>
                      <p className="text-sm font-semibold">
                        {appointment.time} - {appointment.client}
                      </p>
                      <p className="text-xs opacity-70">
                        {appointment.service} (担当: {appointment.staff})
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">次の予約はありません。</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <CancellationCard />
    </div>
  );
};

export default Dashboard;
