import crypto from "crypto";

export let ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "defaultdevkey".repeat(2);
console.log("ENCRYPTION_KEY in module:", ENCRYPTION_KEY);
console.log(
  "ENCRYPTION_KEY length in module:",
  Buffer.from(ENCRYPTION_KEY).length
);

const IV_LENGTH = 16; // AES ブロックサイズ

function validateKey() {
  const currentKey = process.env.ENCRYPTION_KEY || ENCRYPTION_KEY;
  if (!currentKey || Buffer.from(currentKey).length !== 32) {
    throw new Error("Invalid encryption key: Key must be 32 bytes long");
  }
}

export function encrypt(text: string): string {
  validateKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(process.env.ENCRYPTION_KEY || ENCRYPTION_KEY),
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
    Buffer.from(process.env.ENCRYPTION_KEY || ENCRYPTION_KEY),
    iv
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export function getEncryptionKeyLength(): number {
  return Buffer.from(process.env.ENCRYPTION_KEY || ENCRYPTION_KEY).length;
}

export function setEncryptionKey(key: string) {
  ENCRYPTION_KEY = key;
}
