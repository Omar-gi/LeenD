# Privacy and reliability limits

The hackathon interface is restricted by acknowledgement to adults using fictional scenarios. It does not verify age. The acknowledgement alone is not a child-safety, parental-consent, privacy or regulatory compliance system. Real child deployment requires a separate review of provider policies and data handling before access is expanded.

## Data flow

Recording starts only after the microphone button and browser permission. A MediaRecorder buffer is kept in memory and submitted once stopped; tracks are stopped. The application server forwards audio to OpenAI, then uses the transcript and bounded session history to generate and audit the answer. It sends the answer text to ElevenLabs only when spoken responses are enabled. Reply audio is an in-memory browser Blob URL, revoked on removal/end session. Ending a session also aborts in-flight work and prevents late responses from repopulating the screen.

No application audio/transcript files, database, cookies or browser localStorage are created. The server code avoids content logs. OpenAI Responses calls set `store:false`; audio endpoints have different controls. OpenAI and ElevenLabs can process/retain data under their own policies and account settings. Ending a browser session does not delete provider records. The UI discloses that distinction. Do not claim zero data retention without confirming the relevant provider eligibility and settings.

The evaluation runner is an explicit exception for **predefined fictional test fixtures only**: it writes its synthetic questions/answers into evaluation reports. Do not replace those fixtures with actual user conversations.

## Grounding and safety

- The whole five-card draft library is provided to generation and independent verification. No retrieval database, browsing or training occurs.
- The server rejects unknown source IDs, inserts exact stored excerpts, forbids free-form quotation attribution and checks structure. A second model audits every ordinary answer. Both model passes may make mistakes; agreement does not prove religious correctness.
- A conservative direct-threat detector and a model safety classification route to fixed draft safety wording. This is not a comprehensive threat-detection system. Negated/fictional mentions may trigger an extra clarification. Semantic failures and omissions require manual evaluation.
- Unsupported ordinary religious guidance returns a transparent limitation instead of being spoken as a validated claim.
- Explicit individual-faith questions and context-free ambiguous statements also have deterministic boundaries. If a generated reply repeats advice the user says already failed, a source-linked draft next-step fallback recommends trusted adult support. An earlier assistant suggestion is not treated as a completed user action. These limited pattern checks do not cover every paraphrase.
- Source cards and safety text are drafts until a human reviewer signs off. A source link alone is not approval of every explanation.
- Ordinary dialogue defaults to an answer without questions. A server check limits ordinary clarification to one within the bounded history and checks common question forms; quoted sample phrases and safety guidance are handled separately. The model still determines semantic necessity and can make mistakes. A repeated violation gets a declarative limitation, not another question.

## Operational bounds

Recordings stop at 30 seconds in the UI. The API checks the declared duration and a 3 MiB body cap; it does not independently decode duration, so a hostile custom client could lie about duration. This needs server media validation before opening to sustained untrusted traffic. Signed history prevents clients from inventing an assistant reply, but it is not authentication, and valid receipts can be replayed. Rate limits are shared by a single process, reset after restart, and can affect all demo users. Use provider financial controls as well.

Two model calls before speech favor reviewability over minimum latency. Timeouts bound provider work; text remains available if TTS fails. There is no guaranteed latency until measured on the deployed network and selected voice. No automated system in this repository contacts parents, teachers or emergency services.

Provider references: [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data), [OpenAI under-18 guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance), [ElevenLabs privacy](https://elevenlabs.io/privacy-policy).
