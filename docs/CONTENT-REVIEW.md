# Teammate content review — pending

Review `src/content/sources.json` and `src/content/safety.json`. All are deliberately marked `draft`; the interface reflects this. A developer passing tests does not approve religious interpretation.

For each source card:

- Confirm narrator, collection, number, source URL and exact excerpt. The Muslim 41 excerpt is from the Muslim attribution within its linked page; do not mislabel the page's other narrations as Muslim 41.
- Confirm the excerpt boundaries preserve meaning and that `isExcerpt` is accurate.
- Review `quoteIntroduction`, which is shown and spoken before the exact excerpt. Confirm that the stopping-wrongdoing introduction preserves the context of helping a wrongdoer stop wrongdoing.
- Review `childExplanation` and `simpleExplanation`: these are the short fixed meanings actually spoken in source-backed segments. They were drafted from the existing permitted explanations, not imported from Sara's missing detailed sheet.
- Review the permitted explanation and every prohibited extension (fatwas, judging faith, invented reward counts, physical confrontation).
- Review generated explanations against the evaluation cases; confirm source support, age-appropriate language and Saudi phrasing.
- Record reviewer, date, notes and version/commit below. Change only the reviewed card to `approved`.

Review safety text separately for threat, immediate danger, uncertainty, limitation, clarification and the repeated-failed-advice fallback. It must make adult help explicit, override coercive secrecy, avoid blaming the speaker and never imply that Leen contacted help. Update `safety.json.reviewStatus` only after that review.

| Material | Reviewer | Date | Version | Result / notes |
|---|---|---|---|---|
| Non-harm excerpt/explanation | Pending | — | — | Draft |
| Good speech excerpt/explanation | Pending | — | — | Draft |
| Stopping wrongdoing excerpt/explanation | Pending | — | — | Draft |
| Suspicion excerpt/explanation | Pending | — | — | Draft; source reference checked 4 October. Review distinction between uncertain impressions and actual harm; no blaming feelings or forced investigation. |
| Forgiveness excerpt/explanation | Pending | — | — | Draft; source reference checked 4 October. Review voluntary forgiveness, retained boundaries and no guaranteed acceptance of an apology. |
| Safety and fallback wording | Pending | — | — | Draft |

Review the answer-first dialogue fallback in `src/lib/dialogue.ts` and the source-adoption limitation in `src/lib/answer.ts` too. Re-run the evaluation after content or prompt changes. Reviewing a finite set of cards does not approve every future generated response.

Review the V4 social replies, simplification behavior and friendship-scope wording too. The 5 October scope CSV does not contain Sara's detailed classification/meaning/source table; see [content handoff](CONTENT-HANDOFF.md). No new religious approval is implied by importing its 15 domain descriptions.
