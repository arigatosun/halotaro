// emails/SynchronizationErrorNotification.tsx

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
  reservationData: any;
}

export const SynchronizationErrorNotification: React.FC<
  SynchronizationErrorNotificationProps
> = ({ adminName, errorMessage, reservationData }) => (
  <Html>
    <Head />
    <Preview>【重要】予約の同期に失敗しました</Preview>
    <Container style={containerStyle}>
      <Section style={headerStyle}>
        <Text style={headerTextStyle}>予約同期エラー通知</Text>
      </Section>
      <Section style={contentStyle}>
        <Text style={greetingStyle}>{adminName}様</Text>
        <Text style={textStyle}>
          予約のサロンボードへの同期に失敗しました。以下の詳細をご確認ください。
        </Text>
        <Section style={detailsStyle}>
          <Text style={detailTextStyle}>
            <strong style={labelStyle}>エラーメッセージ:</strong>
            <br />
            {errorMessage}
          </Text>
          <Text style={detailTextStyle}>
            <strong style={labelStyle}>予約データ:</strong>
            <br />
            <pre style={preStyle}>
              {JSON.stringify(reservationData, null, 2)}
            </pre>
          </Text>
        </Section>
        <Text style={textStyle}>
          早急にご確認いただき、対応をお願いいたします。
        </Text>
      </Section>
      <Section style={footerStyle}>
        <Text style={footerTextStyle}>
          ©2023 Harotalo. All rights reserved.
        </Text>
      </Section>
    </Container>
  </Html>
);

const containerStyle: React.CSSProperties = {
  margin: "0 auto",
  padding: "20px 0 48px",
  width: "100%",
  maxWidth: "600px",
  backgroundColor: "#ffffff",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: "#F97316",
  padding: "20px",
  textAlign: "center",
};

const headerTextStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0",
};

const contentStyle: React.CSSProperties = {
  padding: "20px",
};

const greetingStyle: React.CSSProperties = {
  fontSize: "18px",
  lineHeight: "26px",
  color: "#333333",
  fontWeight: "bold",
  marginBottom: "16px",
};

const textStyle: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#333333",
  marginBottom: "16px",
};

const detailsStyle: React.CSSProperties = {
  backgroundColor: "#f8f8f8",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
};

const detailTextStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#333333",
  marginBottom: "12px",
  wordWrap: "break-word",
};

const preStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  wordWrap: "break-word",
};

const labelStyle: React.CSSProperties = {
  display: "inline-block",
  marginBottom: "4px",
  color: "#666666",
};

const footerStyle: React.CSSProperties = {
  backgroundColor: "#f0f0f0",
  padding: "12px",
  textAlign: "center",
  borderRadius: "0 0 8px 8px",
};

const footerTextStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#666666",
};
