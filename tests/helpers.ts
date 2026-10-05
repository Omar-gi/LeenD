import { generateAnswer as answer } from "../src/lib/answer";
import { sources } from "../src/lib/corpus";
import { structured, type Generate } from "../src/lib/providers";
import type { ConversationTurn } from "../src/lib/types";

// Explicit seam for downstream validation tests: no live classifier is used.
// routing.test.ts exercises orchestration and the source allowlist separately.
export function generateAnswer(text: string, history: ConversationTurn[], signal?: AbortSignal, generate: Generate = structured) {
  return answer(text, history, signal, generate, async () => ({
    mode: "friendship", inScopeText: null, categoryIds: ["kindness"], sourceIds: sources.map(s => s.id), safety: "none"
  }));
}
