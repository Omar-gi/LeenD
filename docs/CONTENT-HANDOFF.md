# Sara's evolving content — current baseline and future imports

The team updates its working file frequently. The 5 October CSV supplied to the workspace is today's baseline: the scope sheet, without the described detailed classification table yet. It expressly distinguishes scope from knowledge. Its 15 domain labels/descriptions are now represented in `src/content/scope.json` and used in generation and independent checking. No new verses, hadiths, meanings or approval statuses have been invented from those headings. A downloaded CSV is a snapshot: the deployed app will not pick up changes to the team's working sheet automatically. Import a new export when the team shares it, recording its version and review status.

Both local workbook copies are identical and also lack that detailed table. The current religious library remains the five draft cards in `src/content/sources.json`. The original HTML is not a runtime dependency; V4 uses a standalone dialogue policy.

## Mapping the detailed sheet when it arrives

| Team column | Intended technical use |
|---|---|
| المجال / المجال الفرعي | Stable category and subdomain IDs; preserve the team's labels |
| الكلمات المفتاحية باللهجة الطفل | Matching hints and fictional paraphrase tests, never the only relevance criterion |
| الآداب المرتبطة | Value labels for matching; not independent evidence |
| المعنى الذي تعززه لين | The permitted explanation plus approved short child/simple wording, preserving reviewed limits; primary basis for a relevant answer |
| الآيات / الحديث | Exact separate source records, quote type, reference, excerpt boundaries and attribution |
| روابط المصادر | Verify exact text/attribution against the linked primary reference before activation |
| Review metadata | Reviewer, date, approved version and boundaries; blank is draft, not approved |

Keep Quran verses and hadith excerpts distinguishable. The present corpus is hadith-only; do not put a verse under a hadith introduction. A link alone is not the usable text or approval. Conflicting, incomplete or unreviewed rows stay pending, with gaps reported to the team. Each religious meaning must link to the specific supporting record(s), and each application must respect the evidence's limits and safety policy.

For a small reviewed library, retain structured JSON and semantic selection with independent verification. The app now narrows the records before writing: a semantic classifier selects source IDs from a catalog, the server loads only those cards, and an independent audit checks their relevance. Measure recall/relevance as the reviewed library grows before introducing a vector database. A vector database by itself neither approves sources nor prevents hallucinations.

After import: test each intended meaning with child-language paraphrases, an ordinary follow-up, a simplification, a near-but-irrelevant topic, and a safety counterexample. Confirm no source leaks into unrelated small talk or a scope refusal. The scope map alone never authorizes a missing religious answer; useful ordinary friendship support can still be given without scripture.

## Review still needed now

Review the existing five source interpretations, fixed safety wording, social response wording and new fictional evaluation cases. Adult engineering checks do not establish religious approval or child usability. No real user conversation is stored by the app.
