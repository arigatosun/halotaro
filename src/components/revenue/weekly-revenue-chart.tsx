import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RevenueData {
  name: string;
  revenue: number;
}

interface WeeklyRevenueChartProps {
  revenueData: RevenueData[];
  animate: boolean;
}

const WeeklyRevenueChart: React.FC<WeeklyRevenueChartProps> = ({
  revenueData,
  animate,
}) => {
  const maxRevenue = Math.max(...revenueData.map((d) => d.revenue));

  return (
    <Card className="col-span-4 bg-white border-none shadow-lg">
      <CardHeader>
        <CardTitle className="text-orange-dark">週間売上推移</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div
          className="h-[200px] flex items-end justify-between"
          style={{ minHeight: "200px" }}
        >
          {revenueData.map((data: RevenueData, index: number) => {
            const height = animate
              ? `${(data.revenue / maxRevenue) * 100}%`
              : "0%";
            return (
              <div
                key={index}
                className="flex flex-col items-center"
                style={{ width: "14%" }}
              >
                <div
                  className="relative h-full w-full flex items-end justify-center"
                  style={{ height: "180px" }}
                >
                  <div
                    className="w-8 bg-gradient-to-t from-orange-light to-yellow-light rounded-t-md transition-all duration-1000 ease-out absolute bottom-0"
                    style={{
                      height: height,
                      minHeight: "1px", // バーが常に表示されるようにする
                    }}
                  />
                </div>
                <span className="text-xs text-orange-dark mt-2">
                  {data.name}
                </span>
                <span className="text-xs text-orange-dark mt-1">
                  ¥{data.revenue.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyRevenueChart;
