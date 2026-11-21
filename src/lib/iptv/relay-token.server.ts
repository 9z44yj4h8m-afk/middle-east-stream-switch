import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";

const payload = z.object({ url: z.string().url().max(4096), bearer: z.string().min(20).max(8192) });
const keyOf = (secret: string) => {
  if (!secret) throw new Error("إعداد المشاهدة غير متاح.");
  return createHash("sha256").update(`iptv-relay:${secret}`).digest();
};

// Encrypted capabilities conceal both provider credentials and the member JWT.
// The relay rechecks JWT expiry and the session unlock on every request.
export function relayUrl(url: string, bearer: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyOf(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload.parse({ url, bearer }))), cipher.final()]);
  return `/api/public/iptv?t=${Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url")}`;
}

export function openRelayToken(token: string, secret: string) {
  if (!/^[A-Za-z0-9_-]{60,18000}$/.test(token)) throw new Error("Invalid token");
  const bytes = Buffer.from(token, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", keyOf(secret), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  const plain = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
  return payload.parse(JSON.parse(plain.toString()));
}

export function safeRelayTarget(url: URL): boolean {
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  // No IP literals or local/private destinations, including redirect targets.
  return host.includes(".") && !host.includes(":") && !/^\d+(\.\d+){3}$/.test(host)
    && !/(^|\.)(localhost|local|internal|test|invalid)$/.test(host);
}