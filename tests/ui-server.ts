/** ISOLATED UI QA ONLY. Never use for demo evaluation or deployment.
 * Port 3001 serves real UI/turn code with deterministic fake providers.
 * Every external fetch is intercepted; no paid requests can leave this process.
 */
import { createServer } from "node:http";
import next from "next";
import { POST } from "../src/app/api/turn/route";
import { sources } from "../src/lib/corpus";
process.env.OPENAI_API_KEY = "ui-test-only";
process.env.ELEVENLABS_API_KEY = "ui-test-only";
process.env.ELEVENLABS_VOICE_ID = "ui-test-voice";
process.env.ENABLE_PAID_APIS = "true";
process.env.SESSION_SECRET = "ui-test-only-32-character-session-secret";
process.env.APP_ORIGIN = "http://localhost:3001";
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url.startsWith("https://api.elevenlabs.io/")) return Response.json({}, { status: 503 });
  if (url === "https://api.openai.com/v1/audio/transcriptions") return Response.json({}, { status: 503 });
  if (url !== "https://api.openai.com/v1/responses") throw Error("External network disabled in UI fixture server");
  const body = JSON.parse(String(init?.body));
  const incoming = JSON.parse(body.input); const question = String(incoming.currentQuestion);
  if (question === "اختبار فشل الخدمة") return Response.json({}, { status: 503 });
  const result = body.text.format.name === "leen_grounding" ? { contextSummary: "Relevant fictional response", sourceReason: "Relevant lesson", supported: true, appropriate: true, inScope: true, contextRelevant: true, sourcesRelevant: true, safety: "none" } : {
    decision: "FULL", safety: "none", segments: [
      { kind: "explanation", text: incoming.conversation?.length ? "أفهم إنك جرّبت تطلب منه يوقف. تقدر تستعين بمعلّم بدل ما ترد بإهانة." : "السخرية تزعلك، ومن حقك تطلب كلامًا محترمًا. تقدر تقول: أنا أتعلّم، وكلنا نغلط.", sourceIds: [sources[1].id], quoteId: null },
      { kind: "quote", text: "", sourceIds: [sources[1].id], quoteId: sources[1].id }
    ]
  };
  return Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(result) }] }] });
};
const app = next({ dev: false, hostname: "127.0.0.1", port: 3001 });
await app.prepare();
const handler = app.getRequestHandler();
createServer(async (req, res) => {
  if (req.url === "/api/health") { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ textReady: true, voiceReady: false, reviewStatus: "draft" })); return; }
  if (req.url === "/api/turn" && req.method === "POST") {
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const response = await POST(new Request("http://localhost:3001/api/turn", { method: "POST", headers: req.headers as HeadersInit, body: Buffer.concat(chunks) }));
    res.statusCode = response.status; response.headers.forEach((value, key) => res.setHeader(key, value)); res.end(Buffer.from(await response.arrayBuffer())); return;
  }
  await handler(req, res);
}).listen(3001, "127.0.0.1", () => console.log("ISOLATED FAKE-PROVIDER UI TEST SERVER: http://localhost:3001 — not a live model demo"));
