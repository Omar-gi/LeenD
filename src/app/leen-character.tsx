"use client";

import Image from "next/image";
import { Ear, Mic, Sparkles, Square, Volume2 } from "lucide-react";
import { useEffect, useRef } from "react";

export type Phase = "idle" | "permission" | "recording" | "thinking" | "speaking";

export function CharacterPortrait({ hero = false }: { hero?: boolean }) {
  return <Image src="/leen-character.png" alt="شخصية لين الزرقاء المبتسمة" width={1024} height={1024}
    sizes={hero ? "(max-width: 600px) 88px, 280px" : "96px"} className="character-portrait" preload={hero} />;
}

export function LeenCharacter({ phase, audio, onActivate }: {
  phase: Phase; audio: HTMLAudioElement | null; onActivate: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Playback is always independent of the visualizer. Browsers without Web Audio
  // retain normal sound and the CSS speaking state; no microphone is opened here.
  useEffect(() => {
    if (!audio) return;
    let context: AudioContext | undefined;
    let frame = 0;
    let disposed = false;
    const button = buttonRef.current;
    try {
      if (!window.AudioContext) return;
      context = new AudioContext();
      const activeContext = context;
      void activeContext.resume().then(() => {
        if (disposed || activeContext.state !== "running") return;
        const source = activeContext.createMediaElementSource(audio);
        source.connect(activeContext.destination);
        const analyser = activeContext.createAnalyser();
        analyser.fftSize = 256; source.connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);
        let smoothed = 0;
        let mouthChangedAt = 0;
        let mouthOpen = false;
        button?.setAttribute("data-audio-meter", "ready");
        const measure = () => {
          analyser.getByteTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) / samples.length);
          const target = audio.paused ? 0 : Math.min(1, rms * 6);
          smoothed += (target - smoothed) * .35;
          button?.style.setProperty("--voice-level", smoothed.toFixed(3));
          // An amplitude-driven mouth, with a short hold to avoid frame flicker.
          const nextOpen = !audio.paused && smoothed > (mouthOpen ? .08 : .16);
          const now = performance.now();
          if (nextOpen !== mouthOpen && now - mouthChangedAt >= 95) {
            mouthOpen = nextOpen; mouthChangedAt = now;
            button?.setAttribute("data-mouth", mouthOpen ? "open" : "closed");
          }
          frame = requestAnimationFrame(measure);
        };
        measure();
      }).catch(() => {});
    } catch { /* The decorative animation must not interrupt an answer. */ }
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      button?.style.removeProperty("--voice-level");
      button?.removeAttribute("data-mouth");
      button?.removeAttribute("data-audio-meter");
      void context?.close().catch(() => {});
    };
  }, [audio]);

  const label = phase === "recording" ? "لين: إنهاء التسجيل وإرسال السؤال" : phase === "speaking" ? "لين: إيقاف الصوت" : "لين: اضغط لبدء التسجيل";
  const hint = phase === "recording" ? "اضغط عليّ إذا انتهيت" : phase === "speaking" ? "اضغط عليّ لإيقاف الصوت" :
    phase === "thinking" ? "أراجع كلامك والمصادر" : phase === "permission" ? "اسمح بالميكروفون للبدء" : "اضغط عليّ وتكلّم، أو اكتب سؤالك";
  return <div className={`leen-presence is-${phase}`}>
    <link rel="preload" as="image" href="/leen-character-expressions.png" />
    <button ref={buttonRef} type="button" className="character-button" aria-label={label}
      aria-pressed={phase === "recording"} disabled={phase === "thinking" || phase === "permission"} onClick={onActivate}>
      <span className="character-aura" aria-hidden="true"><i /><i /></span>
      <span className="character-shadow" aria-hidden="true" />
      <span className="character-frame" aria-hidden="true"><span className="character-sprite" /></span>
      <span className="character-state-icon" aria-hidden="true">{phase === "recording" ? <Ear size={19} /> : phase === "speaking" ? <Volume2 size={19} /> : <Sparkles size={17} />}</span>
      <span className="character-control" aria-hidden="true">{phase === "recording" || phase === "speaking" ? <Square size={13} /> : <Mic size={14} />}</span>
    </button>
    <div className="character-copy"><strong>{phase === "speaking" ? "لين تتكلم" : phase === "recording" ? "أسمعك…" : phase === "thinking" ? "أفهم سؤالك…" : "أنا لين"}</strong><span>{hint}</span>
      <span className="character-activity" aria-hidden="true"><i /><i /><i /><i /><i /></span>
    </div>
  </div>;
}
