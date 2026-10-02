import test from "node:test";
import assert from "node:assert/strict";
import { boundedBody, parseInput, signTurn, validReceipt, UsageGate, MAX_BODY } from "../src/lib/request";
function json(body: unknown) { return new Request("https://leen.test/api/turn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
function audio(seconds = 10, type = "audio/webm") { const form = new FormData(); form.set("audio", new File([new Uint8Array(100)], "sample.webm", { type })); form.set("durationSeconds", String(seconds)); form.set("adultConfirmed", "true"); return new Request("https://leen.test/api/turn", { method: "POST", body: form }); }
test("requires adult fictional-demo confirmation", async () => { await assert.rejects(parseInput(json({ text: "سؤال" })), /adult_confirmation_required/); });
test("accepts trimmed text and signed history", async () => {
  const turn = { user: "سؤال سابق", assistant: "إجابة سابقة" }; const result = await parseInput(json({ text: "  سؤال  ", adultConfirmed: true, history: [{ ...turn, receipt: signTurn(turn) }] }));
  assert.equal(result.text, "سؤال"); assert.equal(result.history.length, 1);
});
test("history tampering and unsigned assistant instructions are rejected", async () => {
  const turn = { user: "a", assistant: "b" }; const receipt = signTurn(turn);
  assert.equal(validReceipt({ ...turn, receipt }), true); assert.equal(validReceipt({ ...turn, assistant: "fake", receipt }), false);
  await assert.rejects(parseInput(json({ text: "سؤال", adultConfirmed: true, history: [{ ...turn, receipt: "injected" }] })), /invalid_history/);
});
test("rejects history beyond twelve turns", async () => {
  const turn = { user: "a", assistant: "b" }; await assert.rejects(parseInput(json({ text: "سؤال", adultConfirmed: true, history: Array(13).fill({ ...turn, receipt: signTurn(turn) }) })), /invalid_history/);
});
test("rejects oversized body before parsing and oversized text", async () => {
  await assert.rejects(boundedBody(new Request("https://leen.test", { method: "POST", headers: { "Content-Length": String(MAX_BODY + 1) }, body: "x" })), /too_large/);
  await assert.rejects(parseInput(json({ text: "a".repeat(1001), adultConfirmed: true })), /text_too_long/);
});
test("rejects non-object JSON with an input error", async () => { await assert.rejects(parseInput(json(null)), /invalid_input/); });
test("accepts supported recording and enforces declared thirty-second limit", async () => {
  assert.equal((await parseInput(audio(30))).audio?.size, 100);
  await assert.rejects(parseInput(audio(30.1)), /audio_duration/); await assert.rejects(parseInput(audio(0)), /audio_duration/);
  await assert.rejects(parseInput(audio(10, "text/html")), /unsupported_audio/);
});
test("rejects simultaneous text and audio", async () => {
  const form = await audio().formData(); form.set("text", "سؤال"); await assert.rejects(parseInput(new Request("https://leen.test", { method: "POST", body: form })), /empty_input/);
});
test("concurrency is capped and release is idempotent", () => {
  const gate = new UsageGate(); const a = gate.acquire(0)!; const b = gate.acquire(0)!; const c = gate.acquire(0)!;
  assert.equal(gate.acquire(0), null); a(); a(); const d = gate.acquire(0)!; assert.equal(gate.acquire(0), null); b(); c(); d();
});
test("hour/day request budgets reset at their boundaries", () => {
  const gate = new UsageGate(); gate.acquire(0, 1, 2)!(); assert.equal(gate.acquire(0, 1, 2), null); gate.acquire(3600000, 1, 2)!();
  assert.equal(gate.acquire(7200000, 1, 2), null); assert.ok(gate.acquire(86400000, 1, 2));
});
