import { reviewStatus } from "@/lib/corpus";
export const dynamic = "force-dynamic";
export function GET() {
  const configured = process.env.ENABLE_PAID_APIS === "true" && (process.env.NODE_ENV !== "production" || Boolean(process.env.APP_ORIGIN && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32));
  return Response.json({ status: "ok", textReady: configured && Boolean(process.env.OPENAI_API_KEY),
    voiceReady: Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID), reviewStatus },
    { headers: { "Cache-Control": "no-store" } });
}
