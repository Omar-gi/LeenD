import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { speak } from "../src/lib/providers";
import { socialAudioTexts, speechConfigurationKey } from "../src/lib/social-audio";

if (process.env.ENABLE_PAID_APIS !== "true") throw new Error("Enable paid APIs before preparing speech.");
const configuration = speechConfigurationKey();
const clips: { text: string; url: string }[] = [];
await mkdir("public/social-audio", { recursive: true });
for (const text of socialAudioTexts) {
  const id = createHash("sha256").update(configuration + text).digest("hex").slice(0, 24);
  const audio = await speak(text);
  await writeFile(`public/social-audio/${id}.mp3`, Buffer.from(audio, "base64"));
  clips.push({ text, url: `/social-audio/${id}.mp3` });
}
// Publish the manifest only after every clip was successfully generated.
await writeFile("src/content/social-audio.json", JSON.stringify({ configuration, clips }, null, 2) + "\n");
console.log(`Prepared ${clips.length} authored social replies. No user audio or transcripts saved.`);
