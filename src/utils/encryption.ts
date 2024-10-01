import crypto from "crypto";

// 環境変数から暗号化キーを取得し、64文字に調整する
const ENCRYPTION_KEY_HEX = (
  process.env.ENCRYPTION_KEY || "defaultdevkey".repeat(4)
).slice(0, 64);

// 16進数文字列をバッファに変換
export const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, "hex");

// キーの長さを検証
if (ENCRYPTION_KEY.length !== 32) {
  throw new Error("Invalid encryption key: Key must be 32 bytes long");
}

const IV_LENGTH = 16; // AES ブロックサイズ

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(text: string): string {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
}
