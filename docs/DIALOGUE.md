# Dialogue V5 — workbook-only conflict domain

The original HTML is not loaded at runtime. `src/lib/prompts/leen.ts` supplies a standalone Saudi Arabic policy. The active domain is **الخلاف مع الصديق**, from the blue block of the latest team workbook. Its four branches, seven values and eight excerpts are listed in the [source register](SOURCES-AND-LICENSES.md). The former five-card corpus has been removed from runtime.

## Conversation and evidence

- Short exact greetings/thanks/closings receive one sentence. Extra disclosures never qualify for a greeting-only shortcut.
- The classifier considers the actual situation and bounded signed history, chooses a category and eligible source IDs, and checks safety. Column-C keywords are hints; negation, speaker role and context take priority. The server intersects selected sources with the chosen workbook categories. A requested hadith cannot silently select a Quran card. The three-night rule requires a current boycott/duration cue; it is not selected for every disagreement or unanswered greeting. Adult-unavailability requests ordinarily select no religious lesson. A short question about returning to the old closeness gets a direct boundary without another religious deadline.
- Only selected cards reach the writer and independent auditor. Meaning/quote segments are empty placeholders with selected IDs; exact excerpts and short authored meanings are filled by the server. Religious meanings stay within column E and explicit boundaries. Separate practical prose adapts to the situation and is audited before speech. No outside religious text or reference can be selected as a fallback.
- Quran and hadith have distinct introductions and visible type labels. Every displayed source identifies its Excel cell. G10 remains its exact workbook Quran excerpt and is never attributed to the Prophet.
- A first directly relevant lesson can include one excerpt. Ordinary practical support need not quote. Follow-ups do not routinely repeat quotations. Simplification explains the same point in concrete words, with no new religious topic. Exact repeat requests respect quotation type and only use known assistant excerpts, not pasted user text.
- Give a conclusion and one usable step, usually two or three short sentences. Zero questions by default; at most one indispensable ordinary clarification within twelve turns. Safety can override that budget. Do not force forgiveness, restored trust, affection, mediation or contact with an unsafe person.
- Other friendship domains, technical topics and unrelated worship remain outside this demo's lessons. A mixed request sends only its exact conflict substring to the writer; the server appends a limitation, and the auditor checks the entire input. Safety is always in scope.
- Source-free practical text is still generative. Independent audit and one bounded repair reduce errors but do not prove perfect relevance or complete hallucination detection. Authored source meanings and exact excerpts remain draft for human review.

## When an adult is unavailable

Adult referral is no longer the default end of an ordinary conflict or missing-source response. If the child reports that a parent/teacher is busy or not answering, acknowledge the obstacle and suggest a manageable step: pause the argument, take space, or prepare a simple statement. A repeated blocked attempt gets a calm stopping point without another question, promise or religious quotation.

`src/lib/support.ts` handles short replies to that failed step using user-reported context; more complex disclosures go through semantic routing and auditing. A friend's unanswered message is not automatically treated as an unavailable adult. A previous assistant recommendation does not establish that a threat occurred. Explicitly resolved user-reported danger clears the narrow carried safety state.

Actual unresolved danger stays a safety need when nobody answers. Offer an alternative way to obtain real-world help and, for immediate danger, local emergency assistance. Repeated blocked help receives a changed safety step. Never distract with entertainment, pretend the child is safe, promise help has been contacted, or end as though the danger is resolved. All safety wording requires teammate review.

## Character interaction

`public/leen-character.png` is the owner's supplied artwork, copied without image edits and retained on the introduction. The conversation uses a transparent four-expression sprite derived from it. Idle gently floats; recording uses an attentive hand-to-head pose and nod; thinking sways; speaking bobs with a two-frame mouth driven by the reply's measured audio amplitude. Mouth changes have a short hold and separate open/close thresholds to reduce flicker. This is expressive animation, not phoneme-level lip synchronization. If Web Audio is unavailable, normal playback and a CSS talking animation remain. No character click on the introduction opens the microphone: adult confirmation and starting the conversation come first. See [asset provenance and generation prompt](CHARACTER-ANIMATION.md).

In the conversation, clicking Leen starts a recording, stops/sends a recording, or stops current speech. Generation and permission-pending states disable repeat clicks. The existing microphone, typing, correction and playback controls remain. Reduced-motion settings stop decorative movement. No hands-free listening, LiveKit or avatar service is added.

## Verification and deployment

`evaluation/cases.ts` exports the active W01–W18 workbook cases; older fixtures remain under `legacyCases` for historical context only. Automatic checks cover source identity, exact quotations, question counts, decisions and safety; critical cases repeat three times. Human review still evaluates every response's actual meaning and Arabic quality.

The existing Railway service, API credentials, Noorah voice, recording limits and session handling are unchanged. See [deployment setup](RAILWAY.md) and [measured results](../evaluation/RESULTS.md). A local build/test is not a claim of a Railway deployment.
