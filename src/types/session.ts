export interface Session {
  id: string;
  userId: string;
  sessionData: string; // 暗号化されたセッションデータ
  expiresAt: Date;
}
