# Deploying Leen on Railway

Omar will deploy from `Omar-gi/LeenD`. The repository root is the application; leave Railway's Root Directory empty (or `/`). No source briefing PDFs or API keys are included.

The 4 October character/dialogue update needs no new environment variables, database, or paid avatar service. The portrait ships under `public/` and the adapted prompt stays on the server. Keep the draft-content banner until Sarah's review is recorded. See [current measured results and remaining dialogue limitations](../evaluation/RESULTS.md) before presenting the demo.

1. Create a Railway project from the GitHub repository. Select the Hobby plan in your account if needed. Railway should detect the root `Dockerfile`; `railway.json` supplies a liveness healthcheck and one replica.
2. Generate a Railway public domain. Set `APP_ORIGIN` to its **exact HTTPS origin**, without a trailing slash or path. Update this when changing domains.
3. Add server variables from your private `.env.local`: `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `SESSION_SECRET`. Keep model defaults from `.env.example`. Set `ENABLE_PAID_APIS=true` only if you accept separate provider API billing; it defaults to false. Do not use `NEXT_PUBLIC_` for any credential. Use a random secret with at least 32 characters; generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` in your own terminal. Keep it unchanged across redeployments during a demo session.
4. Docker starts `node server.js` as the non-root Node user, bound to `0.0.0.0` and Railway's injected `PORT`. Do not override the start command with `npm start` on Railway. Do not attach a database or volume.
5. Disable optional request-body logging/tracing integrations. Application code does not log content. Railway may retain ordinary access/build logs; neither keys nor recordings belong in build arguments or logs.
6. Confirm `/api/health` returns `textReady: true`, `voiceReady: true`. This checks configuration presence, **not provider quota or paid voice access**. Complete one real typed turn and one recorded turn after accepting API billing. Production requires `APP_ORIGIN` and a valid `SESSION_SECRET` or the turn endpoint returns `setup_required`.
7. Keep one replica and disable service sleeping/serverless mode for judging. Keep API credits and voice entitlement active. Confirm the actual public link on a second device and preserve it throughout judging.

## Budget envelope (SAR 500 total, planning caps rather than a price quote)

| Bucket | Cap | Control |
|---|---:|---|
| Railway | SAR 100 (~USD 26.67) | Set a usage alert around USD 15 and a hard usage limit around USD 20, allowing room for the plan floor and taxes. Inspect whether the displayed cap includes the subscription charge. |
| OpenAI API | SAR 150 (~USD 40) | Fund a dedicated project/account conservatively; turn off automatic recharge. Set project budget alerts. API project budgets are notifications, not guaranteed request cutoffs. |
| ElevenLabs | SAR 150 (~USD 40) | Use a plan that actually permits the selected voice/model; keep overage/usage-based billing off where available. Review price before purchasing. |
| Contingency/tax | SAR 100 | Reserve for billing differences and a deliberate top-up if needed. |

The conversion is a planning approximation. Check the providers' actual totals and currency/tax charges. Do not automatically buy a plan or raise a cap.

Railway is usage-billed with a plan minimum; adding a card does not make it a simple prepaid wallet. A Railway hard limit can stop the app. Leave headroom for judging, monitor the dashboard daily, and make any cap increase a deliberate budget decision. Railway caps do not cover OpenAI or ElevenLabs charges.

The application additionally allows three concurrent turns and defaults to 120 turns/hour and 500/day, per process. These counters reset after restarts and are not a financial guarantee. Keep one replica. For sustained public traffic beyond the hackathon, use a shared quota store and abuse controls before expanding access.

## Troubleshooting

- `billing_disabled`: separately billed calls are intentionally off in the template. Set `ENABLE_PAID_APIS=true` only with funded API credit and your spending controls configured.
- Thmanyah font missing on deployment: check the four committed WOFF2 assets under `public/fonts`; the owner confirmed permission to include them. The app also has system fallbacks.

- `credit_balance_exhausted` / `insufficient_quota`: fund **OpenAI API** billing. ChatGPT Go/Plus/Pro subscriptions do not include API credits.
- ElevenLabs `payment_required`: the key can be valid while voice generation needs an eligible paid plan or a voice available to that account. Listing a voice successfully is not proof of generation rights.
- No microphone: use HTTPS (localhost is the local-development exception), allow mic permission, or type. Safari/Chrome recording formats are selected at runtime.
- Readable reply but no audio: check ElevenLabs voice ID, model access and quota. Text remains available.
- `invalid_origin`: make `APP_ORIGIN` match the public URL exactly.
- `invalid_history` after changing `SESSION_SECRET`: end the browser session and start a new one.

References checked during implementation: [Railway Next.js](https://docs.railway.com/guides/nextjs), [Railway plans](https://docs.railway.com/pricing/plans), [Railway cost control](https://docs.railway.com/pricing/cost-control), [OpenAI billing separation](https://help.openai.com/en/articles/9039756-managing-billing-settings-on-the-chatgpt-web-and-api-platform).
