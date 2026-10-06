# Content handoff

The active source is the team workbook V1(3), sheet `التصنيف إلى مجالات`, rows A2:I24. It covers four domains: اختيار الصديق، الخلاف مع الصديق، الغيرة والمقارنة، الاستبعاد والتنمر, with 23 value rows and 32 excerpts.

Column C contains child-language keyword hints; D labels the value; E supplies its main meaning; F/G contain scripture; H/I contain the team's reference links. Keywords do not override context, negation or speaker roles. The team confirmed the supplied links on 6 October. Independent page-to-excerpt and explanation review remain separate and pending. G10 contains Quran despite being in the hadith column.

`src/content/workbook-snapshot.json` records selected cells and the workbook hash. `scripts/import-team-workbook.py` reads an explicit local export without editing it; changes require a reviewed re-import and tests. There is no automatic spreadsheet sync or runtime web retrieval.

Review each exact excerpt, type, meaning, child wording and safety boundary before approving a card. Test direct scenarios, negated keywords, follow-ups, simplification and danger. See [source register](SOURCES-AND-LICENSES.md), [review checklist](CONTENT-REVIEW.md) and [results](../evaluation/RESULTS.md).
