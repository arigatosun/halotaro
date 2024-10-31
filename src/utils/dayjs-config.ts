// src/utils/dayjs-config.ts などのファイルを作成して設定を行います
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// プラグインを拡張
dayjs.extend(utc);
dayjs.extend(timezone);

// 日付フォーマット用のユーティリティ関数
export const formatDate = (date: string | Date | null): string => {
  if (!date) return '-';
  return dayjs(date).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
};

export const formatDateShort = (date: string | Date | null): string => {
  if (!date) return '-';
  return dayjs(date).tz('Asia/Tokyo').format('YYYY/MM/DD');
};

// dashboard-view.tsx での使用例
interface DashboardData {
  lastUpdated: string;
  // 他のフィールド...
}

export const fetchDashboardData = async (): Promise<DashboardData> => {
  try {
    const response = await fetch('/api/dashboard');
    const data = await response.json();
    
    return {
      ...data,
      lastUpdated: formatDate(data.lastUpdated),
      // 他の日付フィールドも同様に処理
    };
  } catch (error) {
    console.error('ダッシュボードデータの取得エラー:', error);
    throw error;
  }
};