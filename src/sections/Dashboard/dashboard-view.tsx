"use client";
import React, { useEffect, useState } from "react";
import {
  Calendar,
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  ArrowUpRight,
  LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WeeklyRevenueChart from "@/components/revenue/weekly-revenue-chart";

interface AnimatedNumberProps {
  value: number;
}

// RevenueData 型をインポートまたは再定義
interface RevenueData {
  name: string;
  revenue: number;
}

const revenueData = [
  { name: "月", revenue: 15000 },
  { name: "火", revenue: 18000 },
  { name: "水", revenue: 22000 },
  { name: "木", revenue: 20000 },
  { name: "金", revenue: 25000 },
  { name: "土", revenue: 30000 },
  { name: "日", revenue: 28000 },
];

const upcomingAppointments = [
  { time: "14:00", client: "山田花子", service: "カット", staff: "佐藤" },
  { time: "15:30", client: "鈴木一郎", service: "カラー", staff: "田中" },
  { time: "17:00", client: "佐藤美咲", service: "パーマ", staff: "高橋" },
];

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

// StatCard コンポーネントの props 型定義
interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  subtext: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  subtext,
}) => (
  <Card className="bg-white border-none shadow-lg">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold ">{value}</div>
      <p className="text-xs  opacity-70">{subtext}</p>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  console.log("Dashboard rendered, animate:", animate); // デバッグ用ログ

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">ダッシュボード</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="本日の予約"
          value={<AnimatedNumber value={12} />}
          icon={Calendar}
          subtext="前日比 +2 予約"
        />
        <StatCard
          title="本日の売上"
          value={
            <>
              ¥<AnimatedNumber value={58000} />
            </>
          }
          icon={DollarSign}
          subtext="前日比 +15%"
        />
        <StatCard
          title="稼働中のスタッフ"
          value={<AnimatedNumber value={4} />}
          icon={Users}
          subtext="全スタッフ 6名"
        />
        <StatCard
          title="平均施術時間"
          value="1時間 15分"
          icon={Clock}
          subtext="先週比 -5分"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <WeeklyRevenueChart revenueData={revenueData} animate={animate} />
        <Card className="col-span-3 bg-white border-none shadow-lg">
          <CardHeader>
            <CardTitle>次の予約</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointments.map((appointment, index) => (
                <div key={index} className="flex items-center  p-3 rounded-md">
                  <Clock className="h-4 w-4 text-orange-dark mr-2" />
                  <div>
                    <p className="text-sm font-semibold ">
                      {appointment.time} - {appointment.client}
                    </p>
                    <p className="text-xs  opacity-70">
                      {appointment.service} (担当: {appointment.staff})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
