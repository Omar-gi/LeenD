"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, ChevronDown, CircleHelp, Headphones, HeartHandshake, Keyboard,
  LoaderCircle, Mic, Pencil, Play, Send, ShieldCheck, Square, Volume2, VolumeX, X } from "lucide-react";
import type { ConversationTurn, TurnResponse } from "@/lib/types";
import { CharacterPortrait, LeenCharacter, type Phase } from "./leen-character";

type Message = TurnResponse & { id: string; audioUrl?: string };
type Health = { textReady: boolean; voiceReady: boolean; reviewStatus: "draft" | "approved" };
const errors: Record<string, string> = {
  setup_required: "المحادثة غير مفعّلة حاليًا. يحتاج فريق لين إلى إكمال إعداد الخدمة.",
  billing_disabled: "خدمة المحادثة متوقفة حاليًا. يحتاج فريق لين إلى تفعيل الخدمة قبل بدء الأسئلة.",
  rate_limit: "وصلت التجربة إلى حد الاستخدام المؤقت. جرّب مرة ثانية لاحقًا.",
  provider_busy: "الخدمة مشغولة الآن. انتظر قليلًا ثم جرّب مرة ثانية.",
  api_quota: "رصيد خدمة الإجابة غير متاح حاليًا. يحتاج فريق لين إلى تفعيل الخدمة. احتفظنا بسؤالك.",
  provider_unavailable: "تعذّر الاتصال بخدمة الإجابة. احتفظنا بسؤالك لتقدر تعيد المحاولة.",
  temporarily_unavailable: "ما اكتملت الإجابة هذه المرة. جرّب مرة ثانية بعد قليل.",
  unclear_audio: "ما سمعت السؤال بوضوح. جرّب تسجيله مرة ثانية، أو اكتبه.",
  too_large: "التسجيل كبير. جرّب سؤالًا أقصر، بحد أقصى ٣٠ ثانية.",
  audio_duration: "مدة التسجيل غير مناسبة. جرّب مرة ثانية، بحد أقصى ٣٠ ثانية.",
  invalid_history: "تعذّر استعادة سياق الجلسة. أنهِ الجلسة وابدأ جلسة جديدة.",
  unsupported_audio: "صيغة التسجيل غير مدعومة في هذا المتصفح. تقدر تكتب سؤالك.",
  invalid_origin: "تعذّر الاتصال من هذا الرابط. افتح الرابط الرسمي للتجربة.",
  empty_input: "اكتب سؤالًا أو سجّله بصوتك أولًا.",
  text_too_long: "خلّ سؤالك أقصر قليلًا، بحد أقصى ١٠٠٠ حرف."
};

function Brand({ small = false }: { small?: boolean }) {
  return <div className={`brand ${small ? "small" : ""}`}><span>لين<span className="brand-dot">.</span></span><span className="brand-caption">مساحة لسؤالك</span></div>;
}
function Wave({ active = false }: { active?: boolean }) {
  return <div className={`wave ${active ? "active" : ""}`} aria-hidden="true">{[14, 27, 42, 24, 52, 36, 60, 44, 24, 46, 30, 18, 28].map((h, i) => <i key={i} style={{ height: h, animationDelay: `${i * 0.085}s` }} />)}</div>;
}

export default function Home() {
  const [screen, setScreen] = useState<"intro" | "chat">("intro");
  const [adult, setAdult] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [textOpen, setTextOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<HTMLAudioElement | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const epochRef = useRef(0);
  const busyRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { messagesRef.current = messages; bottomRef.current?.parentElement?.scrollTo({ top: bottomRef.current.parentElement.scrollHeight, behavior: "smooth" }); }, [messages, phase]);
  useEffect(() => {
    fetch("/api/health", { cache: "no-store" }).then(r => r.json()).then(setHealth).catch(() => {});
    return () => {
      epochRef.current++; abortRef.current?.abort();
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      audioRef.current?.pause();
      messagesRef.current.forEach(m => { if (m.audioUrl) URL.revokeObjectURL(m.audioUrl); });
    };
  }, []);
  useEffect(() => { if (textOpen) inputRef.current?.focus(); }, [textOpen, editing]);
  useEffect(() => {
    if (!showPrivacy && !confirmEnd) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setShowPrivacy(false); setConfirmEnd(false); endButtonRef.current?.focus(); }
      if (e.key === "Tab") {
        const dialog = document.querySelector('[role="dialog"]');
        const focusable = dialog?.querySelectorAll<HTMLButtonElement>('button, a[href], input, [tabindex="0"]');
        if (!focusable?.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [showPrivacy, confirmEnd]);

  function stopPlayback() {
    audioRef.current?.pause(); audioRef.current = null;
    setPlayingAudio(null);
    setPlayingId(null); setPhase(p => p === "speaking" ? "idle" : p);
  }
  async function play(url: string, id: string) {
    stopPlayback();
    const audio = new Audio(url); audioRef.current = audio;
    setPlayingId(id);
    audio.onplaying = () => { if (audioRef.current === audio) { setPhase("speaking"); setPlayingAudio(audio); } };
    audio.onended = () => { if (audioRef.current === audio) stopPlayback(); };
    audio.onerror = () => { if (audioRef.current === audio) { stopPlayback(); setNotice("تعذّر تشغيل الصوت. الإجابة المكتوبة موجودة."); } };
    try { await audio.play(); }
    catch { if (audioRef.current === audio) { stopPlayback(); setNotice("اضغط «اسمع الإجابة» لتشغيل الصوت."); } }
  }
  function audioUrl(base64: string) {
    const binary = atob(base64), bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
  }

  async function submit(text?: string, file?: Blob, duration?: number) {
    if (busyRef.current || (!text?.trim() && !file)) return;
    busyRef.current = true; stopPlayback(); setPhase("thinking"); setError(""); setNotice("");
    setPending(text || "سؤالك الصوتي…");
    const epoch = epochRef.current;
    const previous = editing === null ? messagesRef.current : messagesRef.current.slice(0, editing);
    const history: ConversationTurn[] = previous.slice(-12).map(m => ({ user: m.transcript, assistant: m.answer, receipt: m.receipt }));
    const controller = new AbortController(); abortRef.current = controller;
    const deadline = setTimeout(() => controller.abort(), 60000);
    try {
      let body: BodyInit; let headers: HeadersInit | undefined;
      if (file) {
        const form = new FormData();
        const extension = file.type.includes("mp4") ? "mp4" : file.type.includes("ogg") ? "ogg" : "webm";
        form.append("audio", file, `question.${extension}`); form.append("durationSeconds", String(duration));
        form.append("history", JSON.stringify(history)); form.append("adultConfirmed", String(adult));
        form.append("audioEnabled", String(audioEnabled)); body = form;
      } else {
        headers = { "Content-Type": "application/json" };
        body = JSON.stringify({ text, history, adultConfirmed: adult, audioEnabled });
      }
      const response = await fetch("/api/turn", { method: "POST", headers, body, signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "temporarily_unavailable");
      if (epoch !== epochRef.current) return;
      const reply = result as TurnResponse;
      const url = reply.audio ? audioUrl(reply.audio) : undefined;
      const message: Message = { ...reply, audio: null, audioUrl: url, id: crypto.randomUUID() };
      if (editing !== null) messagesRef.current.slice(editing).forEach(m => { if (m.audioUrl) URL.revokeObjectURL(m.audioUrl); });
      const updated = [...previous, message];
      // Limit the visible session too, so a long session never implies unlimited memory.
      if (updated.length > 12) {
        const removed = updated.shift(); if (removed?.audioUrl) URL.revokeObjectURL(removed.audioUrl);
        setNotice("وصلت الجلسة إلى حد السياق. تحتفظ لين بآخر ١٢ سؤالًا فقط.");
      }
      messagesRef.current = updated; setMessages(updated); setDraft(""); setPending(""); setEditing(null); setPhase("idle");
      if (reply.audioStatus === "unavailable") setNotice("الصوت غير متاح حاليًا، لكن تقدر تقرأ الإجابة وتكمل بالكتابة أو التسجيل.");
      if (url && audioEnabled) await play(url, message.id);
    } catch (cause) {
      if (epoch !== epochRef.current) return;
      const code = cause instanceof Error ? cause.message : "temporarily_unavailable";
      setError(errors[code] || "انقطع الاتصال أو انتهى وقت الانتظار. تقدر تعيد المحاولة.");
      if (text) { setDraft(text); setTextOpen(true); }
      else { setTextOpen(true); setNotice("ما حفظنا التسجيل. تقدر تعيد تسجيل السؤال أو تكتبه."); }
      setPhase("idle"); setPending("");
    } finally {
      clearTimeout(deadline);
      if (epoch === epochRef.current) { busyRef.current = false; abortRef.current = null; }
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }
  async function startRecording() {
    if (busyRef.current || phase === "permission") return;
    stopPlayback(); setError(""); setNotice("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("التسجيل غير مدعوم هنا. افتح التجربة في متصفح حديث أو اكتب سؤالك."); setTextOpen(true); return;
    }
    setPhase("permission"); const epoch = epochRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (epoch !== epochRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"].find(m => MediaRecorder.isTypeSupported(m));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 64000 } : undefined);
      const chunks: BlobPart[] = []; const started = Date.now(); let bytes = 0;
      recorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size) { chunks.push(e.data); bytes += e.data.size; if (bytes > 2.8 * 1024 * 1024) stopRecording(); } };
      recorder.onerror = () => {
        stream.getTracks().forEach(t => t.stop()); if (timerRef.current) clearInterval(timerRef.current);
        recorder.onstop = null; setPhase("idle"); setError("تعذّر التسجيل. تقدر تكتب سؤالك."); setTextOpen(true);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop()); streamRef.current = null; recorderRef.current = null;
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (epoch !== epochRef.current) return;
        const elapsed = Math.min(30, (Date.now() - started) / 1000);
        if (elapsed < 0.4 || bytes === 0) { setPhase("idle"); setError("التسجيل قصير جدًا. جرّب مرة ثانية أو اكتب السؤال."); return; }
        const blob = new Blob(chunks, { type: recorder.mimeType });
        void submit(undefined, blob, elapsed);
      };
      recorder.start(250); setSeconds(0); setPhase("recording");
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000); setSeconds(Math.min(30, elapsed));
        if (elapsed >= 30) stopRecording();
      }, 200);
    } catch {
      streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
      if (epoch !== epochRef.current) return;
      setPhase("idle"); setError("ما قدرنا نفتح الميكروفون. اسمح باستخدامه من إعدادات المتصفح، أو اكتب سؤالك."); setTextOpen(true);
    }
  }

  function endSession() {
    epochRef.current++; abortRef.current?.abort(); busyRef.current = false;
    if (recorderRef.current) recorderRef.current.onstop = null;
    stopRecording(); streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    stopPlayback(); messagesRef.current.forEach(m => { if (m.audioUrl) URL.revokeObjectURL(m.audioUrl); });
    messagesRef.current = []; setMessages([]); setDraft(""); setPending(""); setEditing(null); setError(""); setNotice("");
    setPhase("idle"); setConfirmEnd(false); setScreen("intro"); setAdult(false); setTextOpen(false);
  }
  function correct(index: number) {
    stopPlayback(); setEditing(index); setDraft(messages[index].transcript); setTextOpen(true); setError("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }
  const locked = phase === "thinking" || phase === "permission" || phase === "recording";
  const phaseText: Record<Phase, string> = { idle: "على راحتك، الميكروفون مغلق", permission: "بانتظار إذن الميكروفون", recording: "أسمعك… اضغط إذا انتهيت", thinking: "أفهم سؤالك وأراجع الإجابة…", speaking: "لين تتكلم" };

  return <div className={`site-shell ${screen === "chat" ? "chat-screen" : ""}`}>
    <a className="skip-link" href="#main">انتقل إلى المحتوى</a>
    <header className="header"><Brand /><div className="header-end"><span className="demo-label">نسخة التحدي <span>٢٠٢٦</span></span>
      <button className="icon-button" aria-label="عن التجربة والخصوصية" onClick={() => setShowPrivacy(true)}><CircleHelp size={21} /></button></div></header>

    {screen === "intro" ? <main id="main" className="intro">
      <section className="intro-copy">
        <div className="intro-character-mobile"><CharacterPortrait /></div>
        <span className="eyebrow"><span className="tiny-line" /> حوار صغير، وفهم أكبر</span>
        <h1>أهلًا، أنا <span>لين.</span><br />سؤالك له مساحة.</h1>
        <p className="intro-description">نتكلم عن مواقفك مع أصحابك وكيف تتعامل معها.<br className="desktop-break" /> أسمع سؤالك، وأشرح لك بكلمات قريبة ومصادر واضحة.</p>
        <div className="covered-domains" aria-label="المجالات التي تغطيها لين"><span>اختيار الصديق</span><span>الخلاف مع الصديق</span><span>الغيرة والمقارنة</span><span>الاستبعاد والتنمر</span></div>
        <div className="intro-points"><span><Headphones size={20} /> تتكلم بطريقتك</span><span><BookOpen size={20} /> تعرف مصدر الإجابة</span><span><HeartHandshake size={20} /> نعرف متى نطلب المساعدة</span></div>
        <div className="start-card">
          <div className="start-note"><ShieldCheck size={22} /><p><strong>هذه النسخة مخصصة لتجربة لين.</strong><br />استخدم موقفًا خياليًا، ولا تدخل أسماء أو معلومات شخصية.</p></div>
          <label className="consent"><input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} /><span>سأستخدم أمثلة خيالية في هذه التجربة.</span></label>
          <button className="primary start-button" disabled={!adult} onClick={() => { setScreen("chat"); setError(""); }}><Mic size={21} /> نبدأ الحديث</button>
          <span className="start-footnote">ما تحتاج حسابًا · صوت لين مولّد بالذكاء الاصطناعي</span>
        </div>
      </section>
      <aside className="intro-panel" aria-label="كيف تعمل لين">
        <span className="panel-tag">مساحة آمنة للسؤال</span><div className="panel-center"><div className="hero-character"><CharacterPortrait hero /></div><p>نسأل بطريقتنا.<br /><span>ونفهم على مهل.</span></p><Wave /></div>
        <div className="panel-bottom"><span className="panel-number">٠١</span><p>مواقفنا مع الأصحاب<span>اختيار الصديق، الخلاف، المقارنة، والتنمر.</span></p></div>
      </aside>
    </main> : <main id="main" className="chat-layout">
      <aside className="chat-sidebar"><span className="eyebrow">في هذه المساحة</span><h2>صداقاتنا،<br />بفهمٍ أهدأ.</h2><p>اسأل بصوتك أو اكتب.<br />تقدر تعدّل السؤال إذا ما سمعته لين بشكل صحيح.</p>
        <div className="sidebar-rule" /><div className="sidebar-item"><BookOpen size={22} /><div><strong>المصدر قريب منك</strong><p>تلقى المرجع تحت الإجابة، مع فصل النص الأصلي عن الشرح.</p></div></div>
        <div className="sidebar-item"><ShieldCheck size={22} /><div><strong>ولكل إجابة حدود</strong><p>إذا ما تكفي المصادر، توضح لين ذلك أو تقترح الرجوع لشخص مناسب.</p></div></div>
        <div className="sidebar-bottom"><span>جلسة مؤقتة</span><p>ينتهي سياق الحديث عند إنهاء الجلسة أو إغلاق الصفحة.</p></div>
      </aside>
      <section className="conversation" aria-label="المحادثة مع لين">
        <div className="conversation-header"><div className="conversation-title"><span className="leen-badge">ل</span><div><h1>نتكلم مع لين</h1><span>عن مواقفنا مع الأصحاب</span></div></div>
          <div className="conversation-actions"><button className="icon-button" title={audioEnabled ? "إيقاف الردود الصوتية" : "تشغيل الردود الصوتية"} aria-label={audioEnabled ? "إيقاف الردود الصوتية" : "تشغيل الردود الصوتية"} aria-pressed={audioEnabled} onClick={() => { setAudioEnabled(!audioEnabled); if (audioEnabled) stopPlayback(); }}>{audioEnabled ? <Volume2 size={21} /> : <VolumeX size={21} />}</button>
          <button ref={endButtonRef} className="text-button end-button" onClick={() => setConfirmEnd(true)}>إنهاء الجلسة</button></div></div>
        <div className="review-banner"><ShieldCheck size={15} /><span>استخدم مواقف خيالية، دون أسماء أو معلومات شخصية.</span></div>
        <LeenCharacter phase={phase} audio={playingAudio} onActivate={() => phase === "recording" ? stopRecording() : phase === "speaking" ? stopPlayback() : void startRecording()} />
        <div className="messages" role="log" aria-label="سجل المحادثة" aria-live="polite" aria-relevant="additions text">
          {!messages.length && !pending && <div className="empty-state"><p>سؤالك له مساحة.</p></div>}
          {messages.map((message, index) => <article className="exchange" key={message.id}>
            <div className="user-message"><div className="message-label">أنت <button disabled={locked} className="edit-button" aria-label={`تعديل السؤال ${index + 1}`} onClick={() => correct(index)}><Pencil size={13} /> تعديل</button></div><p dir="auto">{message.transcript}</p></div>
            <div className={`assistant-message ${message.safety !== "none" ? "safety-message" : ""}`}><div className="message-label"><span className="mini-leen">ل</span> لين {message.safety !== "none" && <span className="safety-tag">سلامتك أولًا</span>}</div>
              <div className="answer-text">{message.segments.map((segment, i) => segment.kind === "quote" ? <blockquote key={i}><span>{message.sources.find(source => source.id === segment.quoteId)?.quoteIntroduction || "من المرجع:"}</span>«{segment.text}»</blockquote> : <p key={i}>{segment.text}</p>)}</div>
              <div className="answer-actions">{message.audioUrl && <button disabled={locked} className="quiet-button" onClick={() => playingId === message.id ? stopPlayback() : void play(message.audioUrl!, message.id)}>{playingId === message.id ? <Square size={14} /> : <Play size={14} />} {playingId === message.id ? "إيقاف الصوت" : "اسمع الإجابة"}</button>}
                {message.safety !== "none" && <span className="policy-label">إرشاد للسلامة، وليس فتوى</span>}</div>
              {!!message.sources.length && <details className="source-details"><summary><BookOpen size={15} /> مرجع الإجابة <span>{message.sources.length.toLocaleString("ar-SA")}</span><ChevronDown size={14} /></summary>
                <div className="source-list">{message.sources.map(source => <div key={source.id} className="source-card"><strong>{source.sourceReference}</strong><p>«{source.sourceQuote}»</p><div className="reference-links">{(source.referenceLinks || [source.sourceUrl]).map((url, linkIndex) => <a key={url} href={url} target="_blank" rel="noopener noreferrer">فتح المرجع{(source.referenceLinks?.length || 1) > 1 ? ` ${linkIndex + 1}` : ""}</a>)}</div><span>{source.kind === "quran" ? "آية قرآنية" : "حديث"} · </span><span>{source.isExcerpt ? "مقتطف من النص الأصلي" : "النص الأصلي"}</span></div>)}<p className="source-disclaimer">تستند الإجابة إلى المراجع الموضحة هنا.</p></div>
              </details>}
            </div>
          </article>)}
          {pending && <div className="pending-message"><p>{pending}</p><span><LoaderCircle size={16} className="spin" /> أراجع الإجابة…</span></div>}
          <div ref={bottomRef} />
        </div>
        <div className="composer">
          {error && <div className="error-message" role="alert"><CircleHelp size={17} /><span>{error}</span><button aria-label="إغلاق التنبيه" onClick={() => setError("")}><X size={16} /></button></div>}
          {notice && <p className="notice" role="status">{notice}</p>}
          {health && !health.textReady && !error && <p className="setup-notice">المحادثة غير مفعّلة بعد. يحتاج فريق لين إلى إكمال إعداد الخدمة.</p>}
          {editing !== null && <div className="editing-note"><span>تعديل السؤال {editing + 1} — ستُستبدل إجابته وما بعدها.</span><button onClick={() => { setEditing(null); setDraft(""); }}>إلغاء</button></div>}
          {textOpen && <form className="text-composer" onSubmit={e => { e.preventDefault(); void submit(draft); }}>
            <textarea ref={inputRef} aria-label="اكتب سؤالك" placeholder="اكتب سؤالك هنا…" value={draft} maxLength={1000} rows={2} disabled={locked} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(draft); } }} />
            <button type="submit" disabled={locked || !draft.trim()} aria-label="إرسال السؤال"><Send size={20} /></button></form>}
          <div className="voice-controls"><button className="keyboard-button" disabled={locked} aria-expanded={textOpen} aria-label={textOpen ? "إخفاء الكتابة" : "كتابة السؤال"} onClick={() => setTextOpen(!textOpen)}><Keyboard size={22} /><span>اكتب</span></button>
            <button className={`record-button ${phase === "recording" ? "recording" : ""}`} disabled={phase === "thinking" || phase === "permission"} onClick={() => phase === "recording" ? stopRecording() : void startRecording()}>
              {phase === "thinking" || phase === "permission" ? <LoaderCircle className="spin" size={23} /> : phase === "recording" ? <Square size={21} fill="currentColor" /> : <Mic size={23} />}
              <span>{phase === "recording" ? "انتهيت من الكلام" : phase === "thinking" ? "أراجع الإجابة…" : phase === "permission" ? "أفتح الميكروفون…" : "اضغط وتكلّم"}</span>
              {phase === "recording" && <span className="record-time" dir="ltr">{seconds.toString().padStart(2, "0")} / 30</span>}</button>
            {phase === "speaking" ? <button className="keyboard-button" aria-label="إيقاف الصوت" onClick={stopPlayback}><Square size={21} /><span>إيقاف</span></button> : <div className="control-spacer" />}</div>
          <p className="phase-caption" role="status">{phase === "recording" && <span className="recording-dot" />}{phaseText[phase]}</p>
        </div>
      </section>
    </main>}
    <footer className="footer"><span>لين · تحدي الذكاء الاصطناعي في خدمة المحتوى الإسلامي</span><button onClick={() => setShowPrivacy(true)}>عن التجربة والخصوصية</button></footer>
    {(showPrivacy || confirmEnd) && <div className="modal-overlay" onClick={() => { setShowPrivacy(false); setConfirmEnd(false); }}><section role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="modal" onClick={e => e.stopPropagation()}>
      <button className="icon-button modal-close" autoFocus aria-label="إغلاق" onClick={() => { setShowPrivacy(false); setConfirmEnd(false); endButtonRef.current?.focus(); }}><X size={22} /></button>
      {confirmEnd ? <><ShieldCheck size={30} className="modal-icon" /><h2 id="dialog-title">ننهي الجلسة؟</h2><p>سيُحذف سياق الحديث والتسجيلات المؤقتة من هذه الصفحة. تبدأ الجلسة القادمة من جديد.</p><div className="modal-actions"><button className="primary" onClick={endSession}>نعم، إنهاء الجلسة</button><button className="secondary" onClick={() => setConfirmEnd(false)}>أكمل الحديث</button></div></> : <><BookOpen size={30} className="modal-icon" /><h2 id="dialog-title">عن هذه التجربة</h2><p>لين مساعد معرفي بالذكاء الاصطناعي، وليست إنسانًا أو مختصًا. هذه النسخة للبالغين والمقيّمين بأمثلة خيالية، وليست جاهزة لاستخدام الأطفال الفعلي.</p><h3>المحتوى وحدوده</h3><p>تغطي هذه النسخة اختيار الصديق، والخلاف مع الصديق، والغيرة والمقارنة، والاستبعاد والتنمر. تستخدم الآيات والأحاديث الواردة في مرجع الفريق فقط. الشرح وإرشادات السلامة قيد المراجعة البشرية. لا تصدر لين فتوى شخصية ولا تتصل بأحد نيابة عنك.</p><h3>ماذا يحدث للصوت والكلام؟</h3><p>يُرسل السؤال إلى OpenAI لفهمه وتكوين الإجابة، ويُرسل نص الإجابة إلى ElevenLabs لتوليد الصوت. لا يحفظ تطبيق لين التسجيلات أو المحادثات في قاعدة بيانات أو سجلات محتوى. يحتفظ المتصفح بسياق الجلسة مؤقتًا، بحد أقصى ١٢ سؤالًا.</p><p>تنطبق سياسات معالجة واحتفاظ مزوّدي الخدمات بشكل مستقل؛ حذف الجلسة هنا لا يعني حذف بيانات المزوّدين. لا تستخدم أسماء أو مدارس أو معلومات شخصية حقيقية.</p><button className="primary" onClick={() => setShowPrivacy(false)}><Check size={18} /> فهمت</button></>}
    </section></div>}
  </div>;
}
