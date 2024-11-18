import React from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  TimePicker,
  InputNumber,
  Button,
} from "antd";
import moment from "moment";

const { Option } = Select;

interface BusinessHoursBulkInputModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  currentDate: moment.Moment;
}

const BusinessHoursBulkInputModal: React.FC<
  BusinessHoursBulkInputModalProps
> = ({ visible, onCancel, onSubmit, currentDate }) => {
  const [form] = Form.useForm();

  // `Form.useWatch`でフォームの値を監視
  const dateType = Form.useWatch("dateType", form);
  const isHoliday = Form.useWatch("isHoliday", form);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      // 休業日の場合、capacityとbusinessHoursをnullに設定
      if (values.isHoliday) {
        values.capacity = null;
        values.businessHours = null;
      } else if (values.businessHours) {
        // businessHoursが2つの要素を持つ配列であることを確認
        if (
          Array.isArray(values.businessHours) &&
          values.businessHours.length === 2
        ) {
          values.businessHours = {
            start: values.businessHours[0].format("HH:mm"),
            end: values.businessHours[1].format("HH:mm"),
          };
        } else {
          return;
        }
      }

      // specificDatesを数値の配列に変換
      if (values.dateType === "specific") {
        values.specificDates = values.specificDates
          .split(",")
          .map((dateStr: string) => parseInt(dateStr.trim(), 10));
      }

      onSubmit(values);
      form.resetFields();
    });
  };

  const handleHolidayChange = (checked: boolean) => {
    if (checked) {
      form.setFieldsValue({
        businessHours: null,
        capacity: null,
      });
    }
  };

  return (
    <Modal
      title="営業時間・受付可能数の一括入力"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          閉じる
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          一括入力
        </Button>,
      ]}
      width={800}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="dateType"
          label="日付の選択方法"
          rules={[
            { required: true, message: "日付の選択方法を選んでください" },
          ]}
        >
          <Select>
            <Option value="specific">特定の日付</Option>
            <Option value="range">期間</Option>
            <Option value="weekday">曜日</Option>
            <Option value="everyday">毎日</Option>
          </Select>
        </Form.Item>

        {/* 日付選択フィールドを常にレンダリングし、`hidden`で表示を制御 */}
        <Form.Item
          name="specificDates"
          label="日付"
          rules={[
            {
              required: dateType === "specific",
              message: "日付を入力してください",
            },
          ]}
          hidden={dateType !== "specific"}
        >
          <Input placeholder="例: 1,5,10,15" />
        </Form.Item>

        <Form.Item
          label="期間"
          required={dateType === "range"}
          hidden={dateType !== "range"}
        >
          <Input.Group compact>
            <Form.Item
              name={["range", "start"]}
              noStyle
              rules={[
                {
                  required: dateType === "range",
                  message: "開始日を入力してください",
                },
              ]}
            >
              <InputNumber
                min={1}
                max={31}
                placeholder="開始日"
                style={{ width: "45%" }}
              />
            </Form.Item>
            <Input
              style={{
                width: "10%",
                borderLeft: 0,
                pointerEvents: "none",
                backgroundColor: "#fff",
              }}
              placeholder="~"
              disabled
            />
            <Form.Item
              name={["range", "end"]}
              noStyle
              rules={[
                {
                  required: dateType === "range",
                  message: "終了日を入力してください",
                },
              ]}
            >
              <InputNumber
                min={1}
                max={31}
                placeholder="終了日"
                style={{ width: "45%" }}
              />
            </Form.Item>
          </Input.Group>
        </Form.Item>

        <Form.Item
          name="weekdays"
          label="曜日"
          rules={[
            {
              required: dateType === "weekday",
              message: "曜日を選択してください",
            },
          ]}
          hidden={dateType !== "weekday"}
        >
          <Select mode="multiple">
            <Option value="日曜">日曜</Option>
            <Option value="月曜">月曜</Option>
            <Option value="火曜">火曜</Option>
            <Option value="水曜">水曜</Option>
            <Option value="木曜">木曜</Option>
            <Option value="金曜">金曜</Option>
            <Option value="土曜">土曜</Option>
          </Select>
        </Form.Item>

        <Form.Item name="isHoliday" valuePropName="checked">
          <Checkbox onChange={(e) => handleHolidayChange(e.target.checked)}>
            休業日
          </Checkbox>
        </Form.Item>

        {/* capacityとbusinessHoursフィールドを常にレンダリングし、`hidden`で表示を制御 */}
        <Form.Item name="capacity" label="受付可能数を指定" hidden={isHoliday}>
          <InputNumber min={1} max={999} />
        </Form.Item>
        <Form.Item
          name="businessHours"
          label="営業時間を指定"
          rules={[
            { required: !isHoliday, message: "営業時間を入力してください" },
          ]}
          hidden={isHoliday}
        >
          <TimePicker.RangePicker
            format="HH:mm"
            placeholder={["開始時間", "終了時間"]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BusinessHoursBulkInputModal;
