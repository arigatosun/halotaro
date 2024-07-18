"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { Calendar, Users, DollarSign, Clock } from "lucide-react";

// ダミーデータ
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

interface StatCardProps {
  title: string;
  value: ReactNode; // string | number から ReactNode に変更
  icon: ReactNode;
  subtext: string;
}

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 2000; // 2秒間
    const increment = end / (duration / 16); // 60fpsを想定

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

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, subtext }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-yellow-400">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <div className="text-red-500">{icon}</div>
    </div>
    <div className="text-3xl font-bold text-gray-900">{value}</div>
    <p className="text-sm text-gray-600 mt-2">{subtext}</p>
  </div>
);

const Dashboard: React.FC = () => {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-red-50 flex">
      <main className="flex-1 p-8">
        <h2 className="text-4xl font-bold mb-8 text-gray-800">
          ダッシュボード
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
          <StatCard
            title="本日の予約"
            value={<AnimatedNumber value={12} />}
            icon={<Calendar className="w-6 h-6" />}
            subtext="前日比 +2 予約"
          />
          <StatCard
            title="本日の売上"
            value={
              <>
                ¥<AnimatedNumber value={58000} />
              </>
            }
            icon={<DollarSign className="w-6 h-6" />}
            subtext="前日比 +15%"
          />
          <StatCard
            title="稼働中のスタッフ"
            value={<AnimatedNumber value={4} />}
            icon={<Users className="w-6 h-6" />}
            subtext="全スタッフ 6名"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-6 text-gray-800">
              週間売上推移
            </h3>
            <div className="h-64 flex items-end relative">
              {revenueData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className={`bg-red-500 w-4/5 cursor-pointer relative transition-all duration-1000 ease-out ${
                      animate ? "" : "h-0"
                    }`}
                    style={{
                      height: animate ? `${data.revenue / 300}px` : "0",
                    }}
                    onMouseEnter={() => setHoveredBar(index)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {hoveredBar === index && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs">
                        ¥{data.revenue.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <span className="text-xs mt-2 text-gray-600">
                    {data.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-6 text-gray-800">
              次の予約
            </h3>
            <ul className="space-y-4">
              {upcomingAppointments.map((appointment, index) => (
                <li key={index} className="flex items-center space-x-4">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="font-semibold text-gray-800">
                      {appointment.time} - {appointment.client}
                    </p>
                    <p className="text-sm text-gray-600">
                      {appointment.service} (担当: {appointment.staff})
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
