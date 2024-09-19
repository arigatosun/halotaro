import crypto from "crypto";

// デバッグ用のログ追加
console.log("環境変数 ENCRYPTION_KEY:", process.env.ENCRYPTION_KEY);

// 環境変数から暗号化キーを取得し、32バイトに調整する
export let ENCRYPTION_KEY = (
  process.env.ENCRYPTION_KEY || "defaultdevkey".repeat(2)
).slice(0, 32);

console.log("使用される ENCRYPTION_KEY:", ENCRYPTION_KEY);
console.log("ENCRYPTION_KEY length:", Buffer.from(ENCRYPTION_KEY).length);

const IV_LENGTH = 16; // AES ブロックサイズ

function validateKey() {
  if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY).length !== 32) {
    throw new Error("Invalid encryption key: Key must be 32 bytes long");
  }
}

export function encrypt(text: string): string {
  validateKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string): string {
  validateKey();
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export function getEncryptionKeyLength(): number {
  return Buffer.from(ENCRYPTION_KEY).length;
}

export function setEncryptionKey(key: string) {
  ENCRYPTION_KEY = key.slice(0, 32); // キーを32バイトに制限
}
