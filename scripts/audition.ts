import { mkdir, writeFile } from "node:fs/promises";
import { speak, ProviderError } from "../src/lib/providers";
import { sources, policy } from "../src/lib/corpus";
if (process.env.ENABLE_PAID_APIS !== "true") throw new Error("Paid API calls are disabled. Enable only after accepting separate API billing.");
const ids = [...new Set((process.env.ELEVENLABS_AUDITION_VOICE_IDS || process.env.ELEVENLABS_VOICE_ID || "").split(",").map(v => v.trim()).filter(Boolean))];
if (!ids.length || ids.length > 3 || ids.some(id => !/^[\w-]{8,80}$/.test(id))) throw new Error("Set 1–3 comma-separated valid IDs in ELEVENLABS_AUDITION_VOICE_IDS.");
const sample = `أهلًا، أنا لين. السخرية من قراءتك تزعلك، ومن حقك تطلب كلامًا محترمًا. تقدر تقول: أنا أتعلّم، وكلنا نغلط. ${sources[1].sourceQuote}. ${policy.threat}`;
await mkdir("tmp/audition", { recursive: true });
await writeFile("tmp/audition/sample.txt", sample, "utf8");
for (const id of ids) {
  const start = performance.now();
  try {
    const audio = await speak(sample, undefined, fetch, id);
    await writeFile(`tmp/audition/${id}.mp3`, Buffer.from(audio, "base64"));
    console.log(JSON.stringify({ voiceId: id, file: `tmp/audition/${id}.mp3`, elapsedMs: Math.round(performance.now() - start), status: "generated_requires_listening" }));
  } catch (error) { console.log(JSON.stringify({ voiceId: id, status: "unavailable_check_account_permissions_or_quota", httpStatus: error instanceof ProviderError ? error.status : null, errorCode: error instanceof ProviderError ? error.code : "network_or_timeout" })); process.exitCode = 1; }
}
