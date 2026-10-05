import { detectSafety, normalizeArabic } from "./corpus";
import type { Answer, ConversationTurn, Safety } from "./types";

const adult = /كبير|كبار|بالغ|والدي|والدتي|والدك|والدتك|امي|ابوي|معلم|استاذ|مرشد/;
const unavailable = /مشغول|ما ?يرد|ما ?ترد|ما ?رد|ما ?يسمع|ما ?تسمع|ما ?سمع|محد يسمع|ما فيه احد|ما في احد/;
export function supportBlocked(text: string, history: ConversationTurn[]): boolean {
  const current = normalizeArabic(text);
  const last = history.at(-1);
  return unavailable.test(current) && (adult.test(current) || adult.test(normalizeArabic(last?.assistant || "")) ||
    Boolean(last && supportBlocked(last.user, history.slice(0, -1))));
}

// A narrow reply to the failed step itself. Extra topics/disclosures go through
// semantic classification; these authored options never provide a new quotation.
export function unavailableSupport(text: string, history: ConversationTurn[], confirmedSafety?: Exclude<Safety, "none">): Answer | null {
  if (confirmedSafety === "uncertain") return null;
  if (!supportBlocked(text, history)) return null;
  const current = normalizeArabic(text).replace(/[،.!؟?]/g, " ").replace(/\s+/g," ").trim();
  if (!confirmedSafety && (text.length > 180 || /حديث|اي[ةه]|كود|برنامج|قران|اضرب|انتقم|اقتل|يلمس|صور/.test(current))) return null;
  const remainder = current.replace(/(?:طيب|بس|كلهم|هم|احد|الحين|الان|برضو|حتي|جربت|قلت|له|لها|لهم|كلمت|كلمتهم|انا|انهم|اني|ايش اسوي|وش اسوي|سويت|ما نفع|ما عندي غيرهم|امي|ابوي|المعلم|المعلمه|الاستاذ|الاستاذه|الكبار|كبير|بالغ|والدي|والدتي|مشغول(?:ين|ه|ة)?|ما ?يرد(?:ون|وا|و)?(?:ن)?(?: عليا| علي)?|ما ?ترد(?: عليا| علي)?|ما ?يسمع(?:ون|وا|و)?(?:ني)?|ما ?تسمع(?:ني)?|ما ?رد(?:وا|و)?(?: عليا| علي)?|ما ?سمع(?:وا|و)?(?:ني)?|محد يسمعني|ما فيه احد|ما في احد|و)/g, "").replace(/\s/g, "");
  if (remainder && !confirmedSafety) return null;
  let safety: Safety = confirmedSafety || detectSafety(text);
  if (safety === "none") {
    // Only user-reported danger establishes this state, not a model's advice.
    for (const turn of [...history].reverse()) {
      if (/صرت (?:بمكان )?امن|صار الوضع امن|الخطر انتهي|انا بخير الحين/.test(normalizeArabic(turn.user))) break;
      const detected = detectSafety(turn.user);
      if (detected === "immediate" || detected === "threat") { safety = detected; break; }
    }
  }
  const repeated = history.some((turn, index) => supportBlocked(turn.user, history.slice(0, index)));
  const conflictKnown = /خلاف|اختلف|خصام|زعل|صرخ|جدال|تشاجر|تهاوش/.test(normalizeArabic([...history.map(t => t.user),text].join(" ")));
  const answer = safety === "immediate" || safety === "threat"
    ? repeated
      ? "إذا ما لقيت أحد يسمعك والخطر مستمر، خلك في مكان آمن فيه ناس واطلب مساعدة موظف مسؤول. وإذا الخطر مباشر، اطلب الاتصال بالطوارئ المحلية. لا تروح تواجه الشخص وحدك. أنا أقدر أوضح لك الخطوة، لكن ما أقدر أتصل أو أوصل لك مساعدة بنفسي."
      : "أفهم إنهم ما ردّوا، لكن لا تنتظر رد الجوال إذا أنت بخطر. إذا تقدر، روح لمكان آمن فيه شخص مسؤول، مثل مكتب المدرسة أو معلّم آخر، وقل: أنا مو آمن وأحتاج مساعدة الآن. إذا الخطر مباشر، اطلب من شخص قريب الاتصال بالطوارئ المحلية. أنا ما أقدر أتصل عنك."
    : !conflictKnown
      ? repeated
        ? "مو لازم تكرر نفس الكلام الآن. تقدر تجهز جملة قصيرة توضّح فيها الشيء اللي تحتاجه، وتكتفي بهالخطوة إلى وقت يقدرون يسمعونك فيه. وإذا كنت بخطر، لا تنتظر؛ اطلب مساعدة شخص آمن قريب منك."
        : "يضايق لما تحتاج أحد وما يرد. تقدر تجهز جملة قصيرة: عندي شيء مهم، وأحتاج وقت تسمعني فيه. مو لازم تشرح كل شيء مرة واحدة. وإذا كنت بخطر، اطلب مساعدة شخص آمن قريب منك."
    : repeated
      ? "مو لازم تكرر نفس المحاولة الآن أو تحل الخلاف كله اليوم. تقدر توقف الجدال وتأخذ مساحة، وتجهز جملة لوقت تكونون فيه أهدأ: زعلت من اللي صار، وأبي نتكلم بدون تجريح. تقدر تكتفي بهالخطوة الآن."
      : "يضايق لما تحتاج أحد وما يرد. مو لازم تحل الخلاف الحين؛ تقدر توقف الجدال وتأخذ مساحة قصيرة. ولوقت تكونون فيه أهدأ، جهّز جملة مثل: زعلت من اللي صار، وأبي نتكلم بدون تجريح.";
  return { decision: safety === "none" ? "FULL" : "REFER", safety, answer,
    segments: [{kind:"explanation",text:answer,sourceIds:[],quoteId:null}], sources:[],grounded:true,limited:false };
}
