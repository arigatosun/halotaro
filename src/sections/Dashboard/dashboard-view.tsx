"use client";

import React, { useEffect, useState, useRef } from "react";
import { Calendar, DollarSign, Clock, LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import CancellationCard from "@/components/CancellationCard";
import { useAuth } from "@/contexts/authcontext";
import dayjs from "dayjs";

interface AnimatedNumberProps {
  value: number;
}

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  subtext: React.ReactNode;
}

interface Appointment {
  time: string;
  client: string;
  service: string;
  staff: string;
}

interface DashboardData {
  todayReservations: number;
  yesterdayReservations: number;
  todaySales: number;
  yesterdaySales: number;
  upcomingAppointments: Appointment[];
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
  const [upcomingAppointments, setUpcomingAppointments] = useState<
    Appointment[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRef = useRef<boolean>(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) {
      setError("ユーザーがログインしていません。");
      setLoading(false);
      return;
    }

    if (fetchRef.current) return;
    fetchRef.current = true;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/dashboard`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "ダッシュボードデータの取得に失敗しました"
          );
        }

        const data: DashboardData = await response.json();

        setTodayReservations(data.todayReservations);
        setYesterdayReservations(data.yesterdayReservations);
        setTodaySales(data.todaySales);
        setYesterdaySales(data.yesterdaySales);
        setUpcomingAppointments(data.upcomingAppointments);
      } catch (err: any) {
        console.error("ダッシュボードデータの取得エラー:", err);
        setError(err.message || "データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, session, authLoading]);

  const reservationDifference = todayReservations - yesterdayReservations;
  const reservationDifferenceText =
    reservationDifference >= 0
      ? `前日比 +${reservationDifference}`
      : `前日比 ${reservationDifference}`;

  const salesDifference =
    yesterdaySales > 0
      ? ((todaySales - yesterdaySales) / yesterdaySales) * 100
      : 0;
  const salesDifferenceText =
    salesDifference >= 0
      ? `前日比 +${salesDifference.toFixed(2)}%`
      : `前日比 ${salesDifference.toFixed(2)}%`;

  if (authLoading || loading) {
    return (
      <div className="p-4 md:p-8 pt-0">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8">
          ダッシュボード
        </h2>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 pt-0">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8">
          ダッシュボード
        </h2>
        <p className="text-red-500">エラー: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pt-0">
      <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8">
        ダッシュボード
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4 md:mb-8">
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
        <Card className="bg-white border-none shadow-lg md:col-span-2 lg:col-span-1">
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
                    <Clock className="h-4 w-4 text-orange-500 mr-2 flex-shrink-0" />
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
