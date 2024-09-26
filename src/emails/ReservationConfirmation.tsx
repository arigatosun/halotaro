import * as React from 'react';
import { Html } from '@react-email/html';
import { Head } from '@react-email/head';
import { Preview } from '@react-email/preview';
import { Container } from '@react-email/container';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';

interface ReservationConfirmationProps {
  customerName: string;
  dateTime: string;
  endTime: string;
  staffName: string;
  serviceName: string;
  totalPrice: number;
}

export const ReservationConfirmation: React.FC<ReservationConfirmationProps> = ({
  customerName,
  dateTime,
  endTime,
  staffName,
  serviceName,
  totalPrice,
}) => (
  <Html>
    <Head />
    <Preview>予約完了のお知らせ - {customerName}様、ありがとうございます！</Preview>
    <Container style={containerStyle}>
      <Section style={headerStyle}>
        <Text style={headerTextStyle}>予約完了のお知らせ</Text>
      </Section>
      <Section style={contentStyle}>
        <Text style={greetingStyle}>
          {customerName}様、ご予約ありがとうございます。
        </Text>
        <Text style={textStyle}>
          以下の予約内容をご確認ください：
        </Text>
        <Section style={detailsStyle}>
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
          ご来店を心よりお待ちしております。ご質問やご要望がございましたら、お気軽にお問い合わせください。
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

const greetingStyle: React.CSSProperties = {
  fontSize: '18px',
  lineHeight: '26px',
  color: '#333333',
  fontWeight: 'bold',
  marginBottom: '16px',
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