"use client";
import React, { useState, useEffect } from "react";
import {
  Card,
  Typography,
  Button,
  Checkbox,
  Select,
  Table,
  message,
} from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import moment from "moment";
import { createClient } from "@supabase/supabase-js";
import BusinessHoursBulkInputModal from "@/components/ui/BusinessHoursBulkInputModal";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const { Title, Text } = Typography;
const { Option } = Select;

interface DaySettings {
  isHoliday: boolean;
  openTime: string;
  closeTime: string;
  capacity: number | null; // null を許可
}

interface MonthlyReceptionSettingsDetailProps {
  year: string;
  month: string;
}

const MonthlyReceptionSettingsDetail: React.FC<
  MonthlyReceptionSettingsDetailProps
> = ({ year, month }) => {
  const [daySettings, setDaySettings] = useState<Record<number, DaySettings>>(
    {}
  );
  const [isBulkInputModalVisible, setIsBulkInputModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentDate = moment(`${year}-${month}-01`);

  const fetchBusinessHours = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      message.error("ユーザーが認証されていません");
      return;
    }

    const startDate = `${year}-${month.padStart(2, "0")}-01`;
    const endDate = moment(startDate).endOf("month").format("YYYY-MM-DD");

    try {
      const { data, error } = await supabase
        .from("salon_business_hours")
        .select("*")
        .eq("salon_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) throw error;

      const fetchedSettings: Record<number, DaySettings> = {};
      data.forEach((item) => {
        const day = parseInt(moment(item.date).format("D"));
        fetchedSettings[day] = {
          isHoliday: item.is_holiday,
          openTime: item.open_time || "",
          closeTime: item.close_time || "",
          capacity: item.capacity || 0,
        };
      });

      setDaySettings(fetchedSettings);
    } catch (error) {
      console.error("Error fetching business hours:", error);
      message.error("営業時間の取得中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessHours();
  }, [year, month]);

  const showBulkInputModal = () => {
    setIsBulkInputModalVisible(true);
  };

  const handleBulkInputModalCancel = () => {
    setIsBulkInputModalVisible(false);
  };

  const handleBusinessHoursBulkInputSubmit = (values: any) => {
    const updatedSettings = { ...daySettings };
    const daysInMonth = currentDate.daysInMonth();

    const applySettings = (day: number) => {
      updatedSettings[day] = {
        isHoliday: values.isHoliday,
        openTime: values.isHoliday ? "" : values.businessHours?.start || "",
        closeTime: values.isHoliday ? "" : values.businessHours?.end || "",
        // capacity: values.isHoliday ? undefined : values.capacity,
        capacity: values.isHoliday ? undefined : values.capacity || null,
      };
    };

    if (values.dateType === "specific") {
      values.specificDates.forEach((day: number) => applySettings(day));
    } else if (values.dateType === "range") {
      for (let day = values.range.start; day <= values.range.end; day++) {
        applySettings(day);
      }
    } else if (values.dateType === "weekday") {
      type WeekdayKey =
        | "日曜"
        | "月曜"
        | "火曜"
        | "水曜"
        | "木曜"
        | "金曜"
        | "土曜";
      const weekdayMap: { [key in WeekdayKey]: number } = {
        日曜: 0,
        月曜: 1,
        火曜: 2,
        水曜: 3,
        木曜: 4,
        金曜: 5,
        土曜: 6,
      };
      const selectedWeekdays = values.weekdays.map(
        (day: string) => weekdayMap[day as WeekdayKey]
      );

      for (let day = 1; day <= daysInMonth; day++) {
        const date = moment(`${year}-${month}-${day}`);
        if (selectedWeekdays.includes(date.day())) {
          applySettings(day);
        }
      }
    } else if (values.dateType === "everyday") {
      for (let day = 1; day <= daysInMonth; day++) {
        applySettings(day);
      }
    }

    setDaySettings(updatedSettings);
    setIsBulkInputModalVisible(false);
  };

  const generateCalendarData = () => {
    const startOfMonth = currentDate.clone().startOf("month");
    const endOfMonth = currentDate.clone().endOf("month");
    const data = [];

    let week = [];
    let day = startOfMonth.clone().startOf("week");

    while (day.isBefore(endOfMonth) || week.length > 0) {
      if (day.day() === 0 && week.length > 0) {
        data.push(week);
        week = [];
      }

      if (day.month() === currentDate.month()) {
        week.push(day.clone());
      } else {
        week.push(null);
      }

      if (day.day() === 6) {
        data.push(week);
        week = [];
      }

      day.add(1, "day");
    }

    return data;
  };

  const handleTimeChange = (
    day: number,
    type: "openTime" | "closeTime",
    value: string
  ) => {
    setDaySettings((prev) => ({
      ...prev,
      [day]: { ...prev[day], [type]: value },
    }));
  };

  const handleCapacityChange = (day: number, value: number | null) => {
    setDaySettings((prev) => ({
      ...prev,
      [day]: { ...prev[day], capacity: value },
    }));
  };

  const renderDaySettings = (day: moment.Moment | null) => {
    if (!day) return <div className="empty-day"></div>;

    const dayNumber = day.date();
    const settings = daySettings[dayNumber] || {
      isHoliday: false,
      openTime: "",
      closeTime: "",
      capacity: 0,
    };
    const isWeekend = day.day() === 0 || day.day() === 6;
    const isSunday = day.day() === 0;

    const formatTime = (time: string | null): string => {
      if (!time) return "";
      return moment(time, "HH:mm:ss").format("HH:mm");
    };

    return (
      <div
        className={`day-settings ${isWeekend ? "weekend" : ""}`}
        style={{
          border: "1px solid #d9d9d9",
          padding: "8px",
          backgroundColor: settings.isHoliday
            ? "#f0f0f0"
            : isWeekend
            ? "#f5f5f5"
            : "white",
          height: "100%",
        }}
      >
        <div
          className="day-number"
          style={{
            fontWeight: "bold",
            marginBottom: "4px",
            color: isSunday ? "red" : "inherit",
          }}
        >
          {dayNumber}
        </div>
        <Checkbox
          checked={settings.isHoliday}
          onChange={(e) => handleHolidayChange(dayNumber, e.target.checked)}
        >
          休業日
        </Checkbox>
        <Text
          style={{
            color: "#8c8c8c",
            fontSize: "12px",
            display: "block",
            marginTop: "4px",
          }}
        >
          開始時間
        </Text>
        <Select
          style={{ width: "100%", marginTop: "2px" }}
          value={formatTime(settings.openTime)}
          onChange={(value) => handleTimeChange(dayNumber, "openTime", value)}
          disabled={settings.isHoliday}
          placeholder="選択"
        >
          {generateTimeOptions()}
        </Select>
        <Text
          style={{
            color: "#8c8c8c",
            fontSize: "12px",
            display: "block",
            marginTop: "4px",
          }}
        >
          終了時間
        </Text>
        <Select
          style={{ width: "100%", marginTop: "2px" }}
          value={formatTime(settings.closeTime)}
          onChange={(value) => handleTimeChange(dayNumber, "closeTime", value)}
          disabled={settings.isHoliday}
          placeholder="選択"
        >
          {generateTimeOptions()}
        </Select>
        {/* <Text
          style={{
            color: "#8c8c8c",
            fontSize: "12px",
            display: "block",
            marginTop: "4px",
          }}
        >
          受付可能数（任意）
        </Text>
        <Select
          style={{ width: "100%", marginTop: "2px" }}
          value={settings.capacity}
          onChange={(value) => handleCapacityChange(dayNumber, value)}
          disabled={settings.isHoliday}
          placeholder="選択"
          allowClear // クリアボタンを追加
        >
          {[...Array(20)].map((_, i) => (
            <Option key={i + 1} value={i + 1}>
              {i + 1}
            </Option>
          ))}
        </Select> */}
      </div>
    );
  };

  const handleHolidayChange = (day: number, checked: boolean) => {
    setDaySettings((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isHoliday: checked,
        openTime: checked ? "" : prev[day]?.openTime || "",
        closeTime: checked ? "" : prev[day]?.closeTime || "",
        capacity: checked ? 0 : prev[day]?.capacity || 0,
      },
    }));
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        options.push(
          <Option key={time} value={time}>
            {time}
          </Option>
        );
      }
    }
    return options;
  };

  const calendarData = generateCalendarData();

  const handleSubmit = async () => {
    console.log("daySettings:", daySettings);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      message.error("ユーザーが認証されていません");
      return;
    }

    // 入力が不完全な日付をチェック
    const daysInMonth = moment(`${year}-${month}-01`).daysInMonth();
    const incompleteDays = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const settings = daySettings[day];
      if (
        !settings ||
        (!settings.isHoliday &&
          (settings.openTime === "" ||
            settings.closeTime === "" ||
            settings.capacity === 0))
      ) {
        incompleteDays.push(day);
      }
    }

    if (incompleteDays.length > 0) {
      // message.error(
      //   `以下の日付の設定が不完全です: ${incompleteDays.join(
      //     ", "
      //   )}。すべての日付に対して休業日か営業時間と受付可能数を設定してください。`
      // );
      message.error(
        `以下の日付の設定が不完全です: ${incompleteDays.join(
          ", "
        )}。すべての日付に対して休業日か営業時間を設定してください。`
      );
      return;
    }

    setIsSubmitting(true);

    const businessHours = Object.entries(daySettings).map(([day, settings]) => {
      const isHoliday = settings.isHoliday === true;
      return {
        salon_id: user.id,
        date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
        is_holiday: isHoliday,
        open_time: isHoliday ? null : settings.openTime,
        close_time: isHoliday ? null : settings.closeTime,
        capacity: isHoliday ? null : settings.capacity || null, // null if not set
      };
    });

    try {
      const { data, error } = await supabase
        .from("salon_business_hours")
        .upsert(businessHours, { onConflict: "salon_id,date" });

      if (error) throw error;

      message.success("営業時間が正常に保存されました");
    } catch (error) {
      console.error("Error saving business hours:", error);
      message.error("営業時間の保存中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          {/* 変更点1: タイトルから年月を削除 */}
          <Title level={3}>
            {/* サロンの営業時間・受付可能数設定  */}
            サロンの営業時間設定
          </Title>
          <QuestionCircleOutlined style={{ fontSize: "24px" }} />
        </div>
        <Text>
          1か月の営業時間と、サロン全体で受付可能な予約数を日別に設定します。
        </Text>
        <div style={{ margin: "20px 0" }}>
          <Button
            type="primary"
            size="large" // ボタンを大きくするために size を large に設定
            style={{ padding: "10px 20px", fontSize: "18px" }} // フォントサイズを18pxに設定
            onClick={showBulkInputModal}
          >
            一括入力
          </Button>
          <Text style={{ marginLeft: "10px" }}>
            {/* 日・期間・曜日を指定して営業時間・受付可能数の一括入力ができます。 */}
            日・期間・曜日を指定して営業時間の一括入力ができます。
          </Text>
        </div>
        {/* 変更点2: 年月表示を追加 */}
        <div
          style={{
            textAlign: "right",
            marginBottom: "10px",
            fontSize: "24px",
            fontWeight: "bold",
            color: "000000", // Antデザインのプライマリカラー
          }}
        >
          {`${year}年${month}月`}
        </div>
        <Table
          loading={isLoading}
          bordered
          pagination={false}
          components={{
            body: {
              cell: ({ children }: { children: React.ReactNode }) => (
                <td style={{ padding: 0, border: "1px solid #d9d9d9" }}>
                  {children}
                </td>
              ),
            },
          }}
          columns={[
            // 変更点3: 曜日ヘッダーのスタイルを変更
            {
              title: "日",
              dataIndex: "sun",
              key: "sun",
              align: "center",
              onHeaderCell: () => ({
                style: {
                  color: "red",
                  backgroundColor: "#637381",
                  borderRight: "1px solid #d9d9d9",
                  borderBottom: "1px solid #d9d9d9",
                },
              }),
            },
            {
              title: "月",
              dataIndex: "mon",
              key: "mon",
              align: "center",
              onHeaderCell: () => ({
                style: {
                  backgroundColor: "#637381",
                  color: "white",
                  borderRight: "1px solid #d9d9d9",
                  borderBottom: "1px solid #d9d9d9",
                },
              }),
            },
            {
              title: "火",
              dataIndex: "tue",
              key: "tue",
              align: "center",
              onHeaderCell: () => ({
                style: {
                  color: "white",
                  backgroundColor: "#637381",
                  borderRight: "1px solid #d9d9d9",
                  borderBottom: "1px solid #d9d9d9",
                },
              }),
            },
            {
              title: "水",
              dataIndex: "wed",
              key: "wed",
              align: "center",
              onHeaderCell: () => ({
                style: {
                  color: "white",
                  backgroundColor: "#637381",
                  borderRight: "1px solid #d9d9d9",
                  borderBottom: "1px solid #d9d9d9",
                },
              }),
            },
            {
              title: "木",
              dataIndex: "thu",
              key: "thu",
              align: "center",
              onHeaderCell: () => ({
                style: {
                  color: "white",
                  backgroundColor: "#637381",
                  borderRight: "1px solid #d9d9d9",
                  borderBottom: "1px solid #d9d9d9",
                },
              }),
            },
            {
              title: "金",
              dataIndex: "fri",
              key: "fri",
              align: "center",
              onHeaderCell: () => ({
                style: {
                  color: "white",
                  backgroundColor: "#637381",
                  borderRight: "1px solid #d9d9d9",
                  borderBottom: "1px solid #d9d9d9",
                },
              }),
            },
            // ... 火、水、木、金も同様に設定
            {
              title: "土",
              dataIndex: "sat",
              key: "sat",
              align: "center",
              onHeaderCell: () => ({
                style: {
                  color: "blue",
                  backgroundColor: "#637381",
                  borderRight: "1px solid #d9d9d9",
                  borderBottom: "1px solid #d9d9d9",
                },
              }),
            },
          ]}
          dataSource={calendarData.map((week, index) => ({
            key: index,
            sun: renderDaySettings(week[0]),
            mon: renderDaySettings(week[1]),
            tue: renderDaySettings(week[2]),
            wed: renderDaySettings(week[3]),
            thu: renderDaySettings(week[4]),
            fri: renderDaySettings(week[5]),
            sat: renderDaySettings(week[6]),
          }))}
        />

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <Button
            type="primary"
            size="large"
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            設定する
          </Button>
        </div>
        <BusinessHoursBulkInputModal
          visible={isBulkInputModalVisible}
          onCancel={handleBulkInputModalCancel}
          onSubmit={handleBusinessHoursBulkInputSubmit}
          currentDate={currentDate}
        />
      </Card>
    </div>
  );
};

export default MonthlyReceptionSettingsDetail;
