"use client";
import React, { useState, useEffect } from "react";
import { Table, Button, Card, Typography, Row, Col } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import Link from "next/link";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const { Title, Paragraph } = Typography;

interface MonthSetting {
  month: string;
  year: number;
  isSet: boolean;
}

const MonthlyReceptionSettings: React.FC = () => {
  const [monthlyData, setMonthlyData] = useState<MonthSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 現在の年月を取得
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const checkMonthSettings = async (year: number, month: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return false;
    }

    const { data, error } = await supabase
      .from('salon_business_hours')
      .select('date')
      .eq('salon_id', user.id)
      .gte('date', `${year}-${month.toString().padStart(2, '0')}-01`)
      .lt('date', `${year}-${(month + 1).toString().padStart(2, '0')}-01`);

    if (error) {
      console.error('Error fetching settings:', error);
      return false;
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    return data?.length === daysInMonth;
  };

  // 直近4ヶ月分のデータを生成
  const generateMonthlyData = async (): Promise<MonthSetting[]> => {
    const data = await Promise.all(
      Array.from({ length: 4 }, async (_, index) => {
        const month = (currentMonth + index) % 12;
        const year = currentYear + Math.floor((currentMonth + index) / 12);
        const isSet = await checkMonthSettings(year, month + 1);
        return {
          month: `${year}年${month + 1}月`,
          year: year,
          isSet: isSet,
        };
      })
    );
    return data;
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const data = await generateMonthlyData();
      setMonthlyData(data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const renderMonthSetting = (
    setting: MonthSetting,
    isStaffSetting: boolean
  ) => (
    <Col span={6} key={setting.month}>
      <Card title={setting.month} style={{ marginBottom: "1rem" }}>
        <Link
          href={
            isStaffSetting
              ? `/dashboard/reservations/staff-shifts/${setting.year}/${
                  setting.month.split("年")[1].split("月")[0]
                }`
              : `/dashboard/reservations/monthly-settings/${setting.year}/${
                  setting.month.split("年")[1].split("月")[0]
                }`
          }
          passHref
        >
          <Button type={setting.isSet ? "default" : "primary"} block>
            {setting.isSet ? "設定済" : "未設定"}
          </Button>
        </Link>
      </Card>
    </Col>
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <Title level={2}>毎月の受付設定</Title>
      <Paragraph>
        サロンの営業時間、シフトを日時別に設定できます。
        <br />
        設定が完了すると、スケジュール画面で予約を登録・管理できるようになり、ハロタロの予約受付が開始されます。
      </Paragraph>

      <Card title="サロンの受付設定" className="mb-4">
        <Paragraph>1ヶ月の営業時間を日別に設定します。</Paragraph>
        <Row gutter={16}>
          {monthlyData.map((setting) => renderMonthSetting(setting, false))}
        </Row>
      </Card>

      <Card title="スタッフの受付設定" className="mb-4">
        <Paragraph>
          スタッフの1ヶ月のシフトを設定します。
          休暇や予定（一部休や外出など）を設定することで、ハロタロの予約受付が停止できます。
        </Paragraph>
        <Link href="/settings/work-patterns" passHref>
          <Button
            type="primary"
            icon={<SettingOutlined />}
            style={{ marginBottom: "1rem" }}
          >
            勤務パターン登録
          </Button>
        </Link>
        <Paragraph className="mb-2">
          ※シフト勤務の場合、勤務パターンをあらかじめ登録しておくと便利です。
        </Paragraph>
        <Row gutter={16}>
          {monthlyData.map((setting) => renderMonthSetting(setting, true))}
        </Row>
      </Card>
    </div>
  );
};

export default MonthlyReceptionSettings;