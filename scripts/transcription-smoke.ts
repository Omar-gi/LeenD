import { mkdir, writeFile } from "node:fs/promises";
import { transcribe } from "../src/lib/providers";
import { normalizeArabic } from "../src/lib/corpus";
if (process.env.ENABLE_PAID_APIS !== "true" || !process.env.OPENAI_API_KEY) throw new Error("This small paid smoke test requires API opt-in and a key.");
// A synthetic fixture only, not Leen's product voice and not child speech.
const input = "صديقي يضحك على قراءتي قدام الطلاب. وش أقول له؟";
const response = await fetch("https://api.openai.com/v1/audio/speech", {
  method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: "coral", input, response_format: "mp3" }), signal: AbortSignal.timeout(25000)
});
if (!response.ok) throw new Error(`Synthetic fixture generation unavailable (${response.status})`);
const bytes = new Uint8Array(await response.arrayBuffer());
await mkdir("tmp", { recursive: true }); await writeFile("tmp/synthetic-arabic-question.mp3", bytes);
const start = performance.now();
const transcript = await transcribe(new File([bytes], "synthetic-question.mp3", { type: "audio/mpeg" }));
const normalized = normalizeArabic(transcript);
const keywordsRecognized = /صديق/.test(normalized) && /قراء/.test(normalized) && /طلاب/.test(normalized);
const report = { at: new Date().toISOString(), kind: "synthetic_fixture_only_not_human_or_child_speech", input, transcript, keywordsRecognized, transcriptionMs: Math.round(performance.now() - start), fixtureBytes: bytes.length,
  note: "OpenAI TTS creates only this test input. Product responses still use ElevenLabs. Not an accent or human-microphone evaluation." };
await mkdir("evaluation/results", { recursive: true }); await writeFile("evaluation/results/transcription-smoke.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (!keywordsRecognized) process.exitCode = 1;
