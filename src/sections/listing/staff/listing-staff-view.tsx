"use client";
import React, { useState } from "react";
import {
  Button,
  Switch,
  Modal,
  Form,
  Input,
  Upload,
  Card,
  Row,
  Col,
  Space,
  Table,
} from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";

interface Staff {
  id: number;
  name: string;
  role: string;
  experience: string;
  isPublished: boolean;
  image: string;
  description: string;
}

const StaffManagement: React.FC = () => {
  const [staffList, setStaffList] = useState<Staff[]>([
    {
      id: 1,
      name: "斎藤 憲司",
      role: "スパニスト",
      experience: "20年以上",
      isPublished: true,
      image: "https://img.pikbest.com/origin/10/10/47/79CpIkbEsThb9.jpg!w700wp",
      description: "五感を利用するヘッドスパニスト",
    },
    {
      id: 2,
      name: "鳥山 涼花",
      role: "スパニスト",
      experience: "-",
      isPublished: true,
      image:
        "https://t4.ftcdn.net/jpg/06/66/39/51/360_F_666395131_xcH5fxuuGTrC5kQxuYDgbFBrQDeNBCWJ.jpg",
      description: "当店自慢のヘッドスパで、心身共に癒されて下さい♪",
    },
    {
      id: 3,
      name: "徳 美加",
      role: "スパニスト",
      experience: "-",
      isPublished: true,
      image:
        "https://t3.ftcdn.net/jpg/06/70/65/50/360_F_670655081_0FrtUftbW2n2IUUFBMZ5namEtGODb41i.jpg",
      description: "美容師が行うプロのヘッドスパ",
    },
    {
      id: 4,
      name: "田原 雄華",
      role: "スパニスト",
      experience: "5年",
      isPublished: false,
      image:
        "https://t4.ftcdn.net/jpg/05/36/31/13/360_F_536311350_S3tMGs4nZQcdi8kzOB4wKiK98InsZaHG.jpg",
      description: "丁寧な施術もお任せあれ！ 大切な身体をほぐします☆",
    },
  ]);

  const columns = [
    {
      title: "スタッフ写真",
      dataIndex: "image",
      key: "image",
      render: (image: string) => (
        <img
          src={image}
          alt="スタッフ"
          style={{
            width: 50,
            height: 50,
            objectFit: "cover",
            borderRadius: "50%",
          }}
        />
      ),
    },
    {
      title: "氏名/職種/施術歴",
      dataIndex: "name",
      key: "name",
      render: (_: any, record: Staff) => (
        <Space direction="vertical">
          <span>{record.name}</span>
          <span>{record.role}</span>
          <span>{record.experience}</span>
        </Space>
      ),
    },
    {
      title: "キャッチ",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "詳細",
      key: "actions",
      render: (_: any, record: Staff) => (
        <Button type="primary" onClick={() => handleEdit(record)}>
          詳細
        </Button>
      ),
    },
    {
      title: "掲載/非掲載",
      key: "isPublished",
      render: (_: any, record: Staff) => (
        <Switch
          checked={record.isPublished}
          onChange={(checked: boolean) =>
            handleTogglePublish(record.id, checked)
          }
        />
      ),
    },
    {
      title: "削除",
      key: "delete",
      render: (_: any, record: Staff) => (
        <Button type="text" danger onClick={() => handleDelete(record.id)}>
          <DeleteOutlined />
        </Button>
      ),
    },
  ];

  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [form] = Form.useForm();

  const handleTogglePublish = (id: number, isPublished: boolean) => {
    setStaffList(
      staffList.map((staff) =>
        staff.id === id ? { ...staff, isPublished } : staff
      )
    );
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: "スタッフを削除しますか？",
      content: "この操作は取り消せません。",
      onOk() {
        setStaffList(staffList.filter((staff) => staff.id !== id));
      },
    });
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    form.setFieldsValue(staff);
    setIsModalVisible(true);
  };

  const handleAdd = () => {
    setEditingStaff(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (editingStaff) {
        setStaffList(
          staffList.map((staff) =>
            staff.id === editingStaff.id ? { ...staff, ...values } : staff
          )
        );
      } else {
        const newStaff: Staff = {
          id: Date.now(),
          ...values,
          isPublished: true,
        };
        setStaffList([...staffList, newStaff]);
      }
      setIsModalVisible(false);
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">スタッフ掲載情報一覧</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新規追加
        </Button>
      </div>
      <Table columns={columns} dataSource={staffList} rowKey="id" />
      <Modal
        title={editingStaff ? "スタッフ情報編集" : "新規スタッフ追加"}
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="氏名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="職種" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="experience" label="施術歴">
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="キャッチ"
            rules={[{ required: true }]}
          >
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="image" label="スタッフ写真">
            <Upload
              name="avatar"
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={false}
              action="https://www.mocky.io/v2/5cc8019d300000980a055e76"
            >
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>アップロード</div>
              </div>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
export default StaffManagement;
