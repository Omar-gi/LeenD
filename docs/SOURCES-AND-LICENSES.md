# Workbook source register — active V5

The only active religious corpus is `التصنيف إلى مجالات!A9:I15` (the blue **الخلاف مع الصديق** domain) in the team-supplied `لين_مرجع تصميم المنتج V1(2).xlsx`. The full workbook remains outside the repository. The selected cell values, hash and formatting-based selection are preserved in `src/content/workbook-snapshot.json`. The previous five Dorar cards are retired from runtime; earlier Git commits and evaluation reports are historical evidence only.

Workbook SHA-256: `183cca991598a43da7aa302e14db94899c2d3324fa17be3e48855794946aae36`.

| ID | Type | Excel quote / meaning / link | Exact displayed excerpt | Workbook reference |
|---|---|---|---|---|
| `conflict_anger_strength` | hadith | G13 / E13 / I13 | ليس الشديد بالصرعة، إنما الشديد الذي يملك نفسه عند الغضب | [متفق عليه — كما في الإكسل](https://shamela.ws/book/21550/3187) |
| `conflict_do_not_rage` | hadith | G13 / E13 / H13 | لا تغضب | [رواه البخاري — كما في الإكسل](https://shamela.ws/book/21550/3183) |
| `conflict_reconcile` | hadith | G15 / E15 / H15 | ألا أخبركم بأفضل من درجة الصيام والصلاة والصدقة؟ إصلاح ذات البين | [رواه أبو داود والترمذي — المقتطف كما في الإكسل](https://shamela.ws/book/21550/1956) |
| `conflict_check_facts` | quran | G10 / E10 / H10 | إِنَّ بَعْضَ الظَّنِّ إِثْمٌ | [الحجرات: 12](https://quranpedia.net/note/19030) |
| `conflict_restraint` | quran | F14 / E14 / H14 | والكاظمين الغيظ والعافين عن الناس والله يحب المحسنين | [آل عمران: 134](https://quranpedia.net/note/30051) |
| `conflict_no_estrangement` | hadith | G9 / E9 / H9 | لا يحل لمسلم أن يهجر أخاه فوق ثلاث ليال، يلتقيان فيصد هذا ويصد هذا، وخيرهما الذي يبدأ بالسلام | [أخرجه البخاري ومسلم — النص كما في الإكسل](https://shamela.ws/book/21659/13618) |
| `conflict_greet` | hadith | G11 / E11 / H11 | يلتقيان فيصد هذا ويصد هذا، وخيرهما الذي يبدأ بالسلام | [أخرجه البخاري ومسلم — المقتطف كما في الإكسل](https://shamela.ws/book/21659/13618) |
| `conflict_respect` | quran | F12 / E12 / H12 | وَلَوْ شَاءَ رَبُّكَ لَجَعَلَ النَّاسَ أُمَّةً وَاحِدَةً ۖ وَلَا يَزَالُونَ مُخْتَلِفِينَ | [هود: 118](https://quranpedia.net/note/50993) |

All excerpts occur verbatim within their recorded source cells; only surrounding prose and quotation delimiters are excluded. `permittedExplanation` preserves column E exactly except outer whitespace. Child/simple wording and contextual practical suggestions are adaptations for review, not additional scripture. The model cannot supply quotation words: the server fills the stored excerpt and its type-specific introduction. Keywords are selection hints, not automatic proof of relevance.

## Review discrepancies and limits

- G10 contains **Quran 49:12** in the hadith column. The app labels it Quran and never introduces it as a hadith. No replacement suspicion hadith is imported.
- G13 contains two distinct hadith excerpts. They have separate cards linked to H13 and I13 respectively.
- G9/G11 use the workbook wording `فيصد`. This has been preserved, not silently changed to another narration. A reviewer must check the linked edition and exact wording.
- G15 is a compact excerpt in the workbook; verify its excerpt boundaries and omitted narrative transitions against the linked text before approval.
- The selected references span multiple book URLs and Quran commentary pages. They have not been replaced by a guessed single-book source.
- The seven linked pages returned HTTP 403 to the local verifier; the web tool could not retrieve them either. **External verification is pending.** Exact agreement with Excel is tested; it is not proof that the spreadsheet's transcription, attribution or interpretation is correct.
- The application does not edit the original workbook or mark content approved. All eight cards, child wording and safety guidance remain draft. In particular, review the interpretation of Hud 118, the broad psychological wording in E13/E14, and safe limits on estrangement/reconciliation.

## Updating the team file

Use `scripts/import-team-workbook.py <explicit-workbook-path>` with Python/openpyxl. This read-only importer checks the selected domain/color, asserts each excerpt exists in its cell, and regenerates the active cards, scope and snapshot. It does not watch or sync the working sheet. A changed domain, quotation or cell layout requires explicit mapping review. Re-run `npm test`, the affected fictional cases, and rebuild after import. Review metadata must be set per card by the team, never inferred from a link or a passing test.

## Software and assets

| Item | Licence / provenance |
|---|---|
| New Leen application source | Copyright 2026 Leen contributors. No open-source redistribution licence has been selected by the owner yet; public visibility alone does not grant one. |
| Next.js, React / React DOM | MIT; upstream licences retained in dependencies |
| Zod, tsx | MIT; upstream licences retained in dependencies |
| TypeScript | Apache-2.0; upstream licence retained in dependency |
| lucide-react icons | ISC; upstream licence retained in dependency |
| Thmanyah Sans / Serif Display | Owner-supplied; proprietary [Thmanyah licence](https://font.thmanyah.com/licenses). Owner explicitly confirmed repository inclusion permission on 2 October 2026; unmodified files included on that basis. |
| App favicon / layout | Newly created text/vector/CSS |
| Leen character (`public/leen-character.png`) | Owner-supplied `Leenpossible logo.png`, incorporated at the owner's request on 4 October 2026, without image edits. Original creator/licence details were not supplied; no independent redistribution licence is asserted. |
| Character expressions (`public/leen-character-expressions.png`) | AI-generated derivative of the supplied character, made with Codex's built-in image generator on 4 October 2026 for the owner's requested animation. [Generation prompt and frame map](CHARACTER-ANIMATION.md). Original artwork rights remain applicable; no independent asset licence is asserted. |
| Team workbook V1(2), 5 October | Only the blue domain rows A9:I15 are imported, with exact cell provenance. Source rights remain with their respective holders; no website layout or bulk book is redistributed. |
| Product workbook / draft prompt | Team-supplied design input. Original copies remain outside the public repository; adapted behavior is documented in `docs/DIALOGUE.md`. Neither document is treated as approval of religious content. |
| ElevenLabs voice | Noorah (`ckaeRWMtCV0u0pUT3wX1`), selected by Omar on 2 October 2026 after audition; live synthesis passed with Starter. Rights and entitlement follow the voice/account's terms. Formal pronunciation review is pending. |
| Briefing documents | Owner-provided context; preserved outside the app repository, not redistributed |

`package-lock.json` pins installed versions and transitive dependencies. This register does not replace their upstream licence texts. Do not label proprietary font or provider assets as covered by an application code licence.
