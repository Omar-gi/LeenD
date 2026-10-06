import type { TurnResponse } from "./types";
export const parentLogKey = "leen-parent-preview-v1";
export type ParentRecord = { id: string; session: string; time: string; user: string; answer: string; referral: boolean; safety: string; decision: string };
export function isLocalPreview() {
  return typeof window !== "undefined" && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
}
export function readParentLog(): ParentRecord[] {
  if (!isLocalPreview()) return [];
  try { const records = JSON.parse(localStorage.getItem(parentLogKey) || "[]");
    return Array.isArray(records) ? records.filter(r => r && typeof r.user === "string" && typeof r.answer === "string").slice(-100) : [];
  } catch { return []; }
}
export function saveParentTurn(reply: TurnResponse) {
  if (!isLocalPreview()) return;
  const practical = reply.segments.filter(s => s.kind === "explanation" && !s.sourceIds.length).map(s => s.text).join(" ");
  const referral = reply.safety !== "none" || /(?:ماما|بابا|والديك|والدك|والدتك|ولي أمرك|شخص (?:كبير|بالغ)|المعلمة|المعلم)/.test(practical) && /(?:اسأل|تسأل|اطلب|أطلب|اطلبي|استع|تستعين|كلم|قول|أخبر|تخبر|مساعدة)/.test(practical);
  try {
    let session = sessionStorage.getItem("leen-parent-session");
    if (!session) { session = crypto.randomUUID(); sessionStorage.setItem("leen-parent-session", session); }
    localStorage.setItem(parentLogKey, JSON.stringify([...readParentLog(), { id: crypto.randomUUID(), session,
      time: new Date().toISOString(), user: reply.transcript, answer: reply.answer, referral, safety: reply.safety, decision: reply.decision }].slice(-100)));
  } catch { /* Browser storage can be disabled; never interrupt the conversation. */ }
}
