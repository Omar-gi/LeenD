# Dialogue behavior

The app uses its own Saudi Arabic dialogue policy in `src/lib/prompts/leen.ts`; the original HTML draft is not loaded at runtime. Scope is limited to the four workbook domains listed in the README, plus brief social conversation and safety help.

Recognized greetings and closings, including combined phrases, receive short source-free replies. A remaining substantive request follows normal routing. Safety is checked before social replies, so a greeting cannot hide a direct threat.

The classifier considers the current question and bounded session history, selects categories and matching records, then the server enforces category/source and Quran/hadith type restrictions. The writer receives only selected records; exact quotations and short meanings are filled from stored content. An independent model call checks the answer, with at most one repair. These checks reduce errors but do not eliminate them.

Answers normally give a conclusion and a practical option without questions. At most one indispensable ordinary clarification is allowed; safety may override that limit. Unclear feelings receive tentative language rather than diagnoses or assigned emotions. Follow-ups and simplifications do not routinely add new scripture.

Ordinary disagreements do not automatically require an adult referral. Failed attempts to contact an adult receive a changed practical step. Unresolved danger still calls for real-world assistance, without claiming the app can contact anyone. Forgiveness and restored closeness are never compulsory.

The character follows recording and playback state. Its expressive mouth animation is not phoneme-level lip synchronization. The microphone opens only on user action. See [character assets](CHARACTER-ANIMATION.md), [privacy](PRIVACY-AND-LIMITS.md) and [evaluation](../evaluation/RESULTS.md).
