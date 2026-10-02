import sourceData from "../content/sources.json";
import safetyPolicy from "../content/safety.json";
import type { Answer, Candidate, Safety, SourceCard } from "./types";

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
  const danger = /بيضربني|بيقتلني|هددني|يهددني|يضربني|بياذيني|ياذيني|تحرش|kill me|hurt me|threaten|hit me/i.test(t);
  if (!danger) return "none";
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

export function nextStepFallback(): Answer {
  const ids = ["friendship_non_harm", "friendship_good_speech"];
  return { ...materialize({ decision: "FULL", safety: "none", segments: [
    { kind: "explanation", text: policy.triedStop, sourceIds: ids, quoteId: null },
    { kind: "quote", text: "", sourceIds: ["friendship_good_speech"], quoteId: "friendship_good_speech" }
  ] }), grounded: true };
}

export function materialize(candidate: Candidate): Answer {
  if (candidate.safety !== "none") return fixedSafety(candidate.safety);
  if (!candidate.segments.length || candidate.segments.length > 5) throw new Error("invalid_segments");
  if (candidate.segments.filter(s => s.kind === "quote").length > 1) throw new Error("too_many_quotes");
  const used = new Set<string>();
  const segments = candidate.segments.map(segment => {
    if (segment.sourceIds.some(id => !sources.some(s => s.id === id))) throw new Error("unknown_source");
    segment.sourceIds.forEach(id => used.add(id));
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
    return { ...segment, text };
  });
  if ((candidate.decision === "FULL" || candidate.decision === "PARTIAL") && used.size === 0) throw new Error("missing_evidence");
  // A supported answer includes its hadith in the dialogue, even if the model omits it.
  // Choose from evidence already attached to the explanation, before the grounding audit.
  if ((candidate.decision === "FULL" || candidate.decision === "PARTIAL") && !segments.some(s => s.kind === "quote")) {
    const explanationIndex = segments.findIndex(s => s.sourceIds.length > 0);
    const source = sources.find(s => s.id === segments[explanationIndex].sourceIds[0])!;
    segments.splice(explanationIndex + 1, 0, { kind: "quote", text: source.sourceQuote, sourceIds: [source.id], quoteId: source.id });
  }
  const answer = segments.map(s => s.kind === "quote" ? `${sources.find(source => source.id === s.quoteId)!.quoteIntroduction}\n«${s.text}»` : s.text).join("\n\n");
  if (answer.length > 1500) throw new Error("answer_too_long");
  return { decision: candidate.decision, safety: "none", answer, segments,
    sources: sources.filter(s => used.has(s.id)), grounded: false, limited: false };
}
