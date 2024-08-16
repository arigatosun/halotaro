import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface CancellationData {
  date: string;
  count: number;
  rate: number;
}

const dailyData: CancellationData[] = [
  { date: "6/1", count: 2, rate: 5 },
  { date: "6/2", count: 1, rate: 2.5 },
  { date: "6/3", count: 3, rate: 7.5 },
  { date: "6/4", count: 2, rate: 5 },
  { date: "6/5", count: 4, rate: 10 },
  { date: "6/6", count: 1, rate: 2.5 },
  { date: "6/7", count: 2, rate: 5 },
  { date: "6/8", count: 2, rate: 5 },
  { date: "6/9", count: 1, rate: 2.5 },
  { date: "6/10", count: 3, rate: 7.5 },
  { date: "6/11", count: 2, rate: 5 },
  { date: "6/12", count: 4, rate: 10 },
  { date: "6/13", count: 1, rate: 2.5 },
  { date: "6/14", count: 2, rate: 5 },
];

const weeklyData: CancellationData[] = [
  { date: "1週目", count: 15, rate: 5.4 },
  { date: "2週目", count: 12, rate: 4.3 },
  { date: "3週目", count: 18, rate: 6.5 },
  { date: "4週目", count: 10, rate: 3.6 },
];

const monthlyData: CancellationData[] = [
  { date: "1月", count: 62, rate: 5.2 },
  { date: "2月", count: 58, rate: 4.8 },
  { date: "3月", count: 71, rate: 5.9 },
  { date: "4月", count: 65, rate: 5.4 },
  { date: "5月", count: 60, rate: 5.0 },
  { date: "6月", count: 55, rate: 4.6 },
];

const CancellationCard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("daily");

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

  return (
    <Card className="bg-white border-none shadow-lg mt-10">
      <CardContent>
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600">キャンセル数</h3>
            <p className="text-2xl font-bold">
              {getDataForTab().reduce((sum, item) => sum + item.count, 0)}
            </p>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600">
              平均キャンセル率
            </h3>
            <p className="text-2xl font-bold">
              {(
                getDataForTab().reduce((sum, item) => sum + item.rate, 0) /
                getDataForTab().length
              ).toFixed(1)}
              %
            </p>
          </div>
        </div>
        <Tabs
          defaultValue="daily"
          onValueChange={(value) => setActiveTab(value)}
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
