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
  isStaffSet: boolean;
}

const MonthlyReceptionSettings: React.FC = () => {
  const [monthlyData, setMonthlyData] = useState<MonthSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const checkStaffShiftSettings = async (year: number, month: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return false;
    }
  
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
  
    // サロンの営業日情報を取得
    const { data: salonBusinessHours, error: salonError } = await supabase
      .from('salon_business_hours')
      .select('date, is_holiday')
      .eq('salon_id', user.id)
      .gte('date', startDate)
      .lt('date', endDate);
  
    if (salonError) {
      console.error('Error fetching salon business hours:', salonError);
      return false;
    }
  
    // サロンが全休の場合は設定済とみなす
    if (salonBusinessHours.length === daysInMonth && salonBusinessHours.every(day => day.is_holiday)) {
      return true;
    }
  
  
    // 営業日（非店休日）を取得
  const businessDays = salonBusinessHours
  .filter(day => !day.is_holiday)
  .map(day => day.date);

// スタッフのシフト情報を取得
const { data: allStaffShifts, error: staffError } = await supabase
  .from('staff_shifts')
  .select('staff_id, date, shift_status')
  .gte('date', startDate)
  .lt('date', endDate);

if (staffError) {
  console.error('Error fetching staff shifts:', staffError);
  return false;
}

// スタッフごとのシフト設定状況をチェック
const { data: staffs, error: staffsError } = await supabase
  .from('staffs')
  .select('id')
  .eq('user_id', user.id);

if (staffsError) {
  console.error('Error fetching staffs:', staffsError);
  return false;
}

for (const staff of staffs) {
  const staffShifts = allStaffShifts.filter((shift: { staff_id: string | number, date: string, shift_status: string }) => 
    shift.staff_id === staff.id
  );
  
  // すべての営業日にシフトが設定されているかチェック
  const isAllBusinessDaysSet = businessDays.every((date: string) => 
    staffShifts.some((shift: { date: string }) => shift.date === date)
  );

  // すべてのシフトが有効な値（出勤、休日）を持っているかチェック
  const isAllShiftsValid = staffShifts.every((shift: { shift_status: string }) => 
    ['出勤', '休日'].includes(shift.shift_status)
  );

  if (!isAllBusinessDaysSet || !isAllShiftsValid) {
    return false;
  }
}

return true; // すべての条件を満たしていれば設定済み
};
  
  const generateMonthlyData = async (): Promise<MonthSetting[]> => {
    const data = await Promise.all(
      Array.from({ length: 4 }, async (_, index) => {
        const month = (currentMonth + index) % 12;
        const year = currentYear + Math.floor((currentMonth + index) / 12);
        const isSet = await checkMonthSettings(year, month + 1);
        const isStaffSet = await checkStaffShiftSettings(year, month + 1);
        return {
          month: `${year}年${month + 1}月`,
          year: year,
          isSet: isSet,
          isStaffSet: isStaffSet,
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
          <Button type={isStaffSetting ? (setting.isStaffSet ? "default" : "primary") : (setting.isSet ? "default" : "primary")} block>
            {isStaffSetting ? (setting.isStaffSet ? "設定済" : "未設定") : (setting.isSet ? "設定済" : "未設定")}
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