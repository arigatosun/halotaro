"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENCRYPTION_KEY = void 0;
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
// 環境変数から暗号化キーを取得し、64文字に調整する
const ENCRYPTION_KEY_HEX = (
  process.env.ENCRYPTION_KEY || "defaultdevkey".repeat(4)
).slice(0, 64);
// 16進数文字列をバッファに変換
exports.ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, "hex");
// キーの長さを検証
if (exports.ENCRYPTION_KEY.length !== 32) {
  throw new Error("Invalid encryption key: Key must be 32 bytes long");
}
const IV_LENGTH = 16; // AES ブロックサイズ
function encrypt(text) {
  const iv = crypto_1.default.randomBytes(IV_LENGTH);
  const cipher = crypto_1.default.createCipheriv(
    "aes-256-cbc",
    exports.ENCRYPTION_KEY,
    iv
  );
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}
function decrypt(text) {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift(), "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto_1.default.createDecipheriv(
    "aes-256-cbc",
    exports.ENCRYPTION_KEY,
    iv
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
}
