"use client";
import React, { useState } from "react";
import {
  Table,
  Button,
  Card,
  Typography,
  Row,
  Col,
  Select,
  Popover,
  Form,
  Input,
  Radio,
  DatePicker,
} from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import moment from "moment";
import Link from "next/link";

const { Title, Text } = Typography;
const { Option } = Select;

interface StaffShift {
  name: string;
  shifts: (string | null)[];
}

interface ShiftPopoverData {
  visible: boolean;
  date: moment.Moment | null;
  staffName: string;
  currentShift: string | null;
}

const StaffShiftSettings: React.FC = () => {
  const [currentDate] = useState(moment("2024-07-01"));
  const [staffShifts, setStaffShifts] = useState<StaffShift[]>([
    { name: "斎藤 憲司", shifts: Array(31).fill(null) },
    { name: "谷 美加", shifts: Array(31).fill(null) },
    { name: "鳥山 洋花", shifts: Array(31).fill(null) },
    { name: "田原 詩朗", shifts: Array(31).fill(null) },
  ]);
  const [shiftPopover, setShiftPopover] = useState<ShiftPopoverData>({
    visible: false,
    date: null,
    staffName: "",
    currentShift: null,
  });

  const daysInMonth = currentDate.daysInMonth();

  const handleShiftSubmit = (values: any) => {
    const { shiftType, startTime, title, memo } = values;
    let newShiftValue = shiftType === "休日" ? "休" : startTime;

    setStaffShifts((prevShifts) =>
      prevShifts.map((staff) =>
        staff.name === shiftPopover.staffName
          ? {
              ...staff,
              shifts: staff.shifts.map((shift, index) =>
                index === (shiftPopover.date?.date() || 1) - 1
                  ? newShiftValue
                  : shift
              ),
            }
          : staff
      )
    );

    setShiftPopover({ ...shiftPopover, visible: false });
  };

  const ShiftPopoverContent = ({
    staffName,
    date,
    currentShift,
  }: {
    staffName: string;
    date: moment.Moment;
    currentShift: string | null;
  }) => {
    const [form] = Form.useForm();

    return (
      <Form
        form={form}
        onFinish={handleShiftSubmit}
        initialValues={{
          shiftType: currentShift === "休" ? "休日" : "出勤",
          startTime: currentShift !== "休" ? currentShift : undefined,
        }}
      >
        <Form.Item name="shiftType">
          <Radio.Group>
            <Radio value="出勤">出勤</Radio>
            <Radio value="休日">休日</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="startTime" label="勤務時間">
          <Select style={{ width: 120 }}>
            {Array.from({ length: 24 }, (_, i) => (
              <Option key={i} value={`${i.toString().padStart(2, "0")}:00`}>
                {`${i.toString().padStart(2, "0")}:00`}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="title" label="タイトル">
          <Input />
        </Form.Item>
        <Form.Item name="memo" label="メモ">
          <Input.TextArea />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            入力する
          </Button>
        </Form.Item>
      </Form>
    );
  };

  const columns = [
    {
      title: "スタッフ名",
      dataIndex: "name",
      key: "name",
      fixed: "left" as const,
      width: 100,
    },
    {
      title: "設定状況",
      key: "status",
      fixed: "left" as const,
      width: 100,
      render: () => <Button size="small">設定済</Button>,
    },
    {
      title: "設定",
      key: "setting",
      fixed: "left" as const,
      width: 80,
      render: () => (
        <Button type="primary" size="small">
          設定
        </Button>
      ),
    },
    ...Array.from({ length: daysInMonth }, (_, index) => ({
      title: `${index + 1}(${moment(currentDate)
        .date(index + 1)
        .format("ddd")})`,
      dataIndex: "shifts",
      key: index,
      width: 80,
      render: (shifts: (string | null)[], record: StaffShift) => (
        <Popover
          content={
            <ShiftPopoverContent
              staffName={record.name}
              date={moment(currentDate).date(index + 1)}
              currentShift={shifts[index]}
            />
          }
          title={`${moment(currentDate)
            .date(index + 1)
            .format("YYYY年MM月DD日(ddd)")} ${record.name}`}
          trigger="click"
          visible={
            shiftPopover.visible &&
            shiftPopover.staffName === record.name &&
            shiftPopover.date?.date() === index + 1
          }
          onVisibleChange={(visible) => {
            if (visible) {
              setShiftPopover({
                visible: true,
                date: moment(currentDate).date(index + 1),
                staffName: record.name,
                currentShift: shifts[index],
              });
            } else {
              setShiftPopover({ ...shiftPopover, visible: false });
            }
          }}
        >
          <Button style={{ width: "100%", padding: 0 }}>
            {shifts[index] || "未設定"}
          </Button>
        </Popover>
      ),
    })),
  ];

  return (
    <div style={{ padding: "20px" }}>
      <Card>
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: "20px" }}
        >
          <Col>
            <Title level={3}>シフト設定</Title>
          </Col>
          <Col>
            <QuestionCircleOutlined style={{ fontSize: "24px" }} />
          </Col>
        </Row>
        <Text>
          スタッフの1か月のシフトを設定します。
          休日や予定（一部休や外出など）を設定することで、ハロタロの予約受付が停止できます。
        </Text>
        <div style={{ marginTop: "20px", marginBottom: "20px" }}>
          <Button type="primary">一括入力</Button>
          <Text style={{ marginLeft: "10px" }}>
            スタッフと日を指定して、一括で入力できます。
          </Text>
        </div>
        <Table
          columns={columns}
          dataSource={staffShifts}
          pagination={false}
          scroll={{ x: "max-content" }}
          bordered
        />
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <Link href="/dashboard/reservations/monthly-settings" passHref>
            <Button type="primary">毎月の受付設定へ</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default StaffShiftSettings;
