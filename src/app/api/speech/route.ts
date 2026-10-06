import { readSpeechTicket } from "@/lib/speech-ticket";
import { streamSpeech } from "@/lib/providers";
import { UsageGate } from "@/lib/request";
export const runtime = "nodejs";
export const maxDuration = 30;
const gate = new UsageGate();
const headers = { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Accel-Buffering": "no" };
export async function GET(request: Request) {
  if (process.env.ENABLE_PAID_APIS !== "true" || request.headers.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 403 });
  const text = readSpeechTicket(new URL(request.url).searchParams.get("token") || "");
  if (!text) return new Response(null, { status: 410, headers: { "Cache-Control": "no-store" } });
  const release = gate.acquire(Date.now(), Number(process.env.MAX_TURNS_PER_HOUR) || 120, Number(process.env.MAX_TURNS_PER_DAY) || 500);
  if (!release) return new Response(null, { status: 429 });
  const controller = new AbortController();
  try {
    const upstream = await streamSpeech(text, AbortSignal.any([request.signal, controller.signal]));
    const reader = upstream.body!.getReader();
    const body = new ReadableStream<Uint8Array>({
      async pull(output) {
        try { const next = await reader.read();
          if (next.done) { release(); output.close(); } else output.enqueue(next.value);
        } catch (error) { release(); output.error(error); }
      },
      async cancel() { controller.abort(); release(); await reader.cancel().catch(() => {}); }
    });
    return new Response(body, { headers });
  } catch { release(); return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
