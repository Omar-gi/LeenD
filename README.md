# لين — Leen

Arabic, right-to-left friendship conversation MVP for an Islamic-content hackathon. It is an **adult-operated fictional demo**, written in simple language suitable for a 9–10-year-old scenario. It is not approved for real child use. Religious explanations and fixed safety wording remain visibly **draft** until teammate review.

## Run locally

Requires Node.js 22+ and separately funded OpenAI/ElevenLabs API accounts.

Paid calls default to **disabled** in the template (`ENABLE_PAID_APIS=false`). ChatGPT Pro/Go is separate from the API. Set this variable to `true` only if separately billed API usage is acceptable; the app and paid test scripts refuse calls otherwise. The owner later funded $10 of API credit and enabled the local evaluation. A normal API key does not reveal the account's remaining balance.

```sh
npm ci
cp .env.example .env.local
# Fill the private file locally. Never put keys in .env.example or chat.
npm run dev
```

PowerShell: use `Copy-Item .env.example .env.local` instead of `cp` if preferred. Do not overwrite an existing private file. Open `http://localhost:3000`. Set `APP_ORIGIN` accordingly. `SESSION_SECRET` must be a random string of at least 32 characters for production. Instructions to generate it and deploy are in [RAILWAY.md](docs/RAILWAY.md).

```sh
npm run typecheck
npm test
npm run build
npm start
```

`npm start` previews the production build locally. Railway uses the included Dockerfile with Next.js standalone output. No database, account system, persistent conversation storage or training is required.

## Implemented experience

- Intro with adult fictional-use acknowledgement and AI voice disclosure.
- Tap-to-start/stop microphone, automatic stop at 30 seconds, typed input, readable transcript and answer.
- Correct an earlier transcript: the corrected question and all later turns are replaced only when the new response succeeds.
- Full / Partial / Clarify / Refer decisions; session follow-ups; visible source excerpts and links.
- Supported Full/Partial replies include one exact hadith excerpt in both the dialogue and spoken answer, with source-specific attribution and a simple explanation. Safety, clarification and limitation responses remain direct.
- Stop/replay speech, disable spoken replies, provider-error recovery, and session clearing.
- Complete three-card server corpus on each request, strict output structure, exact server-inserted quotations, independent grounding audit before TTS, and a fixed safety path for threats.
- Bounded input/history, signed history receipts, same-origin checks, request timeouts, concurrency and request-budget controls.

## Architecture

Browser → `POST /api/turn` → optional OpenAI transcription (`gpt-4o-mini-transcribe`, Arabic) → constrained OpenAI response and separate audit (`gpt-4.1-mini`) → ElevenLabs speech (`eleven_flash_v2_5`) → text, sources and optional audio.

The browser holds at most 12 turns in memory; refresh/end session clears them. No localStorage, cookies containing content, filesystem uploads, database, or analytics are used. Provider processing is separate: `store:false` disables Responses storage, not all provider retention. See [privacy and reliability](docs/PRIVACY-AND-LIMITS.md).

## API

`POST /api/turn`, same origin, accepts JSON:

```json
{"text":"صديقي يسخر من قراءتي، وش أقول له؟","history":[],"adultConfirmed":true,"audioEnabled":true}
```

Or multipart: `audio` (supported WebM/MP4/OGG/WAV/MP3 file), `durationSeconds` (0–30), `history` (JSON), `adultConfirmed=true`, `audioEnabled=true|false`. Maximum request body 3 MiB, text 1,000 characters, history 12 turns. Do not send both text and audio. History entries must contain the server's previous `receipt`, plus exact `user` and `assistant` text.

Success includes `transcript`, `decision`, `safety`, `answer`, `segments`, `sources`, `grounded`, `limited`, `receipt`, `audio` (base64 MP3 or null), `audioStatus`, `elapsedMs`, and `reviewStatus`. Responses use `Cache-Control: no-store`. Audio failure can still return HTTP 200 with usable text. Failed answer/transcription returns a short error code and no fabricated turn.

## Voice and evaluation

```sh
npm run voices -- --saudi
# Put up to 3 candidate IDs in ELEVENLABS_AUDITION_VOICE_IDS.
npm run audition
# Listen, score docs/VOICE-AUDITION.md, then set ELEVENLABS_VOICE_ID.
npm run evaluate
```

Audition files live in ignored `tmp/audition`. The paid evaluation runner uses only the committed fictional cases, repeats critical language cases three times and records timings plus human-review rubrics. It never logs actual app conversations. See [evaluation results](evaluation/RESULTS.md), [source register](docs/SOURCES-AND-LICENSES.md), [review checklist](docs/CONTENT-REVIEW.md), and [submission/demo guide](docs/SUBMISSION.md).

## Current release gates

The app is implemented. Omar selected Noorah, and the complete three-turn HTTP conversation passed with real OpenAI transcription/answers and ElevenLabs spoken replies. Thmanyah typography is included with the owner's permission. Teammate content/pronunciation review, an outside-adult voice usability test, and the owner's Railway deployment remain before marking the demo ready. Follow [the measured status](evaluation/RESULTS.md), not assumptions about provider availability.

Work began on **2 October 2026**. This baseline predates the competition's 4–6 October development window; do not present it as work created entirely during that window. See [PREPARATION.md](docs/PREPARATION.md).

## Thmanyah typography

The app uses owner-supplied Thmanyah Sans and Serif Display WOFF2 files, included after the owner confirmed permission to include them in the repository. Font rights are separate from application code rights. See [font provenance](public/fonts/README.md).
