import { createHmac, timingSafeEqual } from "node:crypto";
const enabled = () => process.env.ENABLE_PARENT_PREVIEW === "true" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(process.env.APP_ORIGIN || "");
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
    if (body.username !== "mother" || body.password !== "mother") return Response.json({}, { status: 401, headers });
    const expiry = String(Date.now() + 3600000);
    return Response.json({ authenticated: true }, { headers: { ...headers,
      "Set-Cookie": `leen_parent=${expiry}.${token(expiry)}; HttpOnly; SameSite=Strict; Path=/api/parent; Max-Age=3600` } });
  } catch { return Response.json({}, { status: 400, headers }); }
}
export async function DELETE(request: Request) {
  if (!enabled() || request.headers.get("origin") !== process.env.APP_ORIGIN) return Response.json({}, { status: 403, headers });
  return Response.json({}, { headers: { ...headers, "Set-Cookie": "leen_parent=; HttpOnly; SameSite=Strict; Path=/api/parent; Max-Age=0" } });
}
