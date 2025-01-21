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
import { useAuth } from "@/lib/authContext";

interface CancellationData {
  date: string;
  count: number;
  totalCount: number;
  rate: number;
}

const CancellationCard: React.FC = () => {
  const { user, session, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );
  const [dailyData, setDailyData] = useState<CancellationData[]>([]);
  const [weeklyData, setWeeklyData] = useState<CancellationData[]>([]);
  const [monthlyData, setMonthlyData] = useState<CancellationData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const fetchRef = useRef<boolean>(false);

  const periodDescriptions: Record<"daily" | "weekly" | "monthly", string> = {
    daily: isMobile ? "過去5日間" : "過去14日間",
    weekly: "過去3週間", // 4週間から3週間に変更
    monthly: "過去6か月間",
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) {
      setError("ユーザーがログインしていません。");
      setLoading(false);
      return;
    }

    if (fetchRef.current) return;
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
          throw new Error(
            errorData.error || "キャンセルデータの取得に失敗しました"
          );
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
    let data = [];
    switch (activeTab) {
      case "daily":
        data = dailyData;
        break;
      case "weekly":
        data = weeklyData;
        break;
      case "monthly":
        data = monthlyData;
        break;
      default:
        data = dailyData;
    }

    // データを新しい順に並べ替え（週別データのdateはパースできないため、インデックスでソート）
    data = [...data].reverse();

    // モバイル表示時は最新の5日分のデータのみを返す
    if (isMobile && activeTab === "daily") {
      return data.slice(-5);
    }

    // 週別の場合は最新の3週間分のデータのみを返す
    if (activeTab === "weekly") {
      return data.slice(-3);
    }

    return data;
  };

  const getTotalCancellations = () => {
    return getDataForTab().reduce((sum, item) => sum + item.count, 0);
  };

  const getTotalReservations = () => {
    return getDataForTab().reduce((sum, item) => sum + item.totalCount, 0);
  };

  const getAverageRate = () => {
    const totalCancellations = getTotalCancellations();
    const totalReservations = getTotalReservations();
    if (totalReservations === 0) return 0;
    return parseFloat(
      ((totalCancellations / totalReservations) * 100).toFixed(1)
    );
  };

  const formatWeekLabel = (date: string) => {
    if (isMobile) {
      // dateが「13-19」の形式の場合、開始日の「13」を取得
      const startDateString = date.split("-")[0];
      return startDateString + "～";
    }
    return date;
  };

  if (authLoading || loading) {
    return (
      <Card className="bg-white border-none shadow-lg mt-4 md:mt-10">
        <CardContent>
          <p>読み込み中...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border-none shadow-lg mt-4 md:mt-10">
        <CardContent>
          <p className="text-red-500">エラー: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-none shadow-lg mt-4 md:mt-10">
      <CardContent>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            キャンセル状況 ({periodDescriptions[activeTab]})
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:gap-8 mb-6">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600">キャンセル数</h3>
            <p className="text-2xl font-bold">{getTotalCancellations()}</p>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600">
              平均キャンセル率
            </h3>
            <p className="text-2xl font-bold">{getAverageRate()}%</p>
          </div>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (
              value === "daily" ||
              value === "weekly" ||
              value === "monthly"
            ) {
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
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      if (activeTab === "weekly" && isMobile) {
                        return formatWeekLabel(value);
                      }
                      return value;
                    }}
                  />
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
