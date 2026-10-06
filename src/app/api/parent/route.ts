import { createHash, createHmac, timingSafeEqual } from "node:crypto";
const local = () => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(process.env.APP_ORIGIN || "");
const enabled = () => local() ? process.env.ENABLE_PARENT_PREVIEW === "true" : Boolean(process.env.PARENT_USERNAME && process.env.PARENT_PASSWORD && (process.env.SESSION_SECRET || "").length >= 32 && /^https:\/\//.test(process.env.APP_ORIGIN || ""));
const secure = () => local() ? "" : "; Secure";
const matches = (a: unknown, b: string) => typeof a === "string" && timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
const attempts = new Map<string, { count: number; expires: number }>();
const token = (expiry: string) => createHmac("sha256", process.env.SESSION_SECRET || "local-parent-preview").update(`parent:${expiry}`).digest("hex");
const headers = { "Cache-Control": "no-store" };
function authenticated(request: Request) {
  const value = /(?:^|;\s*)leen_parent=([^;]+)/.exec(request.headers.get("cookie") || "")?.[1];
  const [expiry, signature] = (value || "").split(".");
  if (!/^\d+$/.test(expiry || "") || !/^[a-f0-9]{64}$/.test(signature || "") || Number(expiry) < Date.now()) return false;
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(token(expiry), "hex"));
}
export async function GET(request: Request) {
  if (!enabled()) return Response.json({ enabled: false }, { status: 404, headers });
  return Response.json({ enabled: true, authenticated: authenticated(request) }, { headers });
}
export async function POST(request: Request) {
  if (!enabled()) return Response.json({}, { status: 404, headers });
  if (request.headers.get("origin") !== process.env.APP_ORIGIN) return Response.json({}, { status: 403, headers });
  try {
    if (Number(request.headers.get("content-length")) > 2048) return Response.json({}, { status: 413, headers });
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    for (const [key, value] of attempts) if (value.expires < Date.now()) attempts.delete(key);
    const attempt = attempts.get(ip) || { count: 0, expires: Date.now() + 900000 };
    if (attempt.count >= 10 || attempts.size >= 10000) return Response.json({}, { status: 429, headers });
    attempt.count++; attempts.set(ip, attempt);
    if (!matches(body.username, process.env.PARENT_USERNAME || "mother") || !matches(body.password, process.env.PARENT_PASSWORD || "mother")) return Response.json({}, { status: 401, headers });
    attempts.delete(ip);
    const expiry = String(Date.now() + 3600000);
    return Response.json({ authenticated: true }, { headers: { ...headers,
      "Set-Cookie": `leen_parent=${expiry}.${token(expiry)}; HttpOnly; SameSite=Strict; Path=/api/parent; Max-Age=3600${secure()}` } });
  } catch { return Response.json({}, { status: 400, headers }); }
}
export async function DELETE(request: Request) {
  if (!enabled() || request.headers.get("origin") !== process.env.APP_ORIGIN) return Response.json({}, { status: 403, headers });
  return Response.json({}, { headers: { ...headers, "Set-Cookie": `leen_parent=; HttpOnly; SameSite=Strict; Path=/api/parent; Max-Age=0${secure()}` } });
}
