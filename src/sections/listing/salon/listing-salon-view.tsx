"use client";
import React from "react";
import {
  Form,
  Input,
  Select,
  Upload,
  Checkbox,
  TimePicker,
  Button,
  Typography,
  Space,
} from "antd";
import { UploadOutlined, SaveOutlined } from "@ant-design/icons";

const { Title } = Typography;
const { Option } = Select;

export default function SimplifiedSalonSettings() {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log("Form values:", values);
    // ここでAPIを呼び出してデータを保存
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <Title level={2} className="text-center mb-8">
        サロン設定
      </Title>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Space direction="vertical" size="large" className="w-full">
          <section>
            <Title level={3}>基本情報</Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="salonName"
                label="サロン名"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="phone"
                label="電話番号"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="address"
                label="住所"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item name="website" label="ウェブサイト">
                <Input />
              </Form.Item>
            </div>
            <Form.Item name="description" label="サロン説明">
              <Input.TextArea rows={4} />
            </Form.Item>
          </section>

          <section>
            <Title level={3}>営業時間</Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item name={["hours", "weekday"]} label="平日">
                <TimePicker.RangePicker format="HH:mm" />
              </Form.Item>
              <Form.Item name={["hours", "weekend"]} label="週末">
                <TimePicker.RangePicker format="HH:mm" />
              </Form.Item>
            </div>
            <Form.Item name="closedDays" label="定休日">
              <Checkbox.Group
                options={["月", "火", "水", "木", "金", "土", "日"]}
              />
            </Form.Item>
          </section>

          <section>
            <Title level={3}>提供サービス</Title>
            <Form.Item name="services" label="サービス内容">
              <Select mode="multiple" placeholder="サービスを選択">
                <Option value="cut">カット</Option>
                <Option value="color">カラー</Option>
                <Option value="perm">パーマ</Option>
                <Option value="treatment">トリートメント</Option>
                <Option value="straightening">縮毛矯正</Option>
                <Option value="headSpa">ヘッドスパ</Option>
              </Select>
            </Form.Item>
          </section>

          <section>
            <Title level={3}>サロン画像</Title>
            <Form.Item
              name="mainImage"
              label="メイン画像"
              valuePropName="fileList"
              getValueFromEvent={(e) => e && e.fileList}
            >
              <Upload name="mainImage" listType="picture-card" maxCount={1}>
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>アップロード</div>
                </div>
              </Upload>
            </Form.Item>
            <Form.Item
              name="subImages"
              label="サブ画像"
              valuePropName="fileList"
              getValueFromEvent={(e) => e && e.fileList}
            >
              <Upload
                name="subImages"
                listType="picture-card"
                maxCount={5}
                multiple
              >
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>アップロード</div>
                </div>
              </Upload>
            </Form.Item>
          </section>

          <section>
            <Title level={3}>サロンの特徴</Title>
            <Form.Item name="features">
              <Checkbox.Group>
                <div className="grid grid-cols-2 gap-2">
                  <Checkbox value="parking">駐車場あり</Checkbox>
                  <Checkbox value="creditCard">クレジットカード可</Checkbox>
                  <Checkbox value="reservation">完全予約制</Checkbox>
                  <Checkbox value="childFriendly">子連れOK</Checkbox>
                  <Checkbox value="barrier-free">バリアフリー</Checkbox>
                  <Checkbox value="wifi">Wi-Fi完備</Checkbox>
                </div>
              </Checkbox.Group>
            </Form.Item>
          </section>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              size="large"
              block
            >
              設定を保存
            </Button>
          </Form.Item>
        </Space>
      </Form>
    </div>
  );
}
