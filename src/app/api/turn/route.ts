import { generateAnswer } from "@/lib/answer";
import { reviewStatus } from "@/lib/corpus";
import { InputError, parseInput, signTurn, usageGate } from "@/lib/request";
import { ProviderError, speak, transcribe } from "@/lib/providers";
import type { TurnResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store", "Content-Type": "application/json" };
const failure = (code: string, status: number) => Response.json({ error: code }, { status, headers });

export async function POST(request: Request) {
  const started = Date.now();
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (origin && origin !== expected) return failure("invalid_origin", 403);
  if (process.env.ENABLE_PAID_APIS !== "true") return failure("billing_disabled", 503);
  if (process.env.NODE_ENV === "production" && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || !process.env.APP_ORIGIN)) return failure("setup_required", 503);
  if (!process.env.OPENAI_API_KEY) return failure("setup_required", 503);
  let release: (() => void) | null = null;
  try {
    const input = await parseInput(request);
    release = usageGate.acquire(Date.now(), Number(process.env.MAX_TURNS_PER_HOUR) || 120, Number(process.env.MAX_TURNS_PER_DAY) || 500);
    if (!release) return failure("rate_limit", 429);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(55000)]);
    const transcript = input.audio ? await transcribe(input.audio, signal) : input.text;
    if (!transcript || transcript.replace(/[\s.،!؟?]/g, "").length < 2) return failure("unclear_audio", 422);
    const result = await generateAnswer(transcript, input.history, signal);
    let audio: string | null = null;
    let audioStatus: TurnResponse["audioStatus"] = input.audioEnabled ? "unavailable" : "disabled";
    if (input.audioEnabled && !signal.aborted) {
      try { audio = await speak(result.answer, signal); audioStatus = "ready"; }
      catch { /* Preserve the validated text response. Never log provider bodies or content. */ }
    }
    const body: TurnResponse = { ...result, transcript, receipt: signTurn({ user: transcript, assistant: result.answer }),
      audio, audioStatus, elapsedMs: Date.now() - started, reviewStatus };
    return Response.json(body, { headers });
  } catch (error) {
    if (error instanceof InputError) return failure(error.code, error.status);
    if (error instanceof ProviderError) return failure(["insufficient_quota", "credit_balance_exhausted"].includes(error.code || "") ? "api_quota" : error.status === 429 ? "provider_busy" : "provider_unavailable", 503);
    if (request.signal.aborted) return failure("cancelled", 499);
    return failure("temporarily_unavailable", 503);
  } finally { release?.(); }
}
