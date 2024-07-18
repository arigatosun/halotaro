"use client";
import React, { useState, useEffect } from "react";
import {
  Card,
  Typography,
  Button,
  Checkbox,
  Select,
  Row,
  Col,
  Table,
  Modal,
  Radio,
  Space,
  Form,
  Input,
} from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import moment from "moment";

const { Title, Text } = Typography;
const { Option } = Select;

interface DaySettings {
  isHoliday: boolean;
  openTime: string;
  closeTime: string;
}

interface MonthlyReceptionSettingsDetailProps {
  year: string;
  month: string;
}

const MonthlyReceptionSettingsDetail: React.FC<
  MonthlyReceptionSettingsDetailProps
> = ({ year, month }) => {
  const [daySettings, setDaySettings] = useState<{
    [key: number]: DaySettings;
  }>({});
  const [isBulkInputModalVisible, setIsBulkInputModalVisible] = useState(false);

  const currentDate = moment(`${year}-${month}-01`);

  useEffect(() => {
    // 月が変更されたときに設定をリセット
    setDaySettings({});
  }, [year, month]);

  const showBulkInputModal = () => {
    setIsBulkInputModalVisible(true);
  };

  const handleBulkInputModalCancel = () => {
    setIsBulkInputModalVisible(false);
  };

  const handleBulkInputSubmit = (values: any) => {
    console.log("Bulk input values:", values);
    // ここで一括入力の処理を実装
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

  const handleHolidayChange = (day: number, checked: boolean) => {
    setDaySettings((prev) => ({
      ...prev,
      [day]: { ...prev[day], isHoliday: checked },
    }));
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

  const renderDaySettings = (day: moment.Moment | null) => {
    if (!day) return <div className="empty-day"></div>;

    const dayNumber = day.date();
    const settings = daySettings[dayNumber] || {
      isHoliday: false,
      openTime: "10:00",
      closeTime: "21:30",
    };
    const isWeekend = day.day() === 0 || day.day() === 6;

    return (
      <div className={`day-settings ${isWeekend ? "weekend" : ""}`}>
        <div className="day-number">{dayNumber}</div>
        <Checkbox
          checked={settings.isHoliday}
          onChange={(e) => handleHolidayChange(dayNumber, e.target.checked)}
        >
          休業日
        </Checkbox>
        <Select
          style={{ width: "100%", marginTop: "5px" }}
          value={settings.openTime}
          onChange={(value) => handleTimeChange(dayNumber, "openTime", value)}
          disabled={settings.isHoliday}
        >
          {generateTimeOptions()}
        </Select>
        <Select
          style={{ width: "100%", marginTop: "5px" }}
          value={settings.closeTime}
          onChange={(value) => handleTimeChange(dayNumber, "closeTime", value)}
          disabled={settings.isHoliday}
        >
          {generateTimeOptions()}
        </Select>
      </div>
    );
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

  const BulkInputModal = () => {
    const [form] = Form.useForm();

    return (
      <Modal
        title="一括入力"
        visible={isBulkInputModalVisible}
        onCancel={handleBulkInputModalCancel}
        footer={[
          <Button key="cancel" onClick={handleBulkInputModalCancel}>
            閉じる
          </Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            一括入力
          </Button>,
        ]}
        width={800}
      >
        <Form form={form} onFinish={handleBulkInputSubmit}>
          <Form.Item name="dateType" label="日を指定">
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="specific">
                  日付：
                  <Select style={{ width: 80 }} defaultValue="1">
                    {[...Array(31)].map((_, i) => (
                      <Option key={i + 1} value={i + 1}>
                        {i + 1}
                      </Option>
                    ))}
                  </Select>
                  日と
                  <Select style={{ width: 80 }} defaultValue="1">
                    {[...Array(31)].map((_, i) => (
                      <Option key={i + 1} value={i + 1}>
                        {i + 1}
                      </Option>
                    ))}
                  </Select>
                  日と
                  <Select style={{ width: 80 }} defaultValue="1">
                    {[...Array(31)].map((_, i) => (
                      <Option key={i + 1} value={i + 1}>
                        {i + 1}
                      </Option>
                    ))}
                  </Select>
                  日と
                  <Select style={{ width: 80 }} defaultValue="1">
                    {[...Array(31)].map((_, i) => (
                      <Option key={i + 1} value={i + 1}>
                        {i + 1}
                      </Option>
                    ))}
                  </Select>
                  日と
                  <Select style={{ width: 80 }} defaultValue="1">
                    {[...Array(31)].map((_, i) => (
                      <Option key={i + 1} value={i + 1}>
                        {i + 1}
                      </Option>
                    ))}
                  </Select>
                  日
                </Radio>
                <Radio value="range">
                  期間：
                  <Select style={{ width: 80 }} defaultValue="1">
                    {[...Array(31)].map((_, i) => (
                      <Option key={i + 1} value={i + 1}>
                        {i + 1}
                      </Option>
                    ))}
                  </Select>
                  日から
                  <Select style={{ width: 80 }} defaultValue="1">
                    {[...Array(31)].map((_, i) => (
                      <Option key={i + 1} value={i + 1}>
                        {i + 1}
                      </Option>
                    ))}
                  </Select>
                  日
                </Radio>
                <Radio value="weekday">
                  曜日：
                  <Checkbox.Group
                    options={[
                      "日曜",
                      "月曜",
                      "火曜",
                      "水曜",
                      "木曜",
                      "金曜",
                      "土曜",
                    ]}
                  />
                </Radio>
                <Radio value="everyday">毎日</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="capacity" label="受付可能数を指定">
            <Select style={{ width: 120 }}>
              <Option value="select">選択</Option>
              {/* 他のオプションをここに追加 */}
            </Select>
          </Form.Item>
          <Form.Item name="businessHours" label="営業時間を指定">
            <Input.Group compact>
              <Select style={{ width: 120 }}>
                <Option value="select">選択</Option>
                {/* 時間オプションをここに追加 */}
              </Select>
              <span style={{ padding: "0 8px" }}>から</span>
              <Select style={{ width: 120 }}>
                <Option value="select">選択</Option>
                {/* 時間オプションをここに追加 */}
              </Select>
              <span style={{ padding: "0 8px" }}>まで</span>
            </Input.Group>
          </Form.Item>
        </Form>
      </Modal>
    );
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
          <Title level={3}>
            サロンの営業時間・受付可能数設定（{year}年{month}月）
          </Title>
          <QuestionCircleOutlined style={{ fontSize: "24px" }} />
        </div>
        <Text>
          1か月の営業時間と、サロン全体で受付可能な予約数を日別に設定します。
        </Text>
        <div style={{ margin: "20px 0" }}>
          <Button type="primary" onClick={showBulkInputModal}>
            一括入力
          </Button>
          <Text style={{ marginLeft: "10px" }}>
            日・期間・曜日を指定して営業時間・受付可能数の一括入力ができます。
          </Text>
        </div>
        <Table
          bordered
          pagination={false}
          components={{
            body: {
              cell: ({ children }: { children: React.ReactNode }) => (
                <td style={{ padding: 0 }}>{children}</td>
              ),
            },
          }}
          columns={[
            { title: "日", dataIndex: "sun", key: "sun", align: "center" },
            { title: "月", dataIndex: "mon", key: "mon", align: "center" },
            { title: "火", dataIndex: "tue", key: "tue", align: "center" },
            { title: "水", dataIndex: "wed", key: "wed", align: "center" },
            { title: "木", dataIndex: "thu", key: "thu", align: "center" },
            { title: "金", dataIndex: "fri", key: "fri", align: "center" },
            { title: "土", dataIndex: "sat", key: "sat", align: "center" },
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
          <Button type="primary" size="large">
            設定する
          </Button>
        </div>
        <BulkInputModal />
      </Card>
    </div>
  );
};

export default MonthlyReceptionSettingsDetail;
