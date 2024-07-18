"use client";
import React, { useState } from "react";
import {
  Button,
  Switch,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Table,
  Space,
} from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";

const { Option } = Select;
const { TextArea } = Input;

interface MenuItem {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  isReservable: boolean;
}

const MenuSettingsPage: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    {
      id: 1,
      name: "お疲れヘッドスパ",
      category: "リラクゼーション",
      description: "疲れた頭皮をすっきりリフレッシュ",
      price: 7000,
      duration: 60,
      isReservable: true,
    },
    {
      id: 2,
      name: "おやすみヘッドスパ",
      category: "リラクゼーション",
      description: "疲れた頭皮をすっきりリフレッシュ",
      price: 5000,
      duration: 60,
      isReservable: true,
    },
    {
      id: 3,
      name: "艶髪ヘッドスパ",
      category: "リラクゼーション",
      description: "疲れた頭皮をすっきりリフレッシュ",
      price: 3000,
      duration: 60,
      isReservable: true,
    },
    // 他のメニュー項目も追加
  ]);

  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [form] = Form.useForm();

  const columns = [
    {
      title: "メニュー名",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "カテゴリ",
      dataIndex: "category",
      key: "category",
    },
    {
      title: "価格",
      dataIndex: "price",
      key: "price",
      render: (price: number) => `¥${price.toLocaleString()}`,
    },
    {
      title: "所要時間",
      dataIndex: "duration",
      key: "duration",
      render: (duration: number) => `${duration}分`,
    },
    {
      title: "予約可否",
      key: "isReservable",
      render: (_: any, record: MenuItem) => (
        <Switch
          checked={record.isReservable}
          onChange={(checked: boolean) =>
            handleToggleReservable(record.id, checked)
          }
        />
      ),
    },
    {
      title: "操作",
      key: "actions",
      render: (_: any, record: MenuItem) => (
        <Space>
          <Button type="primary" onClick={() => handleEdit(record)}>
            編集
          </Button>
          <Button type="text" danger onClick={() => handleDelete(record.id)}>
            <DeleteOutlined />
          </Button>
        </Space>
      ),
    },
  ];

  const handleToggleReservable = (id: number, isReservable: boolean) => {
    setMenuItems(
      menuItems.map((item) =>
        item.id === id ? { ...item, isReservable } : item
      )
    );
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: "メニューを削除しますか？",
      content: "この操作は取り消せません。",
      onOk() {
        setMenuItems(menuItems.filter((item) => item.id !== id));
      },
    });
  };

  const handleEdit = (menu: MenuItem) => {
    setEditingMenu(menu);
    form.setFieldsValue(menu);
    setIsModalVisible(true);
  };

  const handleAdd = () => {
    setEditingMenu(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (editingMenu) {
        setMenuItems(
          menuItems.map((item) =>
            item.id === editingMenu.id ? { ...item, ...values } : item
          )
        );
      } else {
        const newMenu: MenuItem = {
          id: Date.now(),
          ...values,
          isReservable: true,
        };
        setMenuItems([...menuItems, newMenu]);
      }
      setIsModalVisible(false);
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">メニュー設定</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新規追加
        </Button>
      </div>
      <Table columns={columns} dataSource={menuItems} rowKey="id" />
      <Modal
        title={editingMenu ? "メニュー編集" : "新規メニュー追加"}
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="メニュー名"
            rules={[{ required: true }]}
          >
            <Input maxLength={40} />
          </Form.Item>
          <Form.Item
            name="category"
            label="カテゴリ"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="リラクゼーション">リラクゼーション</Option>
              <Option value="ヘッドスパ">ヘッドスパ</Option>
              {/* 他のカテゴリオプションも追加 */}
            </Select>
          </Form.Item>
          <Form.Item
            name="description"
            label="メニュー説明"
            rules={[{ required: true }]}
          >
            <TextArea maxLength={70} />
          </Form.Item>
          <Form.Item
            name="price"
            label="価格（税込）"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item
            name="duration"
            label="所要時間（分）"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MenuSettingsPage;
