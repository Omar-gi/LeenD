import { materialize, normalizeArabic, sources } from "./corpus";
import type { Answer, Candidate, ConversationTurn } from "./types";

export type QuotationContext = { quotedSourceIds: string[]; repeatQuote: boolean };

// Count questions TO the speaker, not a suggested phrase for their friend or a
// server-filled religious excerpt. Semantic necessity is checked separately.
export function assistantQuestionCount(text: string): number {
  const prose = normalizeArabic(text.replace(/«[^»]*»|"[^"]*"|“[^”]*”|‘[^’]*’|'[^'\n]*'/g, "."))
    .replace(/(?:تقول|قول|قل|تقولي|قولي)(?:\s+(?:له|لها|لهم|لصديقك|لصديقتك|لصاحبك))?(?:\s+(?:بهدوء|بلطف|بلطافه|بكل بساطه))?\s*:\s*[^.؟?]*[؟?]/g, "");
  const marked = (prose.match(/[؟?]/g) || []).length;
  const unmarked = prose.split(/[.!؟?]/).filter(part =>
    /^\s*(?:(?:طيب|و)\s+)?(?:هل |وش |ايش |كيف |متي |وين |مين |لماذا |ممكن (?:توضح|تقول|تحكي) لي|تقدر (?:توضح|تحكي) لي)/.test(part)).length;
  return Math.max(marked, unmarked);
}

export function clarificationBudget(text: string, history: ConversationTurn[]): 0 | 1 {
  if (history.some(turn => assistantQuestionCount(turn.assistant) > 0)) return 0;
  if (/(?:ما ادري|مادري|مدري|ما اعرف|ما اتذكر|ماني متاكد|مو متاكد|لا اعلم|لا اعرف|ما فهمت كلامهم|لا تسال|بدون اسئله|don't know|not sure|madri)/i.test(normalizeArabic(text))) return 0;
  // A described insult or an explicit request for an available value already
  // supplies the issue; asking the same event again adds no essential fact.
  if (/يسخر|يستهز|يضحك عل|جرحت|شتمني|اهانني|قال لي انت|حسن الظن|سوء الظن|حديث|النص.{0,25}الكلام الطيب|اسامح|سامحته/.test(normalizeArabic(text))) return 0;
  return 1;
}

export function dialogueViolation(answer: Answer, budget: 0 | 1): boolean {
  if (answer.safety !== "none") return false;
  const questions = assistantQuestionCount(answer.answer);
  return answer.decision === "CLARIFY" ? budget === 0 || questions !== 1 : questions > 0;
}

export function dialogueLimit(): Answer {
  const answer = "ما أقدر أجزم بالتصرف الأنسب من المعلومات الموجودة، وما راح أضغط عليك بأسئلة أكثر. إذا الموقف يضايقك، تقدر تحكي لشخص كبير تثق فيه يساعدك.";
  return { decision: "REFER", safety: "none", answer,
    segments: [{ kind: "explanation", text: answer, sourceIds: [], quoteId: null }],
    sources: [], grounded: false, limited: true };
}

// Complete the FIRST source-backed lesson before its independent audit. This
// never creates evidence for a source-free response. The audit sees the quote
// and can reject the entire lesson as irrelevant; practicalOnly still blocks it.
export function includeLessonQuote(candidate: Candidate, context: QuotationContext): Candidate {
  if (candidate.safety !== "none" || !["FULL", "PARTIAL"].includes(candidate.decision) ||
    candidate.segments.some(segment => segment.kind === "quote") || candidate.segments.length >= 5) return candidate;
  const index = candidate.segments.findIndex(segment => segment.sourceIds.some(id =>
    sources.some(source => source.id === id) && (context.repeatQuote || !context.quotedSourceIds.includes(id))));
  if (index < 0) return candidate;
  const id = candidate.segments[index].sourceIds.find(id => sources.some(source => source.id === id) &&
    (context.repeatQuote || !context.quotedSourceIds.includes(id)))!;
  const segments = [...candidate.segments];
  segments.splice(index + 1, 0, { kind: "quote", text: "", sourceIds: [id], quoteId: id });
  return { ...candidate, segments };
}

// Only authenticated assistant history counts; user-provided scripture is not evidence.
// Recompute from the bounded request history, so editing/resetting needs no extra storage.
export function quotationContext(text: string, history: ConversationTurn[]): QuotationContext {
  return {
    quotedSourceIds: sources.filter(source => history.some(turn =>
      normalizeArabic(turn.assistant).includes(normalizeArabic(`«${source.sourceQuote}»`)))).map(source => source.id),
    repeatQuote: /حديث|الدليل|النص|اقتباس|كرر(?:ه|يه)|عيد(?:ه|يه)|اعد(?:ه|يه)/.test(normalizeArabic(text))
  };
}

// An exact request to repeat already-issued scripture is a display operation,
// not a new explanation. Only signed ASSISTANT excerpts qualify. Whole-message
// matching prevents swallowing a new question or a disclosure after the request.
export function repeatKnownQuotation(text: string, history: ConversationTurn[]): Answer | null {
  const bare = normalizeArabic(text).replace(/[.،!؟?]/g, "").trim();
  if (!/^(?:طيب )?(?:كرر|كرري|اعد|اعيدي|عيد|عيدي) (?:لي )?الحديث(?: (?:اللي قلته|السابق|مر[ةه] ثاني[ةه]))?$/.test(bare)) return null;
  for (const turn of [...history].reverse()) {
    const source = sources.find(s => normalizeArabic(turn.assistant).includes(normalizeArabic(`«${s.sourceQuote}»`)));
    if (source) return { ...materialize({ decision: "FULL", safety: "none", segments: [
      { kind: "quote", text: "", sourceIds: [source.id], quoteId: source.id }
    ] }, { quotedSourceIds: [source.id], repeatQuote: true }), grounded: true };
  }
  return null;
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

// Exclude narrow religious cards from ordinary item/invitation
// requests before asking the semantic auditor to assess finer relevance.
// Explicit religious requests and actual harmful speech still use the audit.
export function practicalRequestWithoutEvidence(text: string): boolean {
  const t = normalizeArabic(text);
  if (/حديث|دليل|النص|اقتباس|دين|اجر|ثواب|دعاء|حلال|حرام|كرر|عيد الحديث|حسن الظن|سوء الظن|العفو|اسامح|يسامح|تسامح/.test(t)) return false;
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
