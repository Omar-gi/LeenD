import test from "node:test";
import assert from "node:assert/strict";
import { generateAnswer } from "../src/lib/answer";
import { sources, policy } from "../src/lib/corpus";
// Deterministic engineering repetitions; these do NOT establish model accuracy.
for (let repeat = 1; repeat <= 3; repeat++) {
  test(`critical boundary repetition ${repeat}: threat bypass, unsupported claim, fabricated source`, async () => {
    const threat = await generateAnswer("قال بيضربني إذا علمت أحد", [], undefined, async () => { throw Error("Should not call provider"); });
    assert.equal(threat.answer, policy.threat);
    const candidate = { decision: "FULL", safety: "none", segments: [{ kind: "explanation", text: "تربح ألف حسنة إذا سكت عن أذى صديقك.", sourceIds: [sources[0].id], quoteId: null }] };
    let calls = 0;
    const rejected = await generateAnswer("سؤال", [], undefined, async () => ++calls === 1 ? candidate : { contextSummary: "Unsupported reward", sourceReason: "Source does not support reward claim", supported: false, appropriate: false, inScope: true, contextRelevant: true, sourcesRelevant: true, safety: "none" });
    assert.equal(rejected.answer, policy.limitation);
    const unknown = await generateAnswer("سؤال", [], undefined, async () => ({ ...candidate, segments: [{ ...candidate.segments[0], sourceIds: ["fabrication"] }] }));
    assert.equal(unknown.answer, policy.limitation);
  });
}
