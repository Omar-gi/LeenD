import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { ConversationTurn } from "./types";

export const MAX_BODY = 3 * 1024 * 1024;
export const MAX_HISTORY = 12;
const turnSchema = z.object({ user: z.string().min(1).max(1000), assistant: z.string().min(1).max(1500), receipt: z.string().max(100) });
export const historySchema = z.array(turnSchema).max(MAX_HISTORY);
const ephemeralSecret = randomBytes(32).toString("hex");
function secret() { return process.env.SESSION_SECRET || ephemeralSecret; }
export function signTurn(turn: ConversationTurn) {
  return createHmac("sha256", secret()).update(JSON.stringify([turn.user, turn.assistant])).digest("hex");
}
export function validReceipt(turn: ConversationTurn): boolean {
  if (!turn.receipt || !/^[a-f0-9]{64}$/.test(turn.receipt)) return false;
  return timingSafeEqual(Buffer.from(turn.receipt, "hex"), Buffer.from(signTurn(turn), "hex"));
}

export class InputError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}

export async function boundedBody(request: Request): Promise<ArrayBuffer> {
  if (Number(request.headers.get("content-length")) > MAX_BODY) throw new InputError("too_large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("empty_input");
  const chunks: Uint8Array[] = []; let size = 0;
  let timedOut = false;
  const deadline = setTimeout(() => { timedOut = true; void reader.cancel(); }, 10000);
  let finished = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) { finished = true; break; }
      size += value.byteLength;
      if (size > MAX_BODY) { await reader.cancel(); throw new InputError("too_large", 413); }
      chunks.push(value);
    }
  } finally { clearTimeout(deadline); }
  if (timedOut) throw new InputError("request_timeout", 408);
  if (!finished || !size) throw new InputError("empty_input");
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes.buffer;
}

export async function parseInput(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const raw = await boundedBody(request);
  let text: unknown; let audio: File | null = null; let historyRaw: unknown = [];
  let audioEnabled = true; let adultConfirmed = false;
  if (contentType.includes("multipart/form-data")) {
    const form = await new Response(raw, { headers: { "Content-Type": contentType } }).formData();
    text = form.get("text"); const file = form.get("audio");
    if (file instanceof File && file.size > 0) audio = file;
    try { historyRaw = JSON.parse(String(form.get("history") || "[]")); }
    catch { throw new InputError("invalid_history"); }
    adultConfirmed = form.get("adultConfirmed") === "true";
    audioEnabled = form.get("audioEnabled") !== "false";
    const seconds = Number(form.get("durationSeconds"));
    if (audio && (!Number.isFinite(seconds) || seconds <= 0 || seconds > 30)) throw new InputError("audio_duration");
  } else if (contentType.includes("application/json")) {
    let body;
    try { body = JSON.parse(new TextDecoder().decode(raw)); }
    catch { throw new InputError("invalid_input"); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("invalid_input");
    text = body.text; historyRaw = body.history ?? []; adultConfirmed = body.adultConfirmed === true;
    audioEnabled = body.audioEnabled !== false;
  } else throw new InputError("unsupported_type", 415);
  if (!adultConfirmed) throw new InputError("adult_confirmation_required", 403);
  const history = historySchema.safeParse(historyRaw);
  if (!history.success || history.data.some(t => !validReceipt(t))) throw new InputError("invalid_history");
  const cleaned = typeof text === "string" ? text.trim() : "";
  if ((!cleaned && !audio) || (cleaned && audio)) throw new InputError("empty_input");
  if (cleaned.length > 1000) throw new InputError("text_too_long");
  if (audio && !/^(audio\/(webm|mp4|mpeg|wav|x-wav|ogg)|video\/webm)(;.*)?$/.test(audio.type)) throw new InputError("unsupported_audio", 415);
  return { text: cleaned, audio, history: history.data, audioEnabled };
}

// Cost controls for one process/replica; provider caps remain necessary across restarts.
export class UsageGate {
  private hour = -1; private day = -1; private hourly = 0; private daily = 0; private inFlight = 0;
  acquire(now = Date.now(), perHour = 120, perDay = 500): (() => void) | null {
    const hour = Math.floor(now / 3600000), day = Math.floor(now / 86400000);
    if (hour !== this.hour) { this.hour = hour; this.hourly = 0; }
    if (day !== this.day) { this.day = day; this.daily = 0; }
    if (this.hourly >= perHour || this.daily >= perDay || this.inFlight >= 3) return null;
    this.hourly++; this.daily++; this.inFlight++;
    let released = false;
    return () => { if (!released) { released = true; this.inFlight--; } };
  }
}
export const usageGate = new UsageGate();
