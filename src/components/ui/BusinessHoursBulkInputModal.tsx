import React, { useState } from "react";
import {
  Modal,
  Form,
  Radio,
  Select,
  Button,
  Checkbox,
  InputNumber,
  Input,
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
  const [dateType, setDateType] = useState<string>("specific");

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

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      onSubmit(values);
      form.resetFields();
    });
  };

  return (
    <Modal
      title="一括入力"
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
        <Form.Item name="dateType" label="日を指定">
          <Radio.Group onChange={(e) => setDateType(e.target.value)}>
            <Radio value="specific">日付</Radio>
            <Radio value="range">期間</Radio>
            <Radio value="weekday">曜日</Radio>
            <Radio value="everyday">毎日</Radio>
          </Radio.Group>
        </Form.Item>

        {dateType === "specific" && (
          <Form.Item name="specificDates" label="日付を選択">
            <Select mode="multiple" style={{ width: "100%" }}>
              {[...Array(currentDate.daysInMonth())].map((_, index) => (
                <Option key={index + 1} value={index + 1}>
                  {index + 1}日
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {dateType === "range" && (
          <Form.Item label="期間を選択">
            <Input.Group compact>
              <Form.Item name={["range", "start"]} noStyle>
                <Select style={{ width: 120 }}>
                  {[...Array(currentDate.daysInMonth())].map((_, index) => (
                    <Option key={index + 1} value={index + 1}>
                      {index + 1}日
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <span style={{ padding: "0 8px" }}>から</span>
              <Form.Item name={["range", "end"]} noStyle>
                <Select style={{ width: 120 }}>
                  {[...Array(currentDate.daysInMonth())].map((_, index) => (
                    <Option key={index + 1} value={index + 1}>
                      {index + 1}日
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Input.Group>
          </Form.Item>
        )}

        {dateType === "weekday" && (
          <Form.Item name="weekdays" label="曜日を選択">
            <Checkbox.Group>
              <Checkbox value="日曜">日曜</Checkbox>
              <Checkbox value="月曜">月曜</Checkbox>
              <Checkbox value="火曜">火曜</Checkbox>
              <Checkbox value="水曜">水曜</Checkbox>
              <Checkbox value="木曜">木曜</Checkbox>
              <Checkbox value="金曜">金曜</Checkbox>
              <Checkbox value="土曜">土曜</Checkbox>
            </Checkbox.Group>
          </Form.Item>
        )}

        <Form.Item name="isHoliday" valuePropName="checked">
          <Checkbox>休業日</Checkbox>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.isHoliday !== currentValues.isHoliday
          }
        >
          {({ getFieldValue }) =>
            !getFieldValue("isHoliday") && (
              <>
                {/* <Form.Item name="capacity" label="受付可能数を指定">
                  <InputNumber min={1} />
                </Form.Item> */}
                <Form.Item label="営業時間を指定">
                  <Input.Group compact>
                    <Form.Item name={["businessHours", "start"]} noStyle>
                      <Select style={{ width: 120 }}>
                        {generateTimeOptions()}
                      </Select>
                    </Form.Item>
                    <span style={{ padding: "0 8px" }}>から</span>
                    <Form.Item name={["businessHours", "end"]} noStyle>
                      <Select style={{ width: 120 }}>
                        {generateTimeOptions()}
                      </Select>
                    </Form.Item>
                  </Input.Group>
                </Form.Item>
              </>
            )
          }
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BusinessHoursBulkInputModal;
