import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { generateAnswer } from "../src/lib/answer";
import { sources } from "../src/lib/corpus";
import { assistantQuestionCount, quotationContext } from "../src/lib/dialogue";
import { ProviderError, structured, type Generate } from "../src/lib/providers";
import type { ConversationTurn } from "../src/lib/types";
import { cases } from "../evaluation/cases";

if (process.env.ENABLE_PAID_APIS !== "true") throw new Error("Paid API calls are disabled. Enable only after accepting separate API billing.");
if (!process.env.OPENAI_API_KEY) throw new Error("Set OPENAI_API_KEY in .env.local. This command makes paid API requests with fictional test cases only.");
const rows: Record<string, unknown>[] = [];
const sourceHashes: Record<string, string> = {};
for (const path of ["src/lib/answer.ts", "src/lib/routing.ts", "src/lib/prompts/leen.ts", "src/lib/dialogue.ts", "src/lib/corpus.ts", "src/lib/providers.ts", "src/content/scope.json", "src/content/sources.json", "src/content/safety.json"]) sourceHashes[path] = createHash("sha256").update(await readFile(path)).digest("hex");
const selected = process.argv.find(arg => arg.startsWith("--cases="))?.slice(8).split(",");
let blocked = false;
let budgetReached = false;
const usage = { requests: 0, inputTokens: 0, outputTokens: 0, estimatedUsd: 0 };
if (process.env.OPENAI_TEXT_MODEL && process.env.OPENAI_TEXT_MODEL !== "gpt-4.1-mini") throw new Error("This cost-bounded runner currently supports gpt-4.1-mini only. Review pricing before changing models.");
const meteredFetch: typeof fetch = async (url, init) => {
  // Leave a large reserve below $2; cap requests even if a provider omits usage.
  if (usage.estimatedUsd >= 1.5 || usage.requests >= 120) throw new Error("evaluation_budget_reached");
  usage.requests++;
  const response = await fetch(url, init);
  if (response.ok) {
    const data = await response.clone().json();
    if (data.usage) { usage.inputTokens += data.usage.input_tokens || 0; usage.outputTokens += data.usage.output_tokens || 0; }
    // Standard uncached prices per million tokens; conservative if caching applies.
    usage.estimatedUsd = (usage.inputTokens * 0.4 + usage.outputTokens * 1.6) / 1000000;
  }
  return response;
};
let audits: unknown[] = [];
let drafts: unknown[] = [];
let routes: unknown[] = [];
const meteredGenerate: Generate = async (instructions, input, schema, name, signal) => {
  const result = await structured(instructions, input, schema, name, signal, meteredFetch);
  if (name === "leen_route") routes.push(result);
  if (name === "leen_grounding") audits.push(result);
  if (name === "leen_answer") drafts.push({ currentQuestion: JSON.parse(input).currentQuestion, result });
  return result;
};
for (const c of cases) {
  if (selected && !selected.includes(c.id)) continue;
  if (c.engineering) { rows.push({ id: c.id, category: c.category, status: "run_npm_test", test: c.engineering }); continue; }
  for (let repeat = 1; repeat <= (c.critical ? 3 : 1); repeat++) {
    if (blocked) { rows.push({ id: c.id, repeat, status: budgetReached ? "not_run_budget_reached" : "not_run_provider_blocked" }); continue; }
    const history: ConversationTurn[] = []; const outputs = []; const turnTimingsMs: number[] = []; let final;
    audits = [];
    drafts = [];
    routes = [];
    const start = performance.now();
    try {
      for (const question of c.turns) {
        const turnStart = performance.now();
        final = await generateAnswer(question, history, undefined, meteredGenerate);
        turnTimingsMs.push(Math.round(performance.now() - turnStart));
        outputs.push(final); history.push({ user: question, assistant: final.answer });
      }
      if (!final) throw new Error("empty_case");
      const decisionMatch = c.decisions.includes(final.decision) && outputs.every((a, i) => !c.turnDecisions?.[i] || c.turnDecisions[i].includes(a.decision));
      const safetyMatch = !c.safety || c.safety.includes(final.safety);
      const quoteMatch = outputs.every(a => a.segments.every(s => s.kind !== "quote" || sources.some(source => source.id === s.quoteId && source.sourceQuote === s.text)));
      const quoteIncluded = outputs.every((a, index) => {
        const quotes = a.segments.filter(s => s.kind === "quote");
        const expected = c.turnQuotes?.[index];
        if (expected === "one" && quotes.length !== 1 || expected === "none" && quotes.length !== 0) return false;
        if (!["FULL", "PARTIAL"].includes(a.decision) || !a.sources.length) return quotes.length === 0;
        const context = quotationContext(c.turns[index], history.slice(0, index));
        return quotes.length <= 1 && quotes.every(s => context.repeatQuote || !context.quotedSourceIds.includes(s.quoteId!));
      });
      const sourcePolicyMatch = outputs.every((a, index) => {
        const expected = c.turnSources?.[index];
        return expected === "none" ? a.sources.length === 0 && a.segments.every(s => !s.sourceIds.length) : expected !== "some" || a.sources.length > 0;
      });
      const topicMatch = outputs.every((a, index) => {
        const ids = c.turnSourceIds?.[index];
        return !ids?.length || a.sources.length > 0 && a.sources.every(s => ids.includes(s.id));
      });
      const questionCounts = outputs.map(a => assistantQuestionCount(a.answer));
      const questionPolicyMatch = questionCounts.every((count, index) => c.maxQuestions?.[index] === undefined || count <= c.maxQuestions[index]);
      const passed = decisionMatch && safetyMatch && quoteMatch && quoteIncluded && sourcePolicyMatch && topicMatch && questionPolicyMatch;
      if (!passed) process.exitCode = 1;
      rows.push({ id: c.id, repeat, category: c.category, status: passed ? "automatic_checks_pass_human_review_required" : "automatic_check_failed",
        elapsedMs: Math.round(performance.now() - start), turnTimingsMs, decisionMatch, safetyMatch, quoteMatch, quoteIncluded, sourcePolicyMatch, topicMatch, questionPolicyMatch, questionCounts, humanReview: "pending", rubric: c.review,
        // These are predefined fictional evaluation cases, never application user logs.
        fictionalConversation: history, outputs, routes, audits, drafts });
      console.log(`${c.id}.${repeat} ${passed ? "CHECKS PASS" : "CHECK FAILED"} — human review pending`);
    } catch (error) {
      const code = error instanceof Error && error.message === "evaluation_budget_reached" ? "evaluation_budget_reached" : error instanceof ProviderError ? error.code || `http_${error.status}` : "network_timeout_or_invalid_output";
      rows.push({ id: c.id, repeat, status: "provider_error", code, elapsedMs: Math.round(performance.now() - start) });
      console.log(`${c.id}.${repeat} blocked: ${code}`);
      if (error instanceof ProviderError && [401, 402, 403, 429].includes(error.status)) blocked = true;
      if (code === "evaluation_budget_reached") { blocked = true; budgetReached = true; }
      process.exitCode = 1;
    }
  }
}
await mkdir("evaluation/results", { recursive: true });
const file = `evaluation/results/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
await writeFile(file, JSON.stringify({ at: new Date().toISOString(), model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini", scope: "fictional text evaluation; timings exclude STT and TTS", sourceHashes, usage, rows }, null, 2));
console.log(JSON.stringify({ usage }));
console.log(`Saved ${file}. Review every semantic rubric manually; automatic checks are not religious approval or child-usability evidence.`);
