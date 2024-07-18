"use client";
import React, { useState } from "react";
import {
  Table,
  Button,
  Input,
  Select,
  DatePicker,
  Checkbox,
  Space,
} from "antd";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import generateRandomReservations from "@/utils/generateRandomReservations";

interface Reservation {
  key: string;
  date: string;
  time: string;
  status: string;
  customerName: string;
  staff: string;
  service: string;
  price: number;
}

const { Option } = Select;
const { RangePicker } = DatePicker;

const ReservationListPage: React.FC = () => {
  const [reservations] = useState<Reservation[]>(
    generateRandomReservations(50)
  );
  const [filteredInfo, setFilteredInfo] = useState<Record<string, any>>({});
  const [sortedInfo, setSortedInfo] = useState<any>({});

  const columns: ColumnsType<Reservation> = [
    {
      title: "来店日時",
      dataIndex: "date",
      key: "date",
      sorter: (a, b) => a.date.localeCompare(b.date),
      sortOrder: sortedInfo.columnKey === "date" ? sortedInfo.order : null,
    },
    {
      title: "ステータス",
      dataIndex: "status",
      key: "status",
      filters: [
        { text: "受付済み", value: "受付済み" },
        { text: "来店済み", value: "来店済み" },
      ],
      filteredValue: filteredInfo.status || null,
      onFilter: (value, record) => {
        if (typeof value === "string") {
          return record.status.includes(value);
        }
        return false; // または適切なデフォルト値
      },
    },
    {
      title: "お客様名",
      dataIndex: "customerName",
      key: "customerName",
    },
    {
      title: "スタッフ",
      dataIndex: "staff",
      key: "staff",
    },
    {
      title: "メニュー",
      dataIndex: "service",
      key: "service",
    },

    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Link href={`/dashboard/reservations/${record.key}/accounting`}>
            <Button type="primary">会計</Button>
          </Link>
        </Space>
      ),
    },
  ];

  const handleChange = (pagination: any, filters: any, sorter: any) => {
    setFilteredInfo(filters);
    setSortedInfo(sorter);
  };

  const clearFilters = () => {
    setFilteredInfo({});
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">予約一覧</h1>
      <div className="bg-gray-100 p-4 mb-4 rounded">
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <Space>
            <RangePicker />
          </Space>
          <Space wrap>
            {[
              "受付済み",
              "施術中",
              "来店処理済み",
              "お客様キャンセル",
              "サロンキャンセル",
              "無断キャンセル",
            ].map((status) => (
              <Checkbox key={status}>{status}</Checkbox>
            ))}
          </Space>
          <Space>
            <Input placeholder="お客様名(カナ)" />
            <Input placeholder="予約番号" />
            <Select defaultValue="すべてのスタッフ" style={{ width: 150 }}>
              <Option value="all">すべてのスタッフ</Option>
              {/* Add more staff options */}
            </Select>
            <Select defaultValue="すべての予約経路" style={{ width: 150 }}>
              <Option value="all">すべての予約経路</Option>
              {/* Add more reservation route options */}
            </Select>
            <Button type="primary" icon={<SearchOutlined />}>
              検索する
            </Button>
            <Button onClick={clearFilters}>条件をクリア</Button>
          </Space>
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={reservations}
        onChange={handleChange}
      />
    </div>
  );
};

export default ReservationListPage;
