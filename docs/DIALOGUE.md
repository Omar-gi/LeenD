# V1 dialogue adaptation — 4 October 2026

The team supplied a product workbook and a draft system prompt dated 3 October. Original files are preserved in the owner's workspace `../reference-material/` outside the public application repository. They are design input, not runtime instructions or religious evidence.

The adapted behavior is versioned in `src/lib/prompts/leen.ts`, combined with the source/format constraints and independent audit in `src/lib/answer.ts`. OpenAI still generates and checks answers; ElevenLabs only voices the validated text. The HTML's ElevenLabs Agents setup, profile variables and `end_call` instructions are not used. This follows [OpenAI's code-managed prompt guidance](https://developers.openai.com/api/docs/guides/prompting).

## Reconciled behavior

- Use relevant dialogue actions: understand the event, acknowledge a stated feeling, explore an interpretation cautiously, explain a supported value, choose a safe next step, close naturally. Skip actions already covered. A clear question gets a direct answer; no compulsory seven-stage interview.
- At most one useful question. No invented emotions/motives, character labels, action pledges, deadlines, proof of compliance, exclusive friendship or re-engagement after silence.
- A first supported explanation includes one exact server-inserted excerpt. Follow-ups retain sources without automatic repetition. Previously quoted excerpts are detected from authenticated assistant history. Explicit requests permit repetition; a genuinely relevant different quotation may be included. History ends with the session and is limited to the most recent 12 turns, so an excerpt older than that window may be introduced again.
- Short exact greetings/closings use source-free fixed replies. Other Full/Partial advice must carry source evidence and pass the independent audit. A malformed quotation or missing source attachment gets at most one format repair; unknown sources fail closed. Every repaired answer still requires the audit.
- Safety interrupts the dialogue. Clear threats, private-photo coercion, unwanted touching and self-harm statements have conservative direct checks; generation and the audit also classify safety. Negation can trigger clarification. These checks do not establish comprehensive detection of all paraphrases.
- Trusted adult guidance allows a teacher or another safe adult when a family member is unsafe. All safety wording remains `draft` for human review.

## Character interaction

`public/leen-character.png` is the owner's supplied artwork, copied without image edits. The portrait is responsive; idle/listening/thinking/speaking states follow the real app state. On playback, Web Audio measures the reply amplitude for a subtle glow; if unavailable, normal audio and the CSS state remain. This is not mouth animation or lip synchronization. No character click on the introduction opens the microphone: adult confirmation and starting the conversation come first.

In the conversation, clicking Leen starts a recording, stops/sends a recording, or stops current speech. Generation and permission-pending states disable repeat clicks. The existing microphone, typing, correction and playback controls remain. Reduced-motion settings stop decorative movement. No hands-free listening, LiveKit or avatar service is added.

## Sarah's pending content

The workbook's detailed reference input is marked “عند سارة”. Its topic map and the draft's illustrative dialogues do not add approved source cards. The existing three cards and safety wording remain marked `draft`; the UI continues to say so. No husn-al-dhann hadith has been imported from the draft.

For each new card, provide a stable ID, topic/title, exact excerpt, quotation introduction/context, reference and URL, whether it is an excerpt, permitted child-friendly explanation, inference boundaries, and review status with reviewer/date. Match the existing `src/content/sources.json` shape. Keep fictional scenario examples separate from this authoritative source file.

When a reviewed husn-al-dhann card arrives, revisit the explicit missing-topic guard in `scopeBoundary` and the audit's current content limits, then add its paraphrases to the evaluation. Do not just flip an entire corpus to approved. Update the content-review register per card and re-run affected scenarios.

## Verification and deployment

`evaluation/cases.ts` now includes the original 24 cases plus guided conversation, explicit quote repetition, natural closure, online coercion, unsafe family member, dependency and missing new content. Critical cases repeat three times. Results and limitations belong in `evaluation/RESULTS.md`; automatic checks are not religious approval or evidence of child usability.

The Railway topology is unchanged: one Docker service, no database or volume, server-only credentials, exact HTTPS `APP_ORIGIN`, stable `SESSION_SECRET`, and funded separately billed providers. See [Railway setup](RAILWAY.md). The owner handles Railway funding and deployment.
