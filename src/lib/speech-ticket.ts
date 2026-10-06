import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
const localKey = randomBytes(32);
function key() { return process.env.SESSION_SECRET ? createHash("sha256").update(`speech:${process.env.SESSION_SECRET}`).digest() : localKey; }
// Carry only validated text, encrypted and authenticated, without storing
// conversation content in a server cache or exposing text in request URLs.
export function speechUrl(text: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv);
  const payload = JSON.stringify({ text, expires: Date.now() + 15 * 60000 });
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return `/api/speech?token=${Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url")}`;
}
export function readSpeechTicket(token: string): string | null {
  try {
    if (!/^[A-Za-z0-9_-]{40,9000}$/.test(token)) return null;
    const data = Buffer.from(token, "base64url"), decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0,12));
    decipher.setAuthTag(data.subarray(12,28));
    const payload = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8"));
    return typeof payload.text === "string" && payload.text.length <= 1600 && payload.text.length > 0 &&
      Number.isFinite(payload.expires) && payload.expires > Date.now() && payload.expires <= Date.now() + 15 * 60000 ? payload.text : null;
  } catch { return null; }
}
