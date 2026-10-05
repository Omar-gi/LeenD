import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/turn/route";
import { sources } from "../src/lib/corpus";
import { validReceipt } from "../src/lib/request";
process.env.OPENAI_API_KEY = "test-key-not-real"; process.env.ELEVENLABS_API_KEY = "test-key-not-real";
process.env.ELEVENLABS_VOICE_ID = "voice1234"; process.env.APP_ORIGIN = "https://leen.test";
process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters";
process.env.ENABLE_PAID_APIS = "true";
const request = () => new Request("https://leen.test/api/turn", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://leen.test" }, body: JSON.stringify({ text: "صديقي يسخر من قراءتي", adultConfirmed: true }) });
function approved(init?: RequestInit) {
  const payload = JSON.parse(String(init?.body));
  const result = payload.text.format.name === "leen_route" ? { mode: "friendship", inScopeText: null, categoryIds: ["teasing"], sourceIds: [sources[0].id], safety: "none" } : payload.text.format.name === "leen_answer" ? { decision: "FULL", safety: "none", segments: [{ kind: "explanation", text: "تقدر تطلب منه يحترمك.", sourceIds: [sources[0].id], quoteId: null }, { kind: "quote", text: "", sourceIds: [sources[0].id], quoteId: sources[0].id }] } : { responseMode: "friendship", categoryIds: ["kindness"], contextSummary: "Relevant fictional response", sourceReason: "Relevant lesson", supported: true, appropriate: true, inScope: true, contextRelevant: true, sourcesRelevant: true, safety: "none" };
  return Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(result) }] }] });
}
test("voice failure preserves validated text and signed history receipt", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => String(url).includes("elevenlabs") ? Response.json({}, { status: 503 }) : approved(init);
  try { const response = await POST(request()); const body = await response.json(); assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store"); assert.equal(body.audioStatus, "unavailable"); assert.equal(body.grounded, true); assert.ok(validReceipt({ user: body.transcript, assistant: body.answer, receipt: body.receipt })); }
  finally { globalThis.fetch = original; }
});
test("spoken input contains the same exact hadith and attribution as the visible reply", async () => {
  const original = globalThis.fetch; let spokenText = "";
  globalThis.fetch = async (url, init) => {
    if (!String(url).includes("elevenlabs")) return approved(init);
    spokenText = JSON.parse(String(init?.body)).text;
    return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/mpeg" } });
  };
  try {
    const response = await POST(request()); const body = await response.json();
    assert.equal(response.status, 200); assert.equal(body.audioStatus, "ready");
    assert.equal(spokenText, body.answer);
    assert.ok(spokenText.includes(`${sources[0].quoteIntroduction}\n«${sources[0].sourceQuote}»`));
    assert.equal(body.segments.find((s: { kind: string }) => s.kind === "quote").text, sources[0].sourceQuote);
  } finally { globalThis.fetch = original; }
});
test("generation failure emits sanitized retryable error, never an invented answer", async () => {
  const original = globalThis.fetch; globalThis.fetch = async () => Response.json({ error: { message: "private provider body" } }, { status: 429 });
  try { const response = await POST(request()); assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: "provider_busy" }); }
  finally { globalThis.fetch = original; }
});
test("transcription failure emits no conversation turn", async () => {
  const original = globalThis.fetch; globalThis.fetch = async () => Response.json({}, { status: 503 });
  const form = new FormData(); form.set("audio", new File(["audio"], "a.webm", { type: "audio/webm" })); form.set("durationSeconds", "3"); form.set("adultConfirmed", "true");
  try { const response = await POST(new Request("https://leen.test/api/turn", { method: "POST", body: form })); assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: "provider_unavailable" }); }
  finally { globalThis.fetch = original; }
});
test("cross-origin request is rejected before calling a provider", async () => {
  const r = request(); r.headers.set("origin", "https://attacker.test"); assert.equal((await POST(r)).status, 403);
});
test("billing opt-in is required before any paid call", async () => {
  process.env.ENABLE_PAID_APIS = "false";
  const original = globalThis.fetch; globalThis.fetch = async () => { throw Error("Must not call any provider"); };
  try { const response = await POST(request()); assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: "billing_disabled" }); }
  finally { globalThis.fetch = original; process.env.ENABLE_PAID_APIS = "true"; }
});
