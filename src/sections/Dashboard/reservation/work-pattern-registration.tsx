// work-pattern-registration.tsx

"use client";
import React, { useState, useEffect } from "react";
import { Table, Button, Card, Typography, Form, Input, Select, Checkbox, message, Row, Col, Divider } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface WorkPattern {
  id: string;
  shiftName: string;
  abbreviation: string;
  startTime: string;
  endTime: string;
  isBusinessStart: boolean;
  isBusinessEnd: boolean;
  remarks: string;
}

export default function WorkPatternRegistration() {
  const [form] = Form.useForm();
  const [workPatterns, setWorkPatterns] = useState<WorkPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchWorkPatterns(user.id);
      } else {
        message.error('ユーザー情報の取得に失敗しました');
      }
    };
    getUser();
  }, []);

  const fetchWorkPatterns = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('work_patterns')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      message.error('勤務パターンの取得に失敗しました');
    } else {
      const patterns = (data || []).map(item => ({
        id: item.id,
        shiftName: item.shift_name,
        abbreviation: item.abbreviation,
        startTime: item.start_time ? item.start_time.slice(0,5) : '',
        endTime: item.end_time ? item.end_time.slice(0,5) : '',
        isBusinessStart: item.is_business_start,
        isBusinessEnd: item.is_business_end,
        remarks: item.remarks,
      }));
      setWorkPatterns(patterns);
    }
    setLoading(false);
  };

  const onFinish = async (values: any) => {
    if (!user) {
      message.error('ユーザー情報が取得できませんでした');
      return;
    }

    const { shiftName, abbreviation, startTime, endTime, isBusinessStart, isBusinessEnd, remarks } = values;

    const newPattern = {
      shift_name: shiftName,
      abbreviation,
      start_time: isBusinessStart ? null : startTime + ":00",
      end_time: isBusinessEnd ? null : endTime + ":00",
      is_business_start: isBusinessStart || false,
      is_business_end: isBusinessEnd || false,
      remarks: remarks || '',
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('work_patterns')
      .insert([newPattern]);

    if (error) {
      message.error('勤務パターンの登録に失敗しました');
    } else {
      message.success('勤務パターンを登録しました');
      form.resetFields();
      fetchWorkPatterns(user.id);
    }
  };

  const deleteWorkPattern = async (id: string) => {
    if (!user) {
      message.error('ユーザー情報が取得できませんでした');
      return;
    }

    const { error } = await supabase
      .from('work_patterns')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      message.error('勤務パターンの削除に失敗しました');
    } else {
      message.success('勤務パターンを削除しました');
      fetchWorkPatterns(user.id);
    }
  };

  const columns = [
    {
      title: 'シフト名称',
      dataIndex: 'shiftName',
      key: 'shiftName',
      width: 150,
    },
    {
      title: '短縮名',
      dataIndex: 'abbreviation',
      key: 'abbreviation',
      width: 100,
    },
    {
      title: '設定時間',
      key: 'setTime',
      width: 120,
      render: (text: string, record: WorkPattern) => {
        const startTimeDisplay = record.isBusinessStart ? '営業開始時間' : record.startTime;
        const endTimeDisplay = record.isBusinessEnd ? '営業終了時間' : record.endTime;
        return `${startTimeDisplay} ～ ${endTimeDisplay}`;
      },
    },
    {
      title: '備考',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 300,
    },
    {
      title: '削除',
      key: 'delete',
      width: 80,
      render: (text: string, record: WorkPattern) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => deleteWorkPattern(record.id)}
        >
          削除
        </Button>
      ),
    },
  ];

  const timeOptions: React.ReactNode[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      timeOptions.push(
        <Option key={time} value={time}>
          {time}
        </Option>
      );
    }
  }

  return (
    <div className="p-4">
      <Title level={2}>勤務パターン登録</Title>
      <Paragraph>
        特定の時間帯を固定で勤務パターンとして登録できます。
        ここで登録した勤務パターンをスタッフの受付設定で使用できます。
      </Paragraph>

      <Card className="mb-4" bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={5} style={{ margin: 0 }}>勤務パターン登録</Title>
        </div>
        <Form
          form={form}
          name="workPatternForm"
          onFinish={onFinish}
          layout="horizontal"
          style={{ padding: '16px' }}
          onValuesChange={(changedValues, allValues) => {
            if (changedValues.isBusinessStart !== undefined) {
              if (changedValues.isBusinessStart) {
                form.setFieldsValue({ startTime: undefined });
              }
            }
            if (changedValues.isBusinessEnd !== undefined) {
              if (changedValues.isBusinessEnd) {
                form.setFieldsValue({ endTime: undefined });
              }
            }
          }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="shiftName"
                label="シフト名称"
                rules={[{ required: true, message: 'シフト名称を入力してください' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item
                name="abbreviation"
                label="短縮名"
                rules={[{ required: true, message: '短縮名を入力してください' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item label="設定時間" style={{ marginBottom: 0 }}>
                <Row gutter={8}>
                  <Col span={11}>
                    <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.isBusinessStart !== curValues.isBusinessStart}>
                      {({ getFieldValue }) => {
                        const isBusinessStart = getFieldValue('isBusinessStart');
                        return (
                          <Form.Item
                            name="startTime"
                            rules={[{ required: !isBusinessStart, message: '開始時間を選択してください' }]}
                          >
                            <Select placeholder="選択" disabled={isBusinessStart}>
                              {timeOptions}
                            </Select>
                          </Form.Item>
                        );
                      }}
                    </Form.Item>
                  </Col>
                  <Col span={2} style={{ textAlign: 'center', lineHeight: '32px' }}>
                    ~
                  </Col>
                  <Col span={11}>
                    <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.isBusinessEnd !== curValues.isBusinessEnd}>
                      {({ getFieldValue }) => {
                        const isBusinessEnd = getFieldValue('isBusinessEnd');
                        return (
                          <Form.Item
                            name="endTime"
                            rules={[{ required: !isBusinessEnd, message: '終了時間を選択してください' }]}
                          >
                            <Select placeholder="選択" disabled={isBusinessEnd}>
                              {timeOptions}
                            </Select>
                          </Form.Item>
                        );
                      }}
                    </Form.Item>
                  </Col>
                </Row>
                <Row>
                  <Col span={12}>
                    <Form.Item name="isBusinessStart" valuePropName="checked">
                      <Checkbox>営業開始時間</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="isBusinessEnd" valuePropName="checked">
                      <Checkbox>営業終了時間</Checkbox>
                    </Form.Item>
                  </Col>
                </Row>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="remarks" label="備考">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Divider style={{ margin: '16px 0' }} />
          <Row>
            <Col span={24} style={{ textAlign: 'center' }}>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  追加する
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card title="登録済み勤務パターン" className="mb-4">
        <Table
          columns={columns}
          dataSource={workPatterns}
          rowKey="id"
          loading={loading}
          pagination={false}
          bordered
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
}
