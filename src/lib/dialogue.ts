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

// A narrow, reproducible guard for an observed transcription/conversation failure.
// Only the SAME named item in the immediately preceding user turn can conflict;
// explicit corrections and topic changes are left to the semantic audit.
export function clarifyReturnRoles(text: string, history: ConversationTurn[]): Answer | null {
  const current = normalizeArabic(text);
  const previous = normalizeArabic(history.at(-1)?.user || "");
  if (/موضوع ثاني|غير الموضوع|اقصد|قصدي|تصحيح|غلطت|مو انا|كنت اقصد/.test(current)) return null;
  const itemPattern = /(?:^|\s)(?:ال)?(دفتر|كتاب|قلم)(?:ه|ها|ي|ك)?(?=$|\s|[،.؟?])/g;
  const items = [...current.matchAll(itemPattern)].map(match => match[1]);
  const previousItems = [...previous.matchAll(itemPattern)].map(match => match[1]);
  if (!items.some(item => previousItems.includes(item))) return null;
  const wasReturning = /(?:ارجع|ارد|اعيد).{0,35}(?:له|لها|لصاحب|لصديق)/.test(previous);
  const nowReceiving = /(?:ترجعين|ترجع|يرجع|تردين|ترد|يرد)(?:ه|ها)? لي/.test(current);
  if (!wasReturning || !nowReceiving) return null;
  const answer = "تقصد الغرض عندك وبتعيده، أو تبيه يرجع لك؟";
  return { decision: "CLARIFY", safety: "none", answer,
    segments: [{ kind: "explanation", text: answer, sourceIds: [], quoteId: null }], sources: [], grounded: true, limited: false };
}

// With just three narrow cards, exclude them from ordinary item/invitation
// requests before asking the semantic auditor to assess finer relevance.
// Explicit religious requests and actual harmful speech still use the audit.
export function practicalRequestWithoutEvidence(text: string): boolean {
  const t = normalizeArabic(text);
  if (/حديث|دليل|النص|اقتباس|دين|اجر|ثواب|دعاء|حلال|حرام|كرر|عيد الحديث/.test(t)) return false;
  if (/يسخر|يستهز|استهزا|يقلدني|تنمر|يهين|اهان|شتمني|اسب|اشتم|انتقم|ننتقم|يضحك عل|يوذي|يؤذي|ظلم|تهديد/.test(t)) return false;
  const item = /بسكوت|بسكويت|قلم|كتاب|دفتر|لعب[ةه]|هدي[ةه]|غرض/.test(t);
  return item && /اطلب|طلب|استعير|استلف|اعطي|اهدي|اجيب|تجيب|يرجع|ترجع|ارجع|نسيت|اعتذر|ودي|ابي/.test(t) ||
    /(?:اعزم|ادعو|ادعي|نلعب|تلعب).{0,30}(?:صديق|صاحب|فسح)|(?:صديق|صاحب).{0,30}(?:نلعب|يلعب|تلعب|الفسح)/.test(t);
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
