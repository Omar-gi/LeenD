import sourceData from "../content/sources.json";
import safetyPolicy from "../content/safety.json";
import type { Answer, Candidate, Safety, SourceCard, Segment } from "./types";
import type { QuotationContext } from "./dialogue";

export const sources = sourceData as SourceCard[];
export const policy = safetyPolicy;
export const reviewStatus = sources.every(s => s.reviewStatus === "approved") && (policy.reviewStatus as string) === "approved" ? "approved" : "draft";

export function normalizeArabic(text: string): string {
  return text.normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/\s+/g, " ").trim();
}

// Conservative fast path only. Semantic detection also runs in the model.
// Negated/quoted danger is clarified instead of treated as an established threat.
export function detectSafety(text: string): Safety {
  const t = normalizeArabic(text);
  const privatePhotos = /(?:صور|صوره|فيديو).{0,20}(?:جسمي|خاص)/.test(t) && /طلب|يبي|يبغي|ارسل|لا تعلم|سر/.test(t);
  const unwantedTouch = /(?:يلمس|لمس|يلمسني|لمسني).{0,35}(?:جسمي|خاص|تضايق|يضايق|غصب)/.test(t);
  const selfHarm = /(?:ابي|ابغي|افكر|ناوي|راح).{0,18}(?:ا[وؤ]ذي نفسي|اقتل نفسي|انتحر)/.test(t);
  const danger = privatePhotos || unwantedTouch || selfHarm || /بيضربني|بيقتلني|هددني|يهددني|يضربني|بياذيني|ياذيني|تحرش|kill me|hurt me|threaten|hit me/i.test(t);
  if (!danger) return "none";
  if (/ما (?:طلب|لمس|يلمس|ابي)|مو (?:ناوي|افكر)|لم (?:يلمس|يطلب)|قصة خيالي[ةه]|ما صار/.test(t)) return "uncertain";
  if (/ما (?:هو |راح |احد )?(?:هددني|يهددني|يضربني|بيضربني|ياذيني)|مو (?:يهددني|بيضربني)|لم يهددني|never threatened|not threatening/i.test(t)) return "uncertain";
  if (/الحين|الان|قدامي|جنبي|right now|here now/i.test(t)) return "immediate";
  return "threat";
}

export function fixedSafety(safety: Exclude<Safety, "none">): Answer {
  const answer = policy[safety];
  return { decision: safety === "uncertain" ? "CLARIFY" : "REFER", safety, answer,
    segments: [{ kind: "explanation", text: answer, sourceIds: [], quoteId: null }],
    sources: [], grounded: true, limited: false };
}

export function limitation(): Answer {
  return { decision: "REFER", safety: "none", answer: policy.limitation,
    segments: [{ kind: "explanation", text: policy.limitation, sourceIds: [], quoteId: null }],
    sources: [], grounded: false, limited: true };
}

export function scopeBoundary(text: string, hasHistory: boolean): Answer | null {
  const t = normalizeArabic(text);
  // Individual faith judgments are outside every card, including reassuring verdicts.
  if (/كافر|تكفير|ايمانه|ايمان (?:صديقي|خويي)/.test(t)) return limitation();
  // None of the cards supplies a specific supplication or reward claim,
  // even when the request mentions a friend or an ordinary practical problem.
  if (/(?:دعاء|ادعيه).{0,20}(?:مخصوص|خاص|محدد)|(?:كم|عدد) (?:هو )?(?:الاجر|اجره|ثواب|الحسنات)/.test(t)) return limitation();
  // A speech-related hadith is not evidence for teaching unrelated acts of worship.
  // Keep friendship questions that merely mention these settings on the normal path.
  if (/قنوت|زكاة|صلاة|وضوء|صيام|مناسك/.test(t) && !/صديق|صداق|خوي|اصحاب|يسخر|يستهز|استهزا|سخري|يضحك|يؤذي|يوذي|ظلم/.test(t)) return limitation();
  const bare = t.replace(/[.،!؟?]/g, "").trim();
  if (!hasHistory && (/^(?:(?:هو|هي) )?(?:سواها|سوتها|كررها)(?: مر[ةه] ثاني[ةه])?$/.test(bare) || /^(?:هل )?(?:كذا|هذا|هالشي)(?: صح| صحيح)?$/.test(bare))) {
    return { decision: "CLARIFY", safety: "none", answer: policy.clarify,
      segments: [{ kind: "explanation", text: policy.clarify, sourceIds: [], quoteId: null }], sources: [], grounded: true, limited: false };
  }
  return null;
}

export function needsNextStep(text: string): boolean {
  const t = normalizeArabic(text);
  return /(?:قلت|طلبت|جربت|كلمت).{0,45}(?:يوقف|يتوقف|توقف)/.test(t) && /(?:ما وقف|ما توقف|ما نفع|ماوقف|ماتوقف)/.test(t);
}

export function nextStepFallback(context?: QuotationContext): Answer {
  return { ...materialize({ decision: "FULL", safety: "none", segments: [
    { kind: "explanation", text: policy.triedStop, sourceIds: [], quoteId: null }
  ] }, context), grounded: true };
}

export function materialize(candidate: Candidate, context: QuotationContext = { quotedSourceIds: [], repeatQuote: false }): Answer {
  if (candidate.safety !== "none") return fixedSafety(candidate.safety);
  if (!candidate.segments.length || candidate.segments.length > 5) throw new Error("invalid_segments");
  if (candidate.segments.filter(s => s.kind === "quote").length > 1) throw new Error("too_many_quotes");
  if (["CLARIFY", "REFER"].includes(candidate.decision) && candidate.segments.some(s => s.kind !== "explanation")) throw new Error("quote_not_allowed");
  const used = new Set<string>();
  const segments = candidate.segments.map((segment): Segment => {
    if (segment.sourceIds.some(id => !sources.some(s => s.id === id))) throw new Error("unknown_source");
    segment.sourceIds.forEach(id => used.add(id));
    if (segment.kind === "meaning") {
      if (!segment.sourceIds.length) throw new Error("missing_evidence");
      return { kind: "explanation", text: [...new Set(segment.sourceIds.map(id => sources.find(s => s.id === id)!.childExplanation))].join(" "),
        sourceIds: segment.sourceIds, quoteId: null };
    }
    if (segment.kind === "quote") {
      const source = sources.find(s => s.id === segment.quoteId);
      if (!source || !segment.sourceIds.includes(source.id)) throw new Error("invalid_quote");
      // Quoted words can ONLY originate in the server's source file.
      return { ...segment, text: source.sourceQuote };
    }
    const text = segment.text.replace(/[{}]/g, "").trim();
    if (segment.quoteId !== null || !text || text.length > 650) throw new Error("invalid_explanation");
    // Attribution and quotation belong exclusively in stored quote segments.
    if (/قال (?:الله|النبي|رسول)|قال تعالى|[«»]|https?:\/\//.test(text)) throw new Error("freeform_attribution");
    const normalized = normalizeArabic(text);
    if (/النبي|الحديث.{0,20}(?:يقول|نصه)|رسول الله/.test(normalized) ||
      sources.some(source => normalized.includes(normalizeArabic(source.sourceQuote)))) throw new Error("freeform_quotation");
    // Ordinary practical dialogue needs no citation. Obvious religious claims do;
    // the independent semantic audit also checks claims this narrow guard misses.
    if (!segment.sourceIds.length && /ديننا (?:ي|ن)|الاسلام (?:ي|ح)|(?:هذا|هذه|ذلك|هو|هي|انه|انها) (?:حرام|حلال)|واجب ديني|سنه نبويه|(?:تربح|لك|تكسب|تحصل).{0,15}(?:اجر|حسن[ةه]|حسنات|ثواب)|(?:الاجر|الثواب|اجرك).{0,20}(?:الله|نيه|نيتك|طيب)|الله (?:يحب|يامر|ينهى|يجزي|يغفر)|(?:ما في|لا يوجد|ليس هناك) دعاء/.test(normalized)) throw new Error("missing_evidence");
    return { ...segment, text };
  }).filter(segment => segment.kind !== "quote" || context.repeatQuote || !context.quotedSourceIds.includes(segment.quoteId!));
  if (!segments.length) throw new Error("empty_answer_after_repeat_removal");
  // A source attachment must never trigger an unsolicited quotation. The model
  // selects a quote explicitly, and the audit checks its fit to the user's need.
  const answer = segments.map(s => s.kind === "quote" ? `${sources.find(source => source.id === s.quoteId)!.quoteIntroduction}\n«${s.text}»` : s.text).join("\n\n");
  if (answer.length > 1500) throw new Error("answer_too_long");
  return { decision: candidate.decision, safety: "none", answer, segments,
    sources: sources.filter(s => used.has(s.id)), grounded: false, limited: false };
}
