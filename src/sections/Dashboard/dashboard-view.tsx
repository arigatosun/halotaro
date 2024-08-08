// Dashboard.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Calendar, DollarSign, Clock, LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import CancellationCard from "@/components/CancellationCard";

interface AnimatedNumberProps {
  value: number;
}

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
  const upcomingAppointments = [
    { time: "14:00", client: "山田花子", service: "カット", staff: "佐藤" },
    { time: "15:30", client: "鈴木一郎", service: "カラー", staff: "田中" },
    { time: "17:00", client: "佐藤美咲", service: "パーマ", staff: "高橋" },
  ];

  return (
    <div className="p-8 pt-0">
      <h2 className="text-3xl font-bold mb-8">ダッシュボード</h2>
      <div className="grid gap-4 lg:grid-cols-3 mb-8">
        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-rows-2 lg:gap-4">
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
              {upcomingAppointments.map((appointment, index) => (
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <CancellationCard />
    </div>
  );
};

export default Dashboard;
