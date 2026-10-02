# Teammate content review — pending

Review `src/content/sources.json` and `src/content/safety.json`. All are deliberately marked `draft`; the interface reflects this. A developer passing tests does not approve religious interpretation.

For each source card:

- Confirm narrator, collection, number, source URL and exact excerpt. The Muslim 41 excerpt is from the Muslim attribution within its linked page; do not mislabel the page's other narrations as Muslim 41.
- Confirm the excerpt boundaries preserve meaning and that `isExcerpt` is accurate.
- Review the permitted explanation and every prohibited extension (fatwas, judging faith, invented reward counts, physical confrontation).
- Review generated explanations against the evaluation cases; confirm source support, age-appropriate language and Saudi phrasing.
- Record reviewer, date, notes and version/commit below. Change only the reviewed card to `approved`.

Review safety text separately for threat, immediate danger, uncertainty, limitation, clarification and the repeated-failed-advice fallback. It must make adult help explicit, override coercive secrecy, avoid blaming the speaker and never imply that Leen contacted help. Update `safety.json.reviewStatus` only after that review.

| Material | Reviewer | Date | Version | Result / notes |
|---|---|---|---|---|
| Non-harm excerpt/explanation | Pending | — | — | Draft |
| Good speech excerpt/explanation | Pending | — | — | Draft |
| Stopping wrongdoing excerpt/explanation | Pending | — | — | Draft |
| Safety and fallback wording | Pending | — | — | Draft |

Re-run the evaluation after any content or prompt change. Do not mark an entire future response space approved merely because three cards were reviewed.
