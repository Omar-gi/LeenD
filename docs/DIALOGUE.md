# V1 dialogue adaptation — 4 October 2026

The team supplied a product workbook and a draft system prompt dated 3 October. Original files are preserved in the owner's workspace `../reference-material/` outside the public application repository. They are design input, not runtime instructions or religious evidence.

The adapted behavior is versioned in `src/lib/prompts/leen.ts`, combined with the source/format constraints and independent audit in `src/lib/answer.ts`. OpenAI still generates and checks answers; ElevenLabs only voices the validated text. The HTML's ElevenLabs Agents setup, profile variables and `end_call` instructions are not used. This follows [OpenAI's code-managed prompt guidance](https://developers.openai.com/api/docs/guides/prompting).

## Reconciled behavior

- Use relevant dialogue actions: understand the event, acknowledge a stated feeling, explore an interpretation cautiously, explain a supported value, choose a safe next step, close naturally. Skip actions already covered. A clear question gets a direct answer; no compulsory seven-stage interview.
- At most one useful question. No invented emotions/motives, character labels, action pledges, deadlines, proof of compliance, exclusive friendship or re-engagement after silence.
- Everyday practical friendship help can be Full/Partial without a source: apologizing for forgetting an item, offering/borrowing something or inviting a friend does not inherently call for a religious lesson. Religious claims still require their own source evidence. Garbled or conflicting giver/receiver roles call for one targeted clarification.
- A hadith is explicitly selected only for a directly relevant religious lesson or requested available text. The server fills its exact excerpt, with no automatic insertion from a source attachment. The independent audit separately checks the answer against the current question (`contextRelevant`) and every source/quote against the user's need (`sourcesRelevant`). A polite suggested sentence alone cannot justify adding the good-speech hadith. Follow-ups do not inherit relevance from a prior topic.
- A conservative server rule additionally excludes the current cards from recognized ordinary item requests and invitations, even if the model audit approves a citation. Religious requests and explicit harmful-speech situations remain on the normal source/audit path. A narrow same-item return-role guard asks a clarification; it still runs semantic safety detection and the audit. These rules cover observed patterns, not every paraphrase.
- Short exact greetings/closings use source-free fixed replies. Every other generated answer, including source-free practical help, must pass the independent audit. At most one repair total is allowed for format or relevance; the result must pass the full audit again. Unknown sources fail closed. Previously quoted excerpts are detected from authenticated assistant history. Explicit requests permit repetition only when relevant. History ends with the session and is limited to the most recent 12 turns.
- Safety interrupts the dialogue. Clear threats, private-photo coercion, unwanted touching and self-harm statements have conservative direct checks; generation and the audit also classify safety. Negation can trigger clarification. These checks do not establish comprehensive detection of all paraphrases.
- Trusted adult guidance allows a teacher or another safe adult when a family member is unsafe. All safety wording remains `draft` for human review.

## Character interaction

`public/leen-character.png` is the owner's supplied artwork, copied without image edits and retained on the introduction. The conversation uses a transparent four-expression sprite derived from it. Idle gently floats; recording uses an attentive hand-to-head pose and nod; thinking sways; speaking bobs with a two-frame mouth driven by the reply's measured audio amplitude. Mouth changes have a short hold and separate open/close thresholds to reduce flicker. This is expressive animation, not phoneme-level lip synchronization. If Web Audio is unavailable, normal playback and a CSS talking animation remain. No character click on the introduction opens the microphone: adult confirmation and starting the conversation come first. See [asset provenance and generation prompt](CHARACTER-ANIMATION.md).

In the conversation, clicking Leen starts a recording, stops/sends a recording, or stops current speech. Generation and permission-pending states disable repeat clicks. The existing microphone, typing, correction and playback controls remain. Reduced-motion settings stop decorative movement. No hands-free listening, LiveKit or avatar service is added.

## Sarah's pending content

The workbook's detailed reference input is marked “عند سارة”. Its topic map and the draft's illustrative dialogues do not add approved source cards. The existing three cards and safety wording remain marked `draft`; the UI continues to say so. No husn-al-dhann hadith has been imported from the draft.

For each new card, provide a stable ID, topic/title, exact excerpt, quotation introduction/context, reference and URL, whether it is an excerpt, permitted child-friendly explanation, inference boundaries, and review status with reviewer/date. Match the existing `src/content/sources.json` shape. Keep fictional scenario examples separate from this authoritative source file.

When a reviewed husn-al-dhann card arrives, revisit the explicit missing-topic guard in `scopeBoundary` and the audit's current content limits, then add its paraphrases to the evaluation. Do not just flip an entire corpus to approved. Update the content-review register per card and re-run affected scenarios.

## Verification and deployment

The V2 update removes a conflict between ordinary dialogue and mandatory source/quotation rules. The audit now returns brief context/source verdict summaries before its flags. Those summaries are not exposed in the UI or logged for application users; only fictional evaluation runs retain them. Structured output is a format guarantee, not a relevance guarantee; [OpenAI's guidance](https://developers.openai.com/api/docs/guides/structured-outputs#handling-mistakes) calls for examples and testing when outputs contain mistakes. The observed missed and over-conservative checks remain documented in the evaluation results.

`evaluation/cases.ts` now includes the original 24 cases plus guided conversation, explicit quote repetition, natural closure, online coercion, unsafe family member, dependency and missing new content. Critical cases repeat three times. Results and limitations belong in `evaluation/RESULTS.md`; automatic checks are not religious approval or evidence of child usability.

The Railway topology is unchanged: one Docker service, no database or volume, server-only credentials, exact HTTPS `APP_ORIGIN`, stable `SESSION_SECRET`, and funded separately billed providers. See [Railway setup](RAILWAY.md). The owner handles Railway funding and deployment.
