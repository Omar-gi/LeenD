import test from "node:test";
import assert from "node:assert/strict";
import { generateAnswer } from "../src/lib/answer";
import { sources, materialize, policy } from "../src/lib/corpus";
import type { Candidate } from "../src/lib/types";
import type { Generate } from "../src/lib/providers";
const candidate: Candidate = { decision: "FULL", safety: "none", segments: [{ kind: "explanation", text: "تقدر تطلب منه يتكلم معك باحترام.", sourceIds: [sources[0].id], quoteId: null }] };
const approved = { supported: true, appropriate: true, inScope: true, safety: "none" };
function sequence(...values: unknown[]): Generate { return async () => { assert.ok(values.length); return values.shift(); }; }
test("valid answer requires independent grounding approval", async () => {
  const result = await generateAnswer("صديقي يسخر من قراءتي", [], undefined, sequence(candidate, approved));
  assert.equal(result.decision, "FULL"); assert.equal(result.grounded, true); assert.equal(result.sources[0].id, sources[0].id);
});
test("only the exact server excerpt can be rendered as a quotation", () => {
  const result = materialize({ ...candidate, segments: [{ kind: "quote", text: "كلام مختلق", quoteId: sources[1].id, sourceIds: [sources[1].id] }] });
  assert.equal(result.segments[0].text, sources[1].sourceQuote); assert.ok(!result.answer.includes("مختلق"));
});
test("unknown sources produce a transparent limit before verification", async () => {
  const result = await generateAnswer("أبي حديث", [], undefined, sequence({ ...candidate, segments: [{ ...candidate.segments[0], sourceIds: ["invented"] }] }));
  assert.equal(result.limited, true); assert.deepEqual(result.sources, []);
});
test("unsupported or unsuitable religious claims never leave the verifier", async () => {
  for (const field of ["supported", "appropriate", "inScope"]) {
    const answer = await generateAnswer("سؤال", [], undefined, sequence(candidate, { ...approved, [field]: false }));
    assert.equal(answer.answer, policy.limitation); assert.equal(answer.grounded, false);
  }
});
test("direct threats bypass generation and cannot be blocked by missing religious evidence", async () => {
  const result = await generateAnswer("قال بيضربني إذا علمت أحد", [], undefined, async () => { throw Error("Must not call model"); });
  assert.equal(result.safety, "threat"); assert.equal(result.answer, policy.threat); assert.deepEqual(result.sources, []);
});
test("danger now uses immediate guidance", async () => {
  const result = await generateAnswer("هو جنبي الحين وبيضربني", [], undefined, sequence());
  assert.equal(result.safety, "immediate"); assert.equal(result.answer, policy.immediate);
});
test("negated threat fast path asks a safety clarification", async () => {
  const result = await generateAnswer("هو ما يهددني", [], undefined, sequence());
  assert.equal(result.decision, "CLARIFY"); assert.equal(result.safety, "uncertain");
});
test("semantic detector and independent audit can each trigger safety guidance", async () => {
  const a = await generateAnswer("فيه شيء خايف منه", [], undefined, sequence({ decision: "REFER", safety: "threat", segments: [] }));
  const b = await generateAnswer("فيه شيء خايف منه", [], undefined, sequence(candidate, { ...approved, safety: "threat" }));
  assert.equal(a.answer, policy.threat); assert.equal(b.answer, policy.threat);
});
test("history is bounded input data, stripped of receipts, and kept out of trusted instructions", async () => {
  let first = true;
  const generate: Generate = async (instructions, input) => {
    if (first) { first = false; assert.ok(!instructions.includes("UNTRUSTED_TEST_TEXT"));
      const data = JSON.parse(input); assert.equal(data.conversation[0].assistant, "UNTRUSTED_TEST_TEXT"); assert.equal(data.conversation[0].receipt, undefined); return candidate; }
    return approved;
  };
  await generateAnswer("وبعدين؟", [{ user: "سابق", assistant: "UNTRUSTED_TEST_TEXT", receipt: "dummy" }], undefined, generate);
});
test("full answer without evidence and invented attribution fail closed", () => {
  assert.throws(() => materialize({ ...candidate, segments: [{ ...candidate.segments[0], sourceIds: [] }] }));
  assert.throws(() => materialize({ ...candidate, segments: [{ ...candidate.segments[0], text: "قال النبي هذا مختلق" }] }));
});
test("clarification and scope referral can be source-free", () => {
  for (const decision of ["CLARIFY", "REFER"] as const) assert.equal(materialize({ ...candidate, decision, segments: [{ ...candidate.segments[0], sourceIds: [] }] }).decision, decision);
});
test("malformed provider schema cannot produce a spoken answer", async () => {
  await assert.rejects(generateAnswer("سؤال", [], undefined, sequence({ answer: "unvalidated" })));
});
test("fresh ambiguous pronoun gets clarification without invented context", async () => {
  const result = await generateAnswer("هو سواها مرة ثانية.", [], undefined, sequence());
  assert.equal(result.decision, "CLARIFY"); assert.equal(result.answer, policy.clarify);
});
test("individual faith verdicts are referred before generation", async () => {
  const result = await generateAnswer("هل صديقي صار كافر؟", [], undefined, sequence());
  assert.equal(result.decision, "REFER"); assert.equal(result.answer, policy.limitation);
});
test("negated actual danger in a fictional discussion is not asserted as real", async () => {
  const result = await generateAnswer("أسأل عن قصة خيالية وما أحد هددني في الواقع.", [], undefined, sequence());
  assert.equal(result.safety, "uncertain"); assert.equal(result.decision, "CLARIFY");
});
test("bare 'is this right' requires clarification in an empty session", async () => {
  const result = await generateAnswer("هل كذا صح؟", [], undefined, sequence()); assert.equal(result.decision, "CLARIFY");
});
test("approved but repetitive advice is replaced with a grounded next-step fallback", async () => {
  const result = await generateAnswer("قلت له يوقف وما وقف. أرد عليه؟", [{ user: "صديقي يسخر", assistant: "اطلب منه يوقف" }], undefined, sequence(candidate, approved));
  assert.equal(result.answer, policy.triedStop); assert.equal(result.sources.length, 2);
});
test("an assistant suggestion is never treated as a completed user action", async () => {
  const invented = { ...candidate, segments: [{ ...candidate.segments[0], text: "إذا استمر رغم أنك طلبت منه يوقف، اطلب مساعدة معلم." }] };
  const result = await generateAnswer("ولو كرر نفس التصرف بعدين؟", [{ user: "صديقي يستهزئ فيني", assistant: "اطلب منه يوقف" }], undefined, sequence(invented, approved));
  assert.equal(result.decision, "CLARIFY"); assert.equal(result.answer, policy.clarifyAction);
});
test("hypothetical teasing follow-up asks whether advice was tried without assuming it", async () => {
  const result = await generateAnswer("طيب إذا سواها بكرة؟", [{ user: "صديقي يستهزئ فيني إذا قرأت", assistant: "اطلب منه يوقف" }], undefined, sequence());
  assert.equal(result.decision, "CLARIFY"); assert.equal(result.answer, policy.clarifyAction);
});
test("a failed stop request is not replaced by the hypothetical-action clarification", async () => {
  const result = await generateAnswer("طيب إذا سواها بكرة؟", [{ user: "صديقي يستهزئ فيني وقلت له يوقف", assistant: "اطلب مساعدة معلم" }], undefined, sequence(candidate, approved));
  assert.equal(result.decision, "FULL");
});
