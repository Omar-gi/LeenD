import { normalizeArabic, sources } from "./corpus";
import type { Answer, ConversationTurn } from "./types";

export type QuotationContext = { quotedSourceIds: string[]; repeatQuote: boolean };

// Only authenticated assistant history counts; user-provided scripture is not evidence.
// Recompute from the bounded request history, so editing/resetting needs no extra storage.
export function quotationContext(text: string, history: ConversationTurn[]): QuotationContext {
  return {
    quotedSourceIds: sources.filter(source => history.some(turn =>
      normalizeArabic(turn.assistant).includes(normalizeArabic(`«${source.sourceQuote}»`)))).map(source => source.id),
    repeatQuote: /حديث|الدليل|النص|اقتباس|كرر(?:ه|يه)|عيد(?:ه|يه)|اعد(?:ه|يه)/.test(normalizeArabic(text))
  };
}

// Exact whole-message matches only: never swallow a disclosure after "hello" or "thanks".
export function socialReply(text: string): Answer | null {
  const bare = normalizeArabic(text).replace(/[.!،؟?]/g, "").trim();
  let answer: string | undefined;
  if (/^(?:السلام عليكم(?: ورحمة الله(?: وبركاته)?)?|هلا|اهلا|مرحبا)$/.test(bare)) answer = "أهلًا، أنا لين. تقدر تحكي لي عن موقف مع أصحابك، بدون أسماء أو معلومات شخصية.";
  if (/^(?:(?:خلاص|طيب) )?(?:شكرا|شكرًا|مشكور[ةه]?|يعطيك العافي[ةه])(?: (?:و)?مع السلام[ةه])?$/.test(bare)) answer = "العفو، على راحتك.";
  if (/^(?:مع السلام[ةه]|باي|خلاص انتهيت)$/.test(bare)) answer = "مع السلامة.";
  if (!answer) return null;
  return { decision: "FULL", safety: "none", answer,
    segments: [{ kind: "explanation", text: answer, sourceIds: [], quoteId: null }],
    sources: [], grounded: true, limited: false };
}
