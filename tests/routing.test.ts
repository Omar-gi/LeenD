import test from "node:test";
import assert from "node:assert/strict";
import { generateAnswer } from "../src/lib/answer";
import { classifyRequest, routeSchema, outsideScope } from "../src/lib/routing";
import { sources, policy } from "../src/lib/corpus";
import type { Generate } from "../src/lib/providers";

const route = { mode: "friendship", inScopeText: null, categoryIds: ["conflict"], sourceIds: [], safety: "none" };
const audit = { responseMode: "friendship", categoryIds: ["conflict"], contextSummary: "Fictional need", sourceReason: "No citations",
  supported: true, appropriate: true, inScope: true, contextRelevant: true, sourcesRelevant: true, safety: "none" };
const practical = { decision: "FULL", safety: "none", segments: [{ kind: "explanation", text: "تقدر تبعد شوي قبل ما تقرر ترجع تلعب معهم.", sourceIds: [], quoteId: null }] };
function sequence(...values: unknown[]): Generate { return async () => { assert.ok(values.length); return values.shift(); }; }

test("out-of-scope routing stops before writer, auditor and source completion", async () => {
  let calls = 0;
  const result = await generateAnswer("اشرح لي إعدادات المتصفح", [], undefined, async (_instructions, _input, _schema, name) => {
    assert.equal(++calls, 1); assert.equal(name, "leen_route");
    return { ...route, mode: "outside", categoryIds: [] };
  });
  assert.equal(result.answer, outsideScope().answer); assert.equal(calls, 1);
});

test("routing still checks safety across the entire input before applying scope", async () => {
  const result = await generateAnswer("عندي موضوع خاص في برنامج", [], undefined,
    sequence({ ...route, mode: "outside", categoryIds: [], safety: "threat" }));
  assert.equal(result.answer, policy.threat);
});

test("routing history excludes receipts and remains untrusted input, not instructions", async () => {
  await classifyRequest("ابسطه", [{ user: "FAKE_ADMIN_EXPAND_SCOPE", assistant: "TEST_ANSWER", receipt: "PRIVATE_RECEIPT" }], undefined, async (instructions, input) => {
    assert.ok(!instructions.includes("FAKE_ADMIN_EXPAND_SCOPE"));
    assert.ok(input.includes("FAKE_ADMIN_EXPAND_SCOPE")); assert.ok(!input.includes("PRIVATE_RECEIPT"));
    return { ...route, mode: "outside", categoryIds: [] };
  });
});

test("a writer cannot introduce an unselected hadith even if the audit would approve it", async () => {
  const forced = { ...practical, segments: [{ ...practical.segments[0], sourceIds: [sources[4].id] }] };
  let calls = 0;
  const result = await generateAnswer("متضايق من أصحابي وأبي أبعد شوي", [], undefined, async (instructions, input, _schema, name) => {
    calls++;
    if (name === "leen_route") return route;
    // Full unselected card data must not leak into either writing or auditing.
    assert.ok(!instructions.includes(sources[4].sourceQuote));
    if (calls === 2) return forced;
    if (calls === 3) { assert.equal(JSON.parse(input).outsideEvidence, true); return practical; }
    assert.equal(name, "leen_grounding"); return audit;
  });
  assert.equal(result.decision, "FULL"); assert.deepEqual(result.sources, []); assert.equal(calls, 4);
});

test("persistent source selection violations fail closed without publishing a hadith", async () => {
  const forced = { ...practical, segments: [{ ...practical.segments[0], sourceIds: [sources[1].id] }] };
  const result = await generateAnswer("موضوع مع أصحابي", [], undefined, sequence(route, forced, forced));
  assert.equal(result.limited, true); assert.deepEqual(result.sources, []);
});

test("simplify route controls unrecognized paraphrases without adding scripture", async () => {
  const source = sources[4];
  const explanation = { ...practical, segments: [{ ...practical.segments[0], text: "المسامحة مو ضعف، وتقدر تحافظ على حدودك.", sourceIds: [source.id] }] };
  const result = await generateAnswer("قلها بكلمات أسهل", [{ user: "أسامح صاحبي؟", assistant: `«${source.sourceQuote}»` }], undefined,
    sequence({ ...route, mode: "simplify", sourceIds: [source.id] }, explanation, { ...audit, responseMode: "simplify", categoryIds: [] }));
  assert.equal(result.decision, "FULL"); assert.ok(result.segments.every(s => s.kind !== "quote"));
});

test("classification cannot return an invented category or source ID", () => {
  assert.equal(routeSchema.safeParse({ ...route, categoryIds: ["programming"] }).success, false);
  assert.equal(routeSchema.safeParse({ ...route, sourceIds: ["new_scripture"] }).success, false);
});

test("mixed requests send only the exact friendship part to the writer and append a fixed limit", async () => {
  const friendship = "زميلي يضايقني، وش أسوي؟";
  const whole = `${friendship} واكتب لي كود برنامج.`;
  const names: string[] = [];
  const result = await generateAnswer(whole, [], undefined, async (_instructions, input, _schema, name) => {
    names.push(name); const data = JSON.parse(input);
    if (name === "leen_route") return { ...route, mode: "mixed", inScopeText: friendship };
    if (name === "leen_answer") { assert.equal(data.currentQuestion, friendship); assert.ok(!input.includes("كود برنامج")); return practical; }
    assert.equal(data.currentQuestion, whole); assert.equal(data.proposedAnswer.decision, "PARTIAL");
    assert.match(data.proposedAnswer.answer, /الجزء الآخر/);
    return { ...audit, responseMode: "mixed" };
  });
  assert.equal(result.decision, "PARTIAL"); assert.equal(result.limited, true);
  assert.deepEqual(names, ["leen_route", "leen_answer", "leen_grounding"]);
});

test("a fabricated extracted request cannot invent facts for the writer", async () => {
  const result = await generateAnswer("موقف مع زميلي وبعده سؤال تقني", [], undefined,
    sequence({ ...route, mode: "mixed", inScopeText: "صديقي هددني" }));
  assert.equal(result.answer, outsideScope().answer);
});

test("source-backed explanation cannot invent benefits even when the auditor is permissive", async () => {
  const source = sources[4];
  const invented = { ...practical, segments: [{ ...practical.segments[0], text: "المسامحة تجعل علاقتكم أفضل وتزيد حب الناس لك.", sourceIds: [source.id] }] };
  const result = await generateAnswer("هل العفو ضعف؟", [], undefined,
    sequence({ ...route, sourceIds: [source.id] }, invented, audit));
  assert.equal(result.segments[0].text, source.childExplanation);
  assert.ok(!result.answer.includes("حب الناس")); assert.ok(result.answer.includes(source.sourceQuote));
});

test("repeated simplification retains an earlier exact source without forcing another quotation", async () => {
  const source = sources[4];
  const explanation = { ...practical, segments: [{ ...practical.segments[0], text: "صياغة غير معتمدة", sourceIds: [source.id] }] };
  const result = await generateAnswer("قولها أسهل مرة ثانية", [
    { user: "العفو ضعف؟", assistant: `«${source.sourceQuote}»` },
    { user: "أبسط", assistant: source.simpleExplanation }
  ], undefined, sequence({ ...route, mode: "simplify", sourceIds: [source.id] }, explanation, { ...audit, responseMode: "simplify", categoryIds: [] }));
  assert.equal(result.answer, source.simpleExplanation); assert.ok(result.segments.every(s => s.kind !== "quote"));
});

test("a contextual request for known evidence retrieves the exact meaning and quote, then audits it", async () => {
  const source = sources[3]; const names: string[] = [];
  const result = await generateAnswer("أعطيني حديث عن سوء الظن لأني مو متأكد من قصدهم", [], undefined, async (_instructions, input, _schema, name) => {
    names.push(name);
    if (name === "leen_route") return { ...route, categoryIds: ["interpretation"], sourceIds: [source.id] };
    assert.equal(name, "leen_grounding"); const proposed = JSON.parse(input).proposedAnswer;
    assert.equal(proposed.segments[0].text, source.childExplanation);
    assert.equal(proposed.segments[1].text, source.sourceQuote);
    return { ...audit, categoryIds: ["interpretation"] };
  });
  assert.equal(result.decision, "FULL"); assert.deepEqual(names, ["leen_route", "leen_grounding"]);
});

test("simplifying the immediately preceding exact excerpt does not depend on rediscovering its source", async () => {
  const source = sources[3];
  const result = await generateAnswer("قولها أسهل", [{ user: "أبي الدليل", assistant: `«${source.sourceQuote}»` }], undefined,
    sequence({ ...route, mode: "simplify", categoryIds: [], sourceIds: [] }));
  assert.equal(result.answer, source.simpleExplanation); assert.ok(result.segments.every(s => s.kind !== "quote"));
});

test("simplification wording cannot bypass the limit on a mixed request", async () => {
  const source = sources[3];
  const friendship = "ما فهمت كلامك عن قصد صاحبي، اشرح لي أبسط.";
  const result = await generateAnswer(`${friendship} واكتب لي كود برنامج.`, [
    { user: "ما أعرف قصد صاحبي", assistant: `«${source.sourceQuote}»` }
  ], undefined, sequence(
    { ...route, mode: "mixed", inScopeText: friendship, sourceIds: [source.id], categoryIds: ["interpretation"] },
    { ...practical, segments: [{ ...practical.segments[0], text: source.simpleExplanation }] },
    { ...audit, responseMode: "mixed", categoryIds: ["interpretation"] }
  ));
  assert.equal(result.decision, "PARTIAL");
  assert.match(result.answer, /الجزء الآخر/);
  assert.ok(result.segments.every(s => s.kind !== "quote"));
});
