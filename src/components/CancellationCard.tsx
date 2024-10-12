// CancellationCard.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/authcontext";
import dayjs from "dayjs";

// インターフェースの定義
interface CancellationData {
  date: string;
  count: number;
  totalCount: number;
  rate: number;
}

const CancellationCard: React.FC = () => {
  const { user, session, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [dailyData, setDailyData] = useState<CancellationData[]>([]);
  const [weeklyData, setWeeklyData] = useState<CancellationData[]>([]);
  const [monthlyData, setMonthlyData] = useState<CancellationData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // フラグを設定して一度だけフェッチする
  const fetchRef = useRef<boolean>(false);

  // 期間の説明を定義
  const periodDescriptions: Record<"daily" | "weekly" | "monthly", string> = {
    daily: "過去14日間",
    weekly: "過去4週間",
    monthly: "過去6か月間",
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) {
      setError("ユーザーがログインしていません。");
      setLoading(false);
      return;
    }

    if (fetchRef.current) return; // 既にフェッチ済みの場合は実行しない
    fetchRef.current = true;

    const fetchCancellationData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/cancellations/all", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "キャンセルデータの取得に失敗しました");
        }

        const data = await response.json();

        setDailyData(data.dailyData);
        setWeeklyData(data.weeklyData);
        setMonthlyData(data.monthlyData);
      } catch (err: any) {
        console.error("キャンセルデータの取得エラー:", err);
        setError(err.message || "データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchCancellationData();
  }, [user, session, authLoading]);

  const getDataForTab = () => {
    switch (activeTab) {
      case "daily":
        return dailyData;
      case "weekly":
        return weeklyData;
      case "monthly":
        return monthlyData;
      default:
        return dailyData;
    }
  };

  // キャンセル数の合計
  const getTotalCancellations = () => {
    return getDataForTab().reduce((sum, item) => sum + item.count, 0);
  };

  // 総予約数の合計
  const getTotalReservations = () => {
    return getDataForTab().reduce((sum, item) => sum + item.totalCount, 0);
  };

  // 平均キャンセル率の計算
  const getAverageRate = () => {
    const totalCancellations = getTotalCancellations();
    const totalReservations = getTotalReservations();
    if (totalReservations === 0) return 0;
    return parseFloat(((totalCancellations / totalReservations) * 100).toFixed(1));
  };

  if (authLoading || loading) {
    return (
      <Card className="bg-white border-none shadow-lg mt-10">
        <CardContent>
          <p>読み込み中...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border-none shadow-lg mt-10">
        <CardContent>
          <p className="text-red-500">エラー: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-none shadow-lg mt-10">
      <CardContent>
        {/* 期間の説明を表示 */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold">キャンセル状況 ({periodDescriptions[activeTab]})</h2>
        </div>
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600">キャンセル数</h3>
            <p className="text-2xl font-bold">{getTotalCancellations()}</p>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600">平均キャンセル率</h3>
            <p className="text-2xl font-bold">{getAverageRate()}%</p>
          </div>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (value === "daily" || value === "weekly" || value === "monthly") {
              setActiveTab(value);
            }
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger
              value="daily"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              日別
            </TabsTrigger>
            <TabsTrigger
              value="weekly"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              週別
            </TabsTrigger>
            <TabsTrigger
              value="monthly"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              月別
            </TabsTrigger>
          </TabsList>
          {["daily", "weekly", "monthly"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={getDataForTab()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    stroke="#FF9500"
                    label={{
                      value: "キャンセル数",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#FF6B00"
                    label={{
                      value: "キャンセル率 (%)",
                      angle: 90,
                      position: "insideRight",
                    }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    fill="#FF9500"
                    name="キャンセル数"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rate"
                    stroke="#FF6B00"
                    name="キャンセル率 (%)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CancellationCard;
