if (!process.env.ELEVENLABS_API_KEY) throw new Error("Set ELEVENLABS_API_KEY in .env.local first.");
// Metadata only. The same multilingual voice can speak Arabic with varying accent quality.
const shared = process.argv.includes("--saudi");
const url = new URL(shared ? "https://api.elevenlabs.io/v1/shared-voices" : "https://api.elevenlabs.io/v2/voices");
url.searchParams.set("page_size", "100");
const search = process.argv[2]?.startsWith("--") ? undefined : process.argv[2];
if (shared) { url.searchParams.set("language", "ar"); url.searchParams.set("locale", "ar-SA"); url.searchParams.set("gender", "female"); url.searchParams.set("include_custom_rates", "false"); }
if (search) url.searchParams.set("search", search);
const response = await fetch(url, { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY }, signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`ElevenLabs voice listing failed (${response.status}). Check key permissions and quota.`);
const data = await response.json();
for (const voice of data.voices ?? []) {
  if (shared && !/saudi/i.test(voice.accent || "")) continue;
  console.log(JSON.stringify({ id: voice.voice_id, name: voice.name, category: voice.category, labels: voice.labels, accent: voice.accent, description: voice.description, freeUsersAllowed: voice.free_users_allowed, ownerId: voice.public_owner_id }));
}
if (data.has_more) console.log("More voices exist. Narrow the search: npm run voices -- Arabic");
export {};
