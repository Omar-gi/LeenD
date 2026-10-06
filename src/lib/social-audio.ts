import { createHash } from "node:crypto";
import prepared from "../content/social-audio.json";

// Only authored social replies are stored. Never cache a user's conversation.
export const socialAudioTexts = [
  "يا هلا، أنا هنا أساعدك.", "حيّاك، أنا أسمعك.", "العفو، على راحتك.", "مع السلامة.",
  "وعليكم السلام ورحمة الله، يا هلا، أنا هنا أساعدك.",
  "وعليكم السلام ورحمة الله، حيّاك، أنا أسمعك.",
  "وعليكم السلام ورحمة الله، العفو، على راحتك.",
  "وعليكم السلام ورحمة الله، مع السلامة.",
  "وعليكم السلام ورحمة الله، حيّاك الله.", "أهلًا وسهلًا فيك.", "الحمد لله، يا هلا فيك."
];

export const speechSettings = { stability: 0.6, similarity_boost: 0.75, speed: 0.95 };
export function speechConfigurationKey() {
  return createHash("sha256").update(JSON.stringify({ voice: process.env.ELEVENLABS_VOICE_ID,
    model: process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5", language: "ar", settings: speechSettings,
    format: "mp3_44100_128" })).digest("hex");
}

export function preparedSocialAudio(text: string): string | null {
  if (!process.env.ELEVENLABS_VOICE_ID || prepared.configuration !== speechConfigurationKey() || !socialAudioTexts.includes(text)) return null;
  const clip = prepared.clips.find(clip => clip.text === text);
  return clip && /^\/social-audio\/[a-f0-9]{24}\.mp3$/.test(clip.url) ? clip.url : null;
}
