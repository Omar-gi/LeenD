# Active team content and future handoff

The updated workbook now includes the detailed classification table. The active selection is **الخلاف مع الصديق**, the blue `التصنيف إلى مجالات!A9:I15` block. It covers four branches (خصام، اختلاف الرأي، الغضب، الإصلاح بين المتخاصمين), seven value rows and eight quotation records. All other workbook domains remain inactive for the hackathon demo.

Column C supplies child-language matching hints. D labels the value. E is the main meaning and is preserved in each card. F/G supply exact Quran/hadith excerpts; H/I supply the only reference links. G10 is classified as Quran despite its column placement. No retired source is retained as a fallback. The model can adapt the practical wording to the context, but cannot import a religious text, claim or reference from memory.

The source register lists every active output excerpt and its cells: [SOURCES-AND-LICENSES.md](SOURCES-AND-LICENSES.md). The original workbook is unchanged. `src/content/workbook-snapshot.json` preserves only the selected block, filename, hash, and import notes. `scripts/import-team-workbook.py` reproduces the mapping. A new downloaded export is a new version; changes do not sync automatically.

Review exact quotations/attributions, their type, the column-E meanings, short child/simple adaptations, and safety wording. Links could not be independently fetched (HTTP 403), so matching Excel must not be presented as external verification. In particular review G9/G11 wording, G15 excerpt boundaries, G10's column correction and the interpretation in E12–E14. All cards remain draft until human review is recorded.

Test each reviewed value with a direct scenario, a negated keyword, a follow-up, simplification, a near-but-irrelevant request, and a safety counterexample. Keep fictional evaluation data separate from real conversations. An unavailable adult needs a feasible changed next step; ordinary conflict does not automatically require adult intervention, while unresolved danger still requires real-world assistance.
