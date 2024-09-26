import * as React from 'react';
import { Html } from '@react-email/html';
import { Head } from '@react-email/head';
import { Preview } from '@react-email/preview';
import { Container } from '@react-email/container';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';

interface NewReservationNotificationProps {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  dateTime: string;
  endTime: string;
  staffName: string;
  serviceName: string;
  totalPrice: number;
}

export const NewReservationNotification: React.FC<NewReservationNotificationProps> = ({
  customerName,
  customerEmail,
  customerPhone,
  dateTime,
  endTime,
  staffName,
  serviceName,
  totalPrice,
}) => (
  <Html>
    <Head />
    <Preview>新規予約のお知らせ - 予約詳細をご確認ください</Preview>
    <Container style={containerStyle}>
      <Section style={headerStyle}>
        <Text style={headerTextStyle}>新規予約のお知らせ</Text>
      </Section>
      <Section style={contentStyle}>
        <Text style={textStyle}>新しい予約が入りました。以下の予約詳細をご確認ください：</Text>
        <Section style={detailsStyle}>
          <Text style={detailTextStyle}>
            <strong style={labelStyle}>顧客名:</strong>
            <br />
            {customerName}
          </Text>
          <Text style={detailTextStyle}>
            <strong style={labelStyle}>顧客メール:</strong>
            <br />
            {customerEmail}
          </Text>
          <Text style={detailTextStyle}>
            <strong style={labelStyle}>顧客電話番号:</strong>
            <br />
            {customerPhone}
          </Text>
          <Text style={detailTextStyle}>
            <strong style={labelStyle}>日時:</strong>
            <br />
            {formatDateTime(dateTime)} - {formatTime(endTime)}
          </Text>
          <Text style={detailTextStyle}>
            <strong style={labelStyle}>担当スタッフ:</strong>
            <br />
            {staffName}
          </Text>
          <Text style={detailTextStyle}>
            <strong style={labelStyle}>サービス:</strong>
            <br />
            {serviceName}
          </Text>
          <Text style={detailTextStyle}>
            <strong style={labelStyle}>料金:</strong>
            <br />
            ¥{totalPrice.toLocaleString()}
          </Text>
        </Section>
        <Text style={textStyle}>
          予約内容を確認し、必要に応じて顧客にご連絡ください。
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
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '100%',
  maxWidth: '600px',
  backgroundColor: '#ffffff',
};

const headerStyle: React.CSSProperties = {
  backgroundColor: '#F97316',
  padding: '20px',
  textAlign: 'center',
};

const headerTextStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const contentStyle: React.CSSProperties = {
  padding: '20px',
};

const textStyle: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#333333',
  marginBottom: '16px',
};

const detailsStyle: React.CSSProperties = {
  backgroundColor: '#f8f8f8',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
};

const detailTextStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#333333',
  marginBottom: '12px',
};

const labelStyle: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '4px',
  color: '#666666',
};

const footerStyle: React.CSSProperties = {
  backgroundColor: '#f0f0f0',
  padding: '12px',
  textAlign: 'center',
  borderRadius: '0 0 8px 8px',
};

const footerTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#666666',
};

const formatDateTime = (dateTimeString: string) => {
  const date = new Date(dateTimeString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTime = (timeString: string) => {
  const date = new Date(timeString);
  return date.toLocaleString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
};