"use client";
import { useEffect, useState } from "react";
import { parentLogKey, readParentLog, type ParentRecord } from "@/lib/parent-preview";
export default function ParentPage() {
  const [ready, setReady] = useState(false), [enabled, setEnabled] = useState(false), [signedIn, setSignedIn] = useState(false);
  const [records, setRecords] = useState<ParentRecord[]>([]), [error, setError] = useState("");
  const [username, setUsername] = useState(""), [password, setPassword] = useState("");
  const [onlyReferrals, setOnlyReferrals] = useState(false);
  useEffect(() => { void fetch("/api/parent").then(r => r.json()).then(data => {
    setEnabled(Boolean(data.enabled)); setSignedIn(Boolean(data.authenticated)); setReady(true);
  }).catch(() => { setReady(true); }); }, []);
  useEffect(() => {
    if (!signedIn) { setRecords([]); return; }
    const update = () => setRecords(readParentLog()); update();
    window.addEventListener("storage", update); window.addEventListener("focus", update);
    return () => { window.removeEventListener("storage", update); window.removeEventListener("focus", update); };
  }, [signedIn]);
  async function login(e: React.FormEvent) {
    e.preventDefault(); setError("");
    try { const r = await fetch("/api/parent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      if (!r.ok) { setError("اسم المستخدم أو كلمة المرور غير صحيحة."); return; }
      setPassword(""); setSignedIn(true);
    } catch { setError("تعذّر الاتصال. حاول مرة أخرى."); }
  }
  return <main className="parent-page"><a href="/">← العودة إلى لين</a><h1>مساحة ولي الأمر</h1>
    <p className="parent-notice">تابع الحديث مع لين، وانتبه للمواقف التي تحتاج مساعدتك. السجل خاص بهذا المتصفح ويحتفظ بآخر ١٠٠ رد. استخدم أمثلة خيالية، ولا تدخل بيانات شخصية.</p>
    {!ready ? <p>لحظة…</p> : !enabled ? <p>مساحة ولي الأمر غير متاحة حاليًا.</p> : !signedIn ?
    <form className="start-card parent-login" onSubmit={login}><label>اسم المستخدم<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required /></label>
      <label>كلمة المرور<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
      {error && <p role="alert">{error}</p>}<button className="primary">دخول</button></form> : <>
      <div className="parent-toolbar"><label><input type="checkbox" checked={onlyReferrals} onChange={e => setOnlyReferrals(e.target.checked)} /> الإحالات فقط ({records.filter(r => r.referral).length})</label>
        <button className="secondary" onClick={() => setRecords(readParentLog())}>تحديث</button>
        <button className="secondary" onClick={() => { if (window.confirm("حذف سجل المحادثات كاملًا؟")) { localStorage.removeItem(parentLogKey); setRecords([]); } }}>حذف السجل</button>
        <button className="secondary" onClick={async () => { await fetch("/api/parent", { method: "DELETE" }); setSignedIn(false); }}>خروج</button></div>
      {!records.length && <p>لا توجد محادثات محفوظة بعد. جرّب موقفًا خياليًا مع لين على هذا المتصفح.</p>}
      {records.filter(r => !onlyReferrals || r.referral).slice().reverse().map(r => <article key={r.id} className={`parent-record ${r.referral ? "parent-referral" : ""}`}>
        <div className="parent-record-label"><time>{new Date(r.time).toLocaleString("ar-SA")}</time><span>جلسة {r.session.slice(0, 8)}</span>{r.referral && <strong>طلب مساعدة ولي أمر أو بالغ موثوق</strong>}</div>
        <h2>السؤال</h2><p>{r.user}</p><h2>رد لين</h2><p>{r.answer}</p></article>)}
    </>}
  </main>;
}
