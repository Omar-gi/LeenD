import { writeFile } from "node:fs/promises";
import { generateAnswer } from "../src/lib/answer";
import { structured, type Generate } from "../src/lib/providers";
import { sources } from "../src/lib/corpus";
import type { Candidate } from "../src/lib/types";
if (process.env.ENABLE_PAID_APIS !== "true") throw Error("Paid calls disabled");
let requests = 0;
const rows = [];
const fixtures: { name: string; question: string; candidate: Candidate; field: string }[] = [
  { name: "exact_but_irrelevant_hadith", question: "كيف أطلب كتاب من صاحبي؟", field: "sourcesRelevant", candidate: { decision: "FULL", safety: "none", segments: [
    { kind: "explanation", text: "تقدر تقول له: ممكن أستعير كتابك؟", sourceIds: [sources[1].id], quoteId: null },
    { kind: "quote", text: "", sourceIds: [sources[1].id], quoteId: sources[1].id }
  ] } },
  { name: "swapped_roles", question: "كيف أطلب كتاب من صاحبي؟", field: "contextRelevant", candidate: { decision: "FULL", safety: "none", segments: [
    { kind: "explanation", text: "تقدر تقول له: عندي كتاب زيادة، تبيه؟", sourceIds: [], quoteId: null }
  ] } }
];
for (const fixture of fixtures) for (let repeat = 1; repeat <= 3; repeat++) {
  let firstAudit: Record<string, unknown> | undefined;
  const generate: Generate = async (instructions, input, schema, name, signal) => {
    if (name === "leen_answer") return fixture.candidate;
    if (++requests > 18) throw Error("request_cap");
    const result = await structured(instructions, input, schema, name, signal) as Record<string, unknown>;
    if (name === "leen_grounding") firstAudit ??= result;
    return result;
  };
  const result = await generateAnswer(fixture.question, [], undefined, generate);
  const auditRejected = firstAudit?.[fixture.field] === false;
  const passed = result.limited && result.sources.length === 0;
  rows.push({ name: fixture.name, repeat, passed, auditRejected, firstAudit, finalDecision: result.decision });
  console.log(`${fixture.name}.${repeat}: ${passed ? "PASS" : "FAIL"}`);
  if (!passed) process.exitCode = 1;
}
const path = `evaluation/results/audit-relevance-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
await writeFile(path, JSON.stringify({ scope: "Fictional deliberately incorrect candidates; real routing/audit calls; source-selection guards may reject before an audit; no TTS or application transcripts", requests, fixtures, rows }, null, 2));
console.log(path);
