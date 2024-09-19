import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabaseClient";
import { encrypt, decrypt } from "@/utils/encryption";

export interface SessionData {
  userId: string;
  salonboardSessionId: string;
  // 他のセッション関連データ
}

export class SessionManager {
  private static readonly TABLE_NAME = "salonboard_sessions";

  static async createSession(
    userId: string,
    sessionData: SessionData
  ): Promise<string> {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後
    const encryptedData = encrypt(JSON.stringify(sessionData));

    const { error } = await supabase.from(this.TABLE_NAME).insert({
      id: sessionId,
      user_id: userId,
      session_data: encryptedData,
      expires_at: expiresAt.toISOString(),
    });

    if (error) throw new Error(`Failed to create session: ${error.message}`);

    return sessionId;
  }

  static async getSession(sessionId: string): Promise<SessionData | null> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select("session_data, expires_at")
      .eq("id", sessionId)
      .single();

    if (error || !data) return null;

    if (new Date(data.expires_at) < new Date()) {
      await this.deleteSession(sessionId);
      return null;
    }

    return JSON.parse(decrypt(data.session_data));
  }

  static async updateSession(
    sessionId: string,
    sessionData: SessionData
  ): Promise<void> {
    const encryptedData = encrypt(JSON.stringify(sessionData));

    const { error } = await supabase
      .from(this.TABLE_NAME)
      .update({
        session_data: encryptedData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) throw new Error(`Failed to update session: ${error.message}`);
  }

  static async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE_NAME)
      .delete()
      .eq("id", sessionId);

    if (error) throw new Error(`Failed to delete session: ${error.message}`);
  }

  static async cleanupExpiredSessions(): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE_NAME)
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (error)
      throw new Error(`Failed to cleanup expired sessions: ${error.message}`);
  }
}
