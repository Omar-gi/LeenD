// Prints service status only, never API keys, headers, or provider error messages.
const timeout = () => AbortSignal.timeout(25000);
if (process.env.OPENAI_API_KEY && process.env.ENABLE_PAID_APIS === "true") {
  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", signal: timeout(),
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini", store: false, input: "Reply with OK.", max_output_tokens: 16 })
    });
    const body = await r.json();
    console.log(JSON.stringify({ service: "openai", status: r.status, ready: r.ok && body.status === "completed", errorCode: body.error?.code ?? null }));
  } catch { console.log(JSON.stringify({ service: "openai", ready: false, errorCode: "network_or_timeout" })); }
} else console.log("OpenAI paid check skipped: key missing or ENABLE_PAID_APIS is not true");
if (process.env.ELEVENLABS_API_KEY) {
  try {
    const r = await fetch("https://api.elevenlabs.io/v2/voices?page_size=100", { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY }, signal: timeout() });
    const body = await r.json();
    console.log(JSON.stringify({ service: "elevenlabs", status: r.status, ready: r.ok, voicesAvailable: body.voices?.length ?? 0, errorCode: body.detail?.status ?? null }));
  } catch { console.log(JSON.stringify({ service: "elevenlabs", ready: false, errorCode: "network_or_timeout" })); }
} else console.log("ElevenLabs key missing");
export {};
