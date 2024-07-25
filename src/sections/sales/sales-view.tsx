"use client";

import React, { useState } from "react";
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

// ダミーデータ
const salesData = [
  { date: "2023-07-01", total: 45000, services: 35000, products: 10000 },
  { date: "2023-07-02", total: 52000, services: 40000, products: 12000 },
  { date: "2023-07-03", total: 48000, services: 38000, products: 10000 },
  { date: "2023-07-04", total: 55000, services: 42000, products: 13000 },
  { date: "2023-07-05", total: 60000, services: 45000, products: 15000 },
  { date: "2023-07-06", total: 58000, services: 43000, products: 15000 },
  { date: "2023-07-07", total: 65000, services: 50000, products: 15000 },
];

const SalesManagement: React.FC = () => {
  const [dateRange, setDateRange] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );

  const totalSales = salesData.reduce((sum, day) => sum + day.total, 0);
  const averageSales = totalSales / salesData.length;

  const handleDateRangeChange = (range: "daily" | "weekly" | "monthly") => {
    setDateRange(range);
    // ここで日付範囲に応じたデータ取得処理を実装
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">売上管理</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SalesCard
          title="総売上"
          value={`¥${totalSales.toLocaleString()}`}
          icon={<DollarSign className="w-6 h-6" />}
          trend="+15% 先週比"
        />
        <SalesCard
          title="平均売上/日"
          value={`¥${averageSales.toLocaleString()}`}
          icon={<TrendingUp className="w-6 h-6" />}
          trend="+5% 先月比"
        />
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">売上推移</h2>
          <div className="space-x-2">
            <Button
              onClick={() => handleDateRangeChange("daily")}
              variant={dateRange === "daily" ? "default" : "outline"}
              className={
                dateRange === "daily"
                  ? "bg-primary text-primary-foreground"
                  : ""
              }
            >
              日次
            </Button>
            <Button
              onClick={() => handleDateRangeChange("weekly")}
              variant={dateRange === "weekly" ? "default" : "outline"}
              className={
                dateRange === "weekly"
                  ? "bg-primary text-primary-foreground"
                  : ""
              }
            >
              週次
            </Button>
            <Button
              onClick={() => handleDateRangeChange("monthly")}
              variant={dateRange === "monthly" ? "default" : "outline"}
              className={
                dateRange === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : ""
              }
            >
              月次
            </Button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#8884d8"
              name="総売上"
            />
            <Line
              type="monotone"
              dataKey="services"
              stroke="#82ca9d"
              name="サービス"
            />
            <Line
              type="monotone"
              dataKey="products"
              stroke="#ffc658"
              name="商品"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">売上詳細</h2>
          <Button variant={"outline"}>
            <Download className="w-4 h-4 mr-2" />
            エクスポート
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">日付</th>
                <th className="px-4 py-2 text-right">総売上</th>
                <th className="px-4 py-2 text-right">サービス売上</th>
                <th className="px-4 py-2 text-right">商品売上</th>
              </tr>
            </thead>
            <tbody>
              {salesData.map((day, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="px-4 py-2">{day.date}</td>
                  <td className="px-4 py-2 text-right">
                    ¥{day.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    ¥{day.services.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    ¥{day.products.toLocaleString()}
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

const SalesCard: React.FC<SalesCardProps> = ({ title, value, icon, trend }) => (
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
