import test from "node:test";
import assert from "node:assert/strict";
import { generateAnswer } from "./helpers";
import { sources, materialize, policy } from "../src/lib/corpus";
import type { Candidate } from "../src/lib/types";
import type { Generate } from "../src/lib/providers";
import { clarifyReturnRoles, practicalRequestWithoutEvidence, quotationContext } from "../src/lib/dialogue";
const candidate: Candidate = { decision: "FULL", safety: "none", segments: [
  { kind: "explanation", text: "تقدر تطلب منه يتكلم معك باحترام.", sourceIds: [sources[0].id], quoteId: null },
  { kind: "quote", text: "", sourceIds: [sources[0].id], quoteId: sources[0].id }
] };
const approved = { responseMode: "friendship", categoryIds: ["kindness"], contextSummary: "Relevant fictional response", sourceReason: "Applicable evidence or source-free practical help", supported: true, appropriate: true, inScope: true, contextRelevant: true, sourcesRelevant: true, safety: "none" };
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
test("practical help can be source-free but explicit religious claims and invented attribution fail closed", () => {
  const practical = materialize({ ...candidate, segments: [{ ...candidate.segments[0], text: "تقدر تعرض عليه قلمك الزيادة.", sourceIds: [] }] });
  assert.equal(practical.decision, "FULL"); assert.deepEqual(practical.sources, []);
  assert.throws(() => materialize({ ...candidate, segments: [{ ...candidate.segments[0], text: "ديننا يعلمنا أن هذه الهدية واجب ديني.", sourceIds: [] }] }));
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
  assert.equal(result.segments[0].text, policy.triedStop); assert.equal(result.sources.length, 2);
  assert.ok(result.answer.includes(sources[1].sourceQuote));
});
test("an assistant suggestion is never treated as a completed user action", async () => {
  const invented = { ...candidate, segments: [{ ...candidate.segments[0], text: "إذا استمر رغم أنك طلبت منه يوقف، اطلب مساعدة معلم." }] };
  const fixed = { ...candidate, segments: [{ ...candidate.segments[0], text: "إذا كرر السخرية، تقدر تبتعد وتطلب مساعدة معلم." }] };
  const result = await generateAnswer("ولو كرر نفس التصرف بعدين؟", [{ user: "صديقي يستهزئ فيني", assistant: "اطلب منه يوقف" }], undefined, sequence(invented, approved, fixed, approved));
  assert.equal(result.decision, "FULL"); assert.ok(!/[؟?]/.test(result.answer)); assert.ok(!result.answer.includes("رغم"));
});
test("hypothetical teasing follow-up can get a conditional answer without an interview", async () => {
  const conditional = { ...candidate, segments: [{ ...candidate.segments[0], text: "إذا كرر السخرية، تقدر تبتعد وتطلب مساعدة معلم." }] };
  const result = await generateAnswer("طيب إذا سواها بكرة؟", [{ user: "صديقي يستهزئ فيني إذا قرأت", assistant: "اطلب منه يوقف" }], undefined, sequence(conditional, approved));
  assert.equal(result.decision, "FULL"); assert.ok(!/[؟?]/.test(result.answer));
});
test("a failed stop request is not replaced by the hypothetical-action clarification", async () => {
  const result = await generateAnswer("طيب إذا سواها بكرة؟", [{ user: "صديقي يستهزئ فيني وقلت له يوقف", assistant: "اطلب مساعدة معلم" }], undefined, sequence(candidate, approved));
  assert.equal(result.decision, "FULL");
});
test("source attachments never auto-insert a hadith into a reply", () => {
  for (const decision of ["FULL", "PARTIAL"] as const) {
    const answer = materialize({ ...candidate, decision, segments: [candidate.segments[0]] });
    assert.equal(answer.segments.filter(s => s.kind === "quote").length, 0);
    assert.equal(answer.sources[0].id, sources[0].id);
  }
});
test("an explicitly chosen quote keeps its position and context without a duplicate", () => {
  const answer = materialize({ ...candidate, segments: [
    { kind: "quote", text: "ignored invented text", sourceIds: [sources[2].id], quoteId: sources[2].id },
    { kind: "explanation", text: "تقدر تساعد صديقك يوقف الأذى بدون مواجهة جسدية.", sourceIds: [sources[2].id], quoteId: null }
  ] });
  assert.equal(answer.segments[0].text, sources[2].sourceQuote);
  assert.equal(answer.segments.filter(s => s.kind === "quote").length, 1);
  assert.ok(answer.answer.startsWith(sources[2].quoteIntroduction));
  assert.ok(!answer.answer.includes("invented"));
});
test("the grounding audit sees the inserted hadith before the answer can be spoken", async () => {
  let calls = 0;
  const result = await generateAnswer("صديقي يسخر من قراءتي", [], undefined, async (_instructions, input) => {
    if (++calls === 1) return candidate;
    const proposed = JSON.parse(input).proposedAnswer;
    assert.equal(proposed.segments[1].text, sources[0].sourceQuote);
    assert.ok(proposed.answer.includes(sources[0].quoteIntroduction));
    return { ...approved, supported: false };
  });
  assert.equal(result.answer, policy.limitation);
  assert.ok(!result.segments.some(s => s.kind === "quote"));
});
test("clarifications and referrals do not receive an automatic quotation", () => {
  for (const decision of ["CLARIFY", "REFER"] as const) {
    const answer = materialize({ ...candidate, decision, segments: [candidate.segments[0]] });
    assert.equal(answer.segments.filter(s => s.kind === "quote").length, 0);
  }
});
test("an unrelated worship request cannot borrow a friendship hadith as evidence", async () => {
  for (const text of ["وش أقول في دعاء القنوت؟", "كيف أحسب زكاة مالي؟", "كيف أصلي صلاة الوتر؟"]) {
    const result = await generateAnswer(text, [], undefined, sequence());
    assert.equal(result.decision, "REFER"); assert.deepEqual(result.sources, []);
  }
});
test("friendship questions mentioning worship still receive supported advice", async () => {
  const result = await generateAnswer("صديقي يسخر من قراءتي بعد الصلاة", [], undefined, sequence(candidate, approved));
  assert.equal(result.decision, "FULL"); assert.ok(result.segments.some(s => s.kind === "quote"));
});
test("accidental JSON braces are removed from prose before display and audit", () => {
  const result = materialize({ ...candidate, segments: [{ ...candidate.segments[0], text: "تقدر تطلب منه يتكلم باحترام. {" }] });
  assert.equal(result.segments[0].text, "تقدر تطلب منه يتكلم باحترام.");
  assert.equal(result.segments.length, 1);
});

test("a follow-up retains its evidence without repeating an earlier hadith", async () => {
  const first = materialize(candidate);
  const repeated = candidate;
  const result = await generateAnswer("وش أقدر أقول له؟", [{ user: "صديقي يسخر", assistant: first.answer }], undefined, sequence(repeated, approved));
  assert.equal(result.decision, "FULL"); assert.equal(result.sources[0].id, sources[0].id);
  assert.equal(result.segments.filter(s => s.kind === "quote").length, 0);
  assert.equal(result.grounded, true);
});

test("an explicit request can repeat the exact stored text", async () => {
  const first = materialize(candidate);
  const result = await generateAnswer("كرر الحديث", [{ user: "صديقي يسخر", assistant: first.answer }], undefined, sequence(candidate, approved));
  assert.equal(result.segments.filter(s => s.kind === "quote").length, 1);
  assert.ok(result.answer.includes(sources[0].sourceQuote));
});

test("quote history comes only from assistant excerpts and clears with a new session", () => {
  const first = materialize(candidate);
  assert.deepEqual(quotationContext("وبعدين؟", [{ user: first.answer, assistant: "وش صار؟" }]).quotedSourceIds, []);
  assert.deepEqual(quotationContext("وبعدين؟", [{ user: "سؤال", assistant: first.answer }]).quotedSourceIds, [sources[0].id]);
  assert.equal(materialize(candidate, quotationContext("سؤال جديد", [])).segments.filter(s => s.kind === "quote").length, 1);
});

test("the failed-advice fallback does not introduce a new quotation on a follow-up", async () => {
  const first = materialize(candidate);
  const result = await generateAnswer("قلت له يوقف وما وقف. أرد عليه؟", [{ user: "صديقي يسخر", assistant: first.answer }], undefined, sequence(candidate, approved));
  assert.equal(result.segments[0].text, policy.triedStop);
  assert.equal(result.segments.filter(s => s.kind === "quote").length, 0);
  assert.equal(result.sources.length, 2);
});

test("a newly relevant explicit quotation is allowed but not automatically added for variety", () => {
  const context = { quotedSourceIds: [sources[0].id], repeatQuote: false };
  const newSource: Candidate = { ...candidate, segments: [{ ...candidate.segments[0], sourceIds: [sources[2].id] }] };
  assert.equal(materialize(newSource, context).segments.filter(s => s.kind === "quote").length, 0);
  newSource.segments.push({ kind: "quote", text: "", sourceIds: [sources[2].id], quoteId: sources[2].id });
  assert.equal(materialize(newSource, context).segments[1].text, sources[2].sourceQuote);
});

test("model-generated quotes cannot enter clarification or referral replies", () => {
  for (const decision of ["CLARIFY", "REFER"] as const) assert.throws(() => materialize({ decision, safety: "none",
    segments: [{ kind: "quote", text: "", sourceIds: [sources[0].id], quoteId: sources[0].id }] }));
});

test("short greetings and closings need neither a paid call nor an unsolicited lesson", async () => {
  for (const text of ["السلام عليكم", "مرحبا", "خلاص شكرًا، مع السلامة.", "باي"]) {
    const result = await generateAnswer(text, [], undefined, sequence());
    assert.equal(result.decision, "FULL"); assert.deepEqual(result.sources, []);
    assert.ok(!/[؟?]/.test(result.answer)); assert.equal(result.safety, "none");
  }
});

test("a greeting or goodbye prefix never hides danger in the rest of the message", async () => {
  const threat = await generateAnswer("شكرا بس هو بيضربني", [], undefined, sequence());
  assert.equal(threat.safety, "threat");
  const semantic = await generateAnswer("مرحبا شخص في اللعبة طلب صور خاصة وقال سر", [], undefined,
    sequence({ decision: "REFER", safety: "threat", segments: [] }));
  assert.equal(semantic.safety, "threat");
});

test("the verified draft suspicion card supplies its own exact evidence", async () => {
  const source = sources.find(s => s.id === "friendship_suspicion")!;
  for (const text of ["أعطيني حديثًا عن حسن الظن لأن صديقاتي يهمسون.", "وش الدليل عن سوء الظن؟"]) {
    const lesson = { ...candidate, segments: [{ ...candidate.segments[0], text: "الظن وحده ما يكفي للجزم بقصد الآخرين.", sourceIds: [source.id] }] };
    const answer = await generateAnswer(text, [], undefined, sequence(lesson, approved));
    assert.equal(answer.decision, "FULL"); assert.equal(answer.sources[0].id, source.id);
    assert.ok(answer.answer.includes(source.sourceQuote)); assert.equal(source.reviewStatus, "draft");
  }
});

test("freeform quotations and reversed attribution cannot bypass exact quote segments", () => {
  for (const text of [sources[1].sourceQuote, `النبي صلى الله عليه وسلم قال: كلام مختلق`, `الحديث الشريف يقول: كلام مختلق`]) {
    assert.throws(() => materialize({ ...candidate, segments: [{ ...candidate.segments[0], text }] }));
  }
});

test("clear photo coercion, unwanted touching and self-harm interrupt the dialogue without a provider", async () => {
  for (const text of ["واحد في اللعبة طلب مني صور جسمي وقال لا تعلم أحد", "واحد من أهلي يلمس جسمي بطريقة تضايقني ويقول سر العائلة", "أفكر أؤذي نفسي"]) {
    const result = await generateAnswer(text, [], undefined, sequence());
    assert.equal(result.safety, "threat"); assert.equal(result.answer, policy.threat);
    assert.ok(result.answer.includes("معلّم")); assert.deepEqual(result.sources, []);
  }
  const negated = await generateAnswer("ما طلب مني صور خاصة، بس أسأل", [], undefined, sequence());
  assert.equal(negated.safety, "uncertain");
});

test("one format repair can recover a misplaced quotation but still requires the audit", async () => {
  const malformed = { ...candidate, segments: [{ ...candidate.segments[0], text: `النبي صلى الله عليه وسلم قال: ${sources[0].sourceQuote}` }] };
  const fixed = await generateAnswer("صديقي يسخر مني، وش أقول؟", [], undefined, sequence(malformed, candidate, approved));
  assert.equal(fixed.decision, "FULL"); assert.equal(fixed.grounded, true);
  const rejected = await generateAnswer("صديقي يسخر مني، وش أقول؟", [], undefined, sequence(malformed, candidate, { ...approved, supported: false }));
  assert.equal(rejected.answer, policy.limitation);
  const repeated = await generateAnswer("صديقي يسخر مني، وش أقول؟", [], undefined, sequence(malformed, malformed));
  assert.equal(repeated.answer, policy.limitation);
});

test("a practical request rejects unselected scripture before auditing the repaired answer", async () => {
  const practical: Candidate = { decision: "FULL", safety: "none", segments: [
    { kind: "explanation", text: "تقدر تقول له: عندي قلم زيادة، تبيه؟", sourceIds: [], quoteId: null }
  ] };
  let calls = 0;
  const result = await generateAnswer("ودي أعطي صاحبي قلم، كيف أعرضه عليه؟", [], undefined, async (_instructions, input, _schema, name) => {
    calls++;
    if (calls === 1) return candidate;
    if (calls === 2) {
      assert.equal(JSON.parse(input).outsideEvidence, true);
      return practical;
    }
    assert.equal(name, "leen_grounding");
    assert.deepEqual(JSON.parse(input).proposedAnswer.sources, []);
    return approved;
  });
  assert.equal(calls, 3); assert.equal(result.grounded, true);
  assert.deepEqual(result.sources, []); assert.equal(result.answer, practical.segments[0].text);
});

test("a repeated relevance failure cannot escape or fall back to a hadith", async () => {
  for (const field of ["sourcesRelevant", "contextRelevant"]) {
    const rejected = { ...approved, [field]: false };
    const result = await generateAnswer("قلت له يوقف وما وقف، وش أسوي؟", [{ user: "صديقي يسخر مني", assistant: "وش صار؟" }], undefined,
      sequence(candidate, rejected, candidate, rejected));
    assert.equal(result.answer, policy.limitation); assert.deepEqual(result.sources, []);
  }
});

test("swapped giver and receiver can be repaired into a targeted clarification", async () => {
  const clarify: Candidate = { decision: "CLARIFY", safety: "none", segments: [
    { kind: "explanation", text: "تقصد أنت بترجع له الكتاب، أو هو بيرجعه لك؟", sourceIds: [], quoteId: null }
  ] };
  const result = await generateAnswer("أبيه يرجع لي الكتاب", [{ user: "أنا نسيت أرجع له كتابه", assistant: "تقدر توضح له." }], undefined,
    sequence(candidate, { ...approved, contextRelevant: false }, clarify, approved));
  assert.equal(result.decision, "CLARIFY"); assert.deepEqual(result.sources, []);
});

test("format and relevance repairs share one attempt budget", async () => {
  const malformed = { ...candidate, segments: [{ ...candidate.segments[0], text: "قال النبي كلام مختلق" }] };
  const result = await generateAnswer("ودي أعرض قلم على صاحبي", [], undefined,
    sequence(malformed, candidate, { ...approved, sourcesRelevant: false }));
  assert.equal(result.answer, policy.limitation);
});

test("source-free practical help still needs religious-claim and safety checks", async () => {
  const practical = { ...candidate, segments: [{ ...candidate.segments[0], text: "تقدر تعرض عليه القلم.", sourceIds: [] }] };
  const allowed = await generateAnswer("كيف أعرض القلم على صديقي؟", [], undefined, sequence(practical, approved));
  assert.equal(allowed.decision, "FULL"); assert.deepEqual(allowed.sources, []); assert.equal(allowed.grounded, true);
  const rejected = await generateAnswer("سؤال", [], undefined, sequence(practical, { ...approved, supported: false }));
  assert.equal(rejected.answer, policy.limitation);
  const safety = await generateAnswer("موقف مع صديقي", [], undefined, sequence(practical, { ...approved, safety: "threat", contextRelevant: false }));
  assert.equal(safety.answer, policy.threat);
});

test("an audit missing the relevance checks fails closed", async () => {
  const { contextRelevant: _context, sourcesRelevant: _sources, ...oldAudit } = approved;
  await assert.rejects(generateAnswer("صديقي يسخر مني", [], undefined, sequence(candidate, oldAudit)));
});

test("a direct same-item return-role conflict asks once without guessing or citing", async () => {
  const history = [{ user: "أنا نسيت أرجع لصاحبتي دفترها، ودي أعطيها إياه بكرة.", assistant: "تقدر توضح لها." }];
  const result = await generateAnswer("كيف أقول لها بكرة ترجعين لي الدفتر؟", history, undefined, sequence(candidate, approved));
  assert.equal(result.decision, "CLARIFY"); assert.deepEqual(result.sources, []);
  assert.equal(clarifyReturnRoles("كيف أقول لها ترجعين لي الكتاب؟", history), null);
  assert.equal(clarifyReturnRoles("قصدي هي ترجع لي الدفتر، مو أنا", history), null);
  assert.equal(clarifyReturnRoles("كيف أقول لها ترجعين لي الدفتر؟", []), null);
  assert.equal(clarifyReturnRoles("أنا بأرجع لها الدفتر بكرة", history), null);
  const threat = await generateAnswer("كيف أقول لها ترجعين لي الدفتر؟", history, undefined,
    sequence(candidate, { ...approved, safety: "threat" }));
  assert.equal(threat.answer, policy.threat);
});

test("practical friendship permission never admits unsupported supplications or rewards", async () => {
  const result = await generateAnswer("أبي دعاء مخصوص إذا نسيت هدية لصديقي وكم أجره؟", [], undefined, sequence());
  assert.equal(result.decision, "REFER"); assert.deepEqual(result.sources, []);
  for (const text of ["الأجر من الله لما تكون نيتك طيبة.", "ما في دعاء خاص لهذا.", "الله يحبك إذا أعطيت صاحبك قلم."]) {
    assert.throws(() => materialize({ ...candidate, segments: [{ ...candidate.segments[0], text, sourceIds: [] }] }));
  }
});

test("ordinary item requests reject forced sources before an auditor can approve them", async () => {
  for (const text of ["كيف أطلب كتاب من صاحبي؟", "ودي أعطيه بسكوت، وش أقول؟", "أبي أعزم صديقي يلعب معي في الفسحة"]) {
    assert.equal(practicalRequestWithoutEvidence(text), true);
    const result = await generateAnswer(text, [], undefined, sequence(candidate, candidate));
    assert.equal(result.answer, policy.limitation); assert.deepEqual(result.sources, []);
  }
  for (const text of ["أبي الحديث عن الكلام الطيب", "أعطيني دعاء للهدية", "صديقي يسخر من كتابي", "صديقي يستهزئ بلعبتي", "كيف أرد على صديقي إذا يضحك على قلمي؟"]) {
    assert.equal(practicalRequestWithoutEvidence(text), false);
  }
});
