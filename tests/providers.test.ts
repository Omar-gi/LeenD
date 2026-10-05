import test from "node:test";
import assert from "node:assert/strict";
import { structured, speak, transcribe, ProviderError, candidateSchema, answerJsonFor } from "../src/lib/providers";
process.env.OPENAI_API_KEY = "test-key-not-real"; process.env.ELEVENLABS_API_KEY = "test-key-not-real";
const fetchStub = (fn: (url: string, init: RequestInit) => Promise<Response>) => fn as typeof fetch;
test("Responses uses store:false and strict schema; completed output is parsed", async () => {
  const result = await structured("trusted", "data", {}, "answer", undefined, fetchStub(async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses"); const body = JSON.parse(String(init.body));
    assert.equal(body.store, false); assert.equal(body.text.format.strict, true);
    return Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: '{"ok":true}' }] }] });
  })); assert.deepEqual(result, { ok: true });
});
test("provider refusal, incomplete output and malformed JSON fail closed", async () => {
  for (const data of [{ status: "incomplete" }, { status: "completed", output: [{ content: [{ type: "refusal" }] }] }, { status: "completed", output: [{ content: [{ type: "output_text", text: "bad json" }] }] }]) {
    await assert.rejects(structured("", "", {}, "x", undefined, fetchStub(async () => Response.json(data))), ProviderError);
  }
});
test("transcription requests Arabic and returns text only", async () => {
  const result = await transcribe(new File(["audio"], "a.webm", { type: "audio/webm" }), undefined, fetchStub(async (_url, init) => {
    const body = init.body as FormData; assert.equal(body.get("language"), "ar"); assert.equal(body.get("model"), "gpt-4o-mini-transcribe"); return Response.json({ text: "  صديقي زعلني  " });
  })); assert.equal(result, "صديقي زعلني");
});
test("speech sends exact text using the configured voice and Arabic", async () => {
  const text = "من كان يؤمن بالله واليوم الآخر فليقل خيرًا أو ليصمت";
  const result = await speak(text, undefined, fetchStub(async (url, init) => {
    assert.ok(url.includes("/voice1234?")); const body = JSON.parse(String(init.body)); assert.equal(body.text, text); assert.equal(body.language_code, "ar");
    return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "audio/mpeg" } });
  }), "voice1234"); assert.equal(result, "AQID");
});
test("provider errors never expose raw error messages", async () => {
  await assert.rejects(speak("x", undefined, fetchStub(async () => Response.json({ secret: "DO_NOT_LOG" }, { status: 401 })), "voice1234"), error => error instanceof ProviderError && !error.message.includes("DO_NOT_LOG"));
});
test("structured segments cannot combine an explanation with a quote identifier or generate quote words", () => {
  const candidate = { decision: "FULL", safety: "none", segments: [{ kind: "explanation", text: "شرح", sourceIds: ["source"], quoteId: "source" }] };
  assert.equal(candidateSchema.safeParse(candidate).success, false);
  assert.equal(candidateSchema.safeParse({ ...candidate, segments: [{ ...candidate.segments[0], kind: "quote", text: "invented words" }] }).success, false);
  assert.equal(candidateSchema.safeParse({ ...candidate, segments: [{ ...candidate.segments[0], kind: "quote", text: "" }] }).success, true);
});

test("per-request schema excludes unselected evidence and keeps meanings server-filled", () => {
  const empty = answerJsonFor([]).properties.segments.items.anyOf as Record<string, any>[];
  assert.equal(empty.length, 1); assert.equal(empty[0].properties.sourceIds.maxItems, 0);
  const selected = answerJsonFor(["friendship_suspicion"]).properties.segments.items.anyOf as Record<string, any>[];
  assert.equal(selected.length, 3);
  for (const item of selected.slice(1)) {
    assert.deepEqual(item.properties.text.enum, [""]);
    assert.deepEqual(item.properties.sourceIds.items.enum, ["friendship_suspicion"]);
  }
  assert.equal(candidateSchema.safeParse({ decision: "FULL", safety: "none", segments: [
    { kind: "meaning", text: "an invented benefit", sourceIds: ["friendship_suspicion"], quoteId: null }
  ] }).success, false);
});
