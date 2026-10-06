# Saudi Arabic voice audition

Allocate 60 minutes: 10 for candidate eligibility, 25 for listening, 15 for exact religious excerpt checks and 10 for configuration/retest. Use the identical `scripts/audition.ts` sample for every candidate. The sample includes colloquial explanation, an unchanged excerpt and safety guidance. It is not Quran recitation.

Candidates located in the ElevenLabs library on 2 October 2026:

| Candidate | Voice ID | Library description | Actual listening status |
|---|---|---|---|
| Noorah | `ckaeRWMtCV0u0pUT3wX1` | Saudi/Sharqiya, warm | Generated in 2,622 ms; selected by Omar; formal pronunciation review pending |
| Nora S | `FZeLZd39ejvLgzR2gY0t` | Saudi, natural and calm | Generated in 9,295 ms after Starter activation; listening review pending |
| Joud | `9xjgPVEwVEUuUxRAxKc9` | Saudi, gentle and warm | Generated in 9,560 ms after Starter activation; listening review pending |

These descriptions are provider metadata. Initial generation failed with `payment_required`; the owner activated Starter and all three clips then generated successfully. **Omar selected Noorah after the three audition clips were presented on 2 October 2026.** Its ID is saved in `.env.example` and the private local configuration. Generation timing is one sample per voice, not a benchmark of expected response latency. Numeric listening scores and teammate quotation/pronunciation sign-off have not been recorded.

When access is ready, run `npm run audition`. Listen to the local MP3s in `tmp/audition`. Rank **pronunciation accuracy first, clarity second, warmth third**; an attractive voice with an incorrect quotation fails. Listen for every word of the excerpt and natural pronunciation of لين. Prefer calm adult delivery, not exaggerated childlike acting. Confirm the selected voice's availability/licence in the actual account.

| Candidate | Pronunciation /5 | Clarity /5 | Warmth /5 | Quotation exact? | Reviewer / notes |
|---|---|---|---|---|---|
| Noorah | — | — | — | Formal review pending | Selected by Omar from audition clips |
| Nora S | — | — | — | Not tested | Pending |
| Joud | — | — | — | Not tested | Pending |

Save the chosen ID as `ELEVENLABS_VOICE_ID` in `.env.local` and Railway variables. Repeat the complete three-turn voice demo and record end-to-end latency. If no Saudi voice passes, disclose the voice limitation and keep the readable-text path usable; do not silently claim accent validation.

## Current voice configuration
The earlier audition above is retained as development history. On 6 October, Omar selected Nora, Saudi natural and calm, voice ID FZeLZd39ejvLgzR2gY0t, replacing Noorah. The configured voice and prepared social clips now use Nora. This change is not a formal pronunciation sign-off.
