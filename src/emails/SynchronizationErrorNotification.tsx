import * as React from "react";
import { Html } from "@react-email/html";
import { Head } from "@react-email/head";
import { Preview } from "@react-email/preview";
import { Container } from "@react-email/container";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";

interface SynchronizationErrorNotificationProps {
  adminName: string;
  errorMessage: string;
  reservationData: {
    customerName: string;
    startTime: string;
    endTime: string;
    staffName: string;
  };
}

export const SynchronizationErrorNotification: React.FC<
  SynchronizationErrorNotificationProps
> = ({ adminName, errorMessage, reservationData }) => (
  <Html>
    <Head />
    <Preview>【重要】予約の同期に失敗しました</Preview>
    <Container style={containerStyle}>
      <Section style={headerStyle}>
        <Text style={headerTextStyle}>予約同期エラーのお知らせ</Text>
      </Section>

      <Section style={errorNoticeStyle}>
        {errorMessage}
      </Section>

      <Section style={contentStyle}>
        <Section style={tableSectionStyle}>
          <Text style={sectionTitleStyle}>予約内容</Text>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <th style={tableCellHeaderStyle}>お客様名</th>
                <td style={tableCellStyle}>{reservationData.customerName} 様</td>
              </tr>
              <tr>
                <th style={tableCellHeaderStyle}>予約日時</th>
                <td style={tableCellStyle}>
                  {formatDateTime(reservationData.startTime)} - {formatDateTime(reservationData.endTime)}
                </td>
              </tr>
              <tr>
                <th style={tableCellHeaderStyle}>担当スタッフ</th>
                <td style={tableCellStyle}>{reservationData.staffName}</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section style={actionNeededStyle}>
          <Text style={actionTitleStyle}>▼ 必要な対応</Text>
          <ul style={actionListStyle}>
            <li>SalonBoardの予約状況を確認してください</li>
            <li>ハロタロの予約状況と照合してください</li>
            <li>必要に応じてお客様へご連絡ください</li>
          </ul>
        </Section>

        <Section style={supportInfoStyle}>
          <Text style={supportTitleStyle}>お困りの際は</Text>
          <Text style={supportTextStyle}>
            このエラーが続く場合や対応方法が不明な場合は、下記までお問い合わせください。<br />
            サポートデスク: support@harotalo.com
          </Text>
        </Section>
      </Section>

      <Section style={footerStyle}>
        <Text style={footerTextStyle}>
          ©2024 LOWE. All rights reserved.
        </Text>
      </Section>
    </Container>
  </Html>
);

const formatDateTime = (dateTimeString: string) => {
  const date = new Date(dateTimeString);
  return date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
};

const containerStyle: React.CSSProperties = {
  margin: "0 auto",
  padding: "20px",
  width: "100%",
  maxWidth: "600px",
  backgroundColor: "#ffffff",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: "#f8d7da",
  border: "1px solid #f5c6cb",
  borderRadius: "8px 8px 0 0",
  padding: "20px",
  textAlign: "center",
  marginBottom: "24px",
};

const headerTextStyle: React.CSSProperties = {
  color: "#721c24",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0",
};

const errorNoticeStyle: React.CSSProperties = {
  backgroundColor: "#fff3f3",
  borderLeft: "4px solid #dc3545",
  padding: "16px",
  marginBottom: "24px",
  lineHeight: "1.6",
};

const contentStyle: React.CSSProperties = {
  padding: "0 20px",
};

const sectionTitleStyle: React.CSSProperties = {
  color: "#333333",
  fontSize: "16px",
  fontWeight: "bold",
  marginBottom: "12px",
  paddingBottom: "8px",
  borderBottom: "2px solid #eee",
};

const tableSectionStyle: React.CSSProperties = {
  marginBottom: "24px",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginBottom: "24px",
};

const tableCellHeaderStyle: React.CSSProperties = {
  width: "30%",
  textAlign: "left",
  padding: "12px",
  backgroundColor: "#f8f9fa",
  border: "1px solid #dee2e6",
  color: "#495057",
  fontWeight: "normal",
};

const tableCellStyle: React.CSSProperties = {
  width: "70%",
  padding: "12px",
  border: "1px solid #dee2e6",
};

const actionNeededStyle: React.CSSProperties = {
  backgroundColor: "#fff3cd",
  border: "1px solid #ffeeba",
  borderRadius: "4px",
  padding: "16px",
  marginBottom: "24px",
  color: "#856404",
};

const actionTitleStyle: React.CSSProperties = {
  fontWeight: "bold",
  marginBottom: "8px",
};

const actionListStyle: React.CSSProperties = {
  marginTop: "8px",
  paddingLeft: "20px",
};

const supportInfoStyle: React.CSSProperties = {
  backgroundColor: "#f8f9fa",
  padding: "16px",
  borderRadius: "4px",
  marginBottom: "24px",
};

const supportTitleStyle: React.CSSProperties = {
  fontWeight: "bold",
  marginBottom: "8px",
};

const supportTextStyle: React.CSSProperties = {
  lineHeight: "1.6",
};

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "20px",
  color: "#6c757d",
  fontSize: "12px",
  borderTop: "1px solid #dee2e6",
};

const footerTextStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "12px",
  color: "#6c757d",
};