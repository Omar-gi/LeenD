import { z } from "zod";
import type { Candidate } from "./types";

export class ProviderError extends Error {
  constructor(public service: "openai" | "elevenlabs", public status: number, public code?: string) {
    super(`${service}_unavailable`);
  }
}

async function providerFailure(service: "openai" | "elevenlabs", response: Response) {
  let code: string | undefined;
  try { const body = await response.json(); const value = body.error?.code ?? body.detail?.status;
    if (typeof value === "string" && /^[a-z_]{3,80}$/.test(value)) code = value;
  } catch { /* Do not retain or log provider messages. */ }
  return new ProviderError(service, response.status, code);
}

export const candidateSchema = z.object({
  decision: z.enum(["CLARIFY", "FULL", "PARTIAL", "REFER"]),
  safety: z.enum(["none", "threat", "immediate", "uncertain"]),
  segments: z.array(z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("explanation"), text: z.string(), sourceIds: z.array(z.string()), quoteId: z.null() }).strict(),
    z.object({ kind: z.literal("quote"), text: z.literal(""), sourceIds: z.array(z.string()), quoteId: z.string() }).strict()
  ])).max(5)
}).strict();

export const checkSchema = z.object({
  supported: z.boolean(), appropriate: z.boolean(), inScope: z.boolean(),
  safety: z.enum(["none", "threat", "immediate", "uncertain"])
}).strict();

const segmentJson = { anyOf: [
  { type: "object", additionalProperties: false,
    properties: { kind: { type: "string", enum: ["explanation"] }, text: { type: "string" },
      sourceIds: { type: "array", items: { type: "string" } }, quoteId: { type: "null" } },
    required: ["kind", "text", "sourceIds", "quoteId"] },
  { type: "object", additionalProperties: false,
    properties: { kind: { type: "string", enum: ["quote"] }, text: { type: "string", enum: [""] },
      sourceIds: { type: "array", items: { type: "string" } }, quoteId: { type: "string" } },
    required: ["kind", "text", "sourceIds", "quoteId"] }
] };
export const answerJson = { type: "object", additionalProperties: false,
  properties: { decision: { type: "string", enum: ["CLARIFY", "FULL", "PARTIAL", "REFER"] },
    safety: { type: "string", enum: ["none", "threat", "immediate", "uncertain"] },
    segments: { type: "array", items: segmentJson } }, required: ["decision", "safety", "segments"] };
export const checkJson = { type: "object", additionalProperties: false,
  properties: { supported: { type: "boolean" }, appropriate: { type: "boolean" }, inScope: { type: "boolean" },
    safety: { type: "string", enum: ["none", "threat", "immediate", "uncertain"] } },
  required: ["supported", "appropriate", "inScope", "safety"] };

function signalFor(signal?: AbortSignal, ms = 22000) {
  return signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms);
}

export async function structured(instructions: string, input: string, schema: object, name: string,
  signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<unknown> {
  if (!process.env.OPENAI_API_KEY) throw new ProviderError("openai", 503);
  const response = await fetcher("https://api.openai.com/v1/responses", {
    method: "POST", signal: signalFor(signal),
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini", store: false,
      instructions, input, max_output_tokens: 1500,
      text: { format: { type: "json_schema", name, strict: true, schema } } })
  });
  if (!response.ok) throw await providerFailure("openai", response);
  const data = await response.json();
  if (data.status !== "completed") throw new ProviderError("openai", 502);
  const texts: string[] = [];
  for (const output of data.output ?? []) {
    for (const part of output.content ?? []) {
      if (part.type === "refusal") throw new ProviderError("openai", 422);
      if (part.type === "output_text" && typeof part.text === "string") texts.push(part.text);
    }
  }
  try { return JSON.parse(texts.join("")); }
  catch { throw new ProviderError("openai", 502); }
}

export async function transcribe(file: File, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new ProviderError("openai", 503);
  const form = new FormData();
  form.append("file", file);
  form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
  form.append("language", "ar");
  form.append("response_format", "json");
  const response = await fetcher("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form, signal: signalFor(signal, 15000)
  });
  if (!response.ok) throw await providerFailure("openai", response);
  const body = await response.json();
  return typeof body.text === "string" ? body.text.trim().slice(0, 1000) : "";
}

export async function speak(text: string, signal?: AbortSignal, fetcher: typeof fetch = fetch, voiceId = process.env.ELEVENLABS_VOICE_ID): Promise<string> {
  if (!process.env.ELEVENLABS_API_KEY || !voiceId || !/^[\w-]{8,80}$/.test(voiceId)) throw new ProviderError("elevenlabs", 503);
  const response = await fetcher(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: "POST", signal: signalFor(signal, 12000),
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5", language_code: "ar",
      voice_settings: { stability: 0.6, similarity_boost: 0.75, speed: 0.95 } })
  });
  if (!response.ok) throw await providerFailure("elevenlabs", response);
  if (!(response.headers.get("content-type") || "").startsWith("audio/")) throw new ProviderError("elevenlabs", 502);
  return Buffer.from(await response.arrayBuffer()).toString("base64");
}

export type Generate = (instructions: string, input: string, schema: object, name: string, signal?: AbortSignal) => Promise<unknown>;
export type ParsedCandidate = Candidate;
