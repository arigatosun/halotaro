"use client";
import React, { useState, useEffect } from "react";
import {
  Table,
  Input,
  Button,
  Select,
  Tabs,
  Card,
  Row,
  Col,
  Typography,
  Space,
  Divider,
} from "antd";
import {
  PlusOutlined,
  MinusOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";

const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

interface Item {
  id: string;
  category: string;
  name: string;
  staff: string;
  price: number;
  quantity: number;
}

interface AccountingPageProps {
  reservationId: string;
}

const treatmentCategories = [
  "ボディトリ",
  "ボディケア",
  "足裏・リフレ",
  "ヘッド",
  "その他",
];
const treatmentItems = [
  "お疲れヘッドスパ",
  "あやすみヘッドスパ",
  "三ツ星ヘッドスパ",
  "艶髪ヘッドスパ",
  "育毛促進プレミアムヘッドスパ",
  "炭酸タブレット",
  "トリキュアTR",
];

const retailCategories = [
  "シャンプー",
  "トリートメント",
  "スタイリング",
  "ヘアケア",
  "ボディケア",
];
const retailItems = {
  シャンプー: [
    "モイストシャンプー",
    "ボリュームシャンプー",
    "スカルプシャンプー",
  ],
  トリートメント: [
    "モイストトリートメント",
    "ダメージケアトリートメント",
    "カラーケアトリートメント",
  ],
  スタイリング: ["ヘアオイル", "ヘアワックス", "ヘアスプレー"],
  ヘアケア: ["頭皮ケアローション", "育毛剤", "ヘアパック"],
  ボディケア: ["ボディクリーム", "ボディオイル", "ハンドクリーム"],
};

export const AccountingPage: React.FC<AccountingPageProps> = ({
  reservationId,
}) => {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [cash, setCash] = useState(0);
  const [change, setChange] = useState(0);
  const [selectedStaff, setSelectedStaff] = useState<string>("斎藤 憲司");
  const [selectedRetailCategory, setSelectedRetailCategory] =
    useState<string>("シャンプー");

  useEffect(() => {
    const newTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    setTotal(newTotal);
    setChange(cash - newTotal);
  }, [items, cash]);

  const addItem = (category: string, name: string, price: number = 0) => {
    const newItem: Item = {
      id: Date.now().toString(),
      category,
      name,
      staff: selectedStaff,
      price,
      quantity: 1,
    };
    setItems([...items, newItem]);
  };

  const columns = [
    { title: "カテゴリ", dataIndex: "category", key: "category", width: "15%" },
    {
      title: "メニュー・店販・割引・サービス・オプション",
      dataIndex: "name",
      key: "name",
      width: "35%",
    },
    { title: "スタッフ", dataIndex: "staff", key: "staff", width: "15%" },
    {
      title: "単価",
      dataIndex: "price",
      key: "price",
      width: "10%",
      render: (price: number, record: Item) => (
        <Input
          style={{ width: "100%" }}
          value={price}
          onChange={(e) =>
            updateItem(record.id, "price", Number(e.target.value))
          }
        />
      ),
    },
    {
      title: "個数",
      dataIndex: "quantity",
      key: "quantity",
      width: "10%",
      render: (quantity: number, record: Item) => (
        <Input
          style={{ width: "100%" }}
          value={quantity}
          onChange={(e) =>
            updateItem(record.id, "quantity", Number(e.target.value))
          }
        />
      ),
    },
    {
      title: "金額",
      key: "amount",
      width: "10%",
      render: (_: any, record: Item) => record.price * record.quantity,
    },
    {
      title: "",
      key: "action",
      width: "5%",
      render: (_: any, record: Item) => (
        <Button
          icon={<MinusOutlined />}
          onClick={() => removeItem(record.id)}
          size="small"
        />
      ),
    },
  ];

  const updateItem = (id: string, field: keyof Item, value: any) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const renderAccountingSection = () => (
    <Card style={{ height: "100%" }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Row justify="space-between">
          <Col>
            <Text strong>現計:</Text>
          </Col>
          <Col>
            <Text strong>{total}円</Text>
          </Col>
        </Row>
        <Row justify="space-between">
          <Col>
            <Text>（内消費税:</Text>
          </Col>
          <Col>
            <Text>{Math.floor(total * 0.1)}円）</Text>
          </Col>
        </Row>
        <Divider />
        <Row gutter={16}>
          <Col span={12}>
            <Button block>現金</Button>
          </Col>
          <Col span={12}>
            <Button block>カード・その他</Button>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Text>お預り:</Text>
          </Col>
          <Col span={12}>
            <Input
              value={cash}
              onChange={(e) => setCash(Number(e.target.value))}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Text>お釣り:</Text>
          </Col>
          <Col span={12}>
            <Text>{change}円</Text>
          </Col>
        </Row>
        <Divider />
        <Button type="primary" size="large" block>
          会計
        </Button>
      </Space>
    </Card>
  );

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#f0f2f5",
        minHeight: "100vh",
      }}
    >
      <Card>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                ダミー予約 様
              </Title>
            </Col>
            <Col>
              <Space>
                <Text>指名スタッフ:</Text>
                <Select
                  value={selectedStaff}
                  onChange={(value) => setSelectedStaff(value)}
                  style={{ width: 150 }}
                >
                  <Option value="斎藤 憲司">斎藤 憲司</Option>
                  <Option value="田中 美香">田中 美香</Option>
                </Select>
                <Text>レジ担当者:</Text>
                <Select defaultValue="斎藤 憲司" style={{ width: 150 }}>
                  <Option value="斎藤 憲司">斎藤 憲司</Option>
                  <Option value="田中 美香">田中 美香</Option>
                </Select>
                <Button type="primary">一時保存</Button>
                <QuestionCircleOutlined />
              </Space>
            </Col>
          </Row>

          <div
            style={{
              minHeight: "200px",
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            <Table
              columns={columns}
              dataSource={items}
              pagination={false}
              size="small"
              bordered
              scroll={{ y: 350 }}
              locale={{ emptyText: "データがありません" }}
            />
          </div>

          <Row gutter={16}>
            <Col span={16}>
              <Card style={{ height: "500px", overflowY: "auto" }}>
                <Tabs defaultActiveKey="1">
                  <TabPane tab="施術" key="1">
                    <Space wrap>
                      {treatmentCategories.map((category) => (
                        <Button
                          key={category}
                          type={category === "ヘッド" ? "primary" : "default"}
                        >
                          {category}
                        </Button>
                      ))}
                    </Space>
                    <Divider />
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {treatmentItems.map((item) => (
                        <Button
                          key={item}
                          icon={<PlusOutlined />}
                          onClick={() => addItem("施術", item)}
                          style={{ width: "100%", textAlign: "left" }}
                        >
                          {item}
                        </Button>
                      ))}
                    </Space>
                  </TabPane>
                  <TabPane tab="店販" key="2">
                    <Space wrap>
                      {retailCategories.map((category) => (
                        <Button
                          key={category}
                          type={
                            category === selectedRetailCategory
                              ? "primary"
                              : "default"
                          }
                          onClick={() => setSelectedRetailCategory(category)}
                        >
                          {category}
                        </Button>
                      ))}
                    </Space>
                    <Divider />
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {retailItems[
                        selectedRetailCategory as keyof typeof retailItems
                      ].map((item) => (
                        <Button
                          key={item}
                          icon={<PlusOutlined />}
                          onClick={() => addItem("店販", item)}
                          style={{ width: "100%", textAlign: "left" }}
                        >
                          {item}
                        </Button>
                      ))}
                    </Space>
                  </TabPane>
                  <TabPane tab="割引・サービス・オプション" key="3">
                    {/* 割引・サービス・オプションのコンテンツ */}
                  </TabPane>
                </Tabs>
              </Card>
            </Col>
            <Col span={8}>{renderAccountingSection()}</Col>
          </Row>
        </Space>
      </Card>
    </div>
  );
};

export default AccountingPage;
