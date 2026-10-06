# Response delivery and presentation — 6 October 2026

Visible references show religious attribution or the value title, quotation and supplied link. Workbook names, cells, import boundaries and editing commentary stay server-side. The turn endpoint returns only public citation fields. User-facing parent wording explains browser storage and deletion without developer terminology; AI voice/provider processing, scope and pending human review remain disclosed.

Validated replies now use ElevenLabs MP3 streaming via `/api/speech`. The source/relevance audit still completes before speech. A short-lived AES-GCM ticket carries the validated answer encrypted; no plaintext answer appears in the URL and no server content cache is created. Tickets expire after 15 minutes; old replay links can expire, and the written answer remains available. The speech endpoint has separate concurrency and hourly/daily caps, including replay requests. Stop playback cancels the media resource. Prepared social clips still bypass synthesis.

The character uses its CSS talking animation during streaming; it never makes a second request for audio analysis. Existing nonstreaming assets retain amplitude animation. Native MP3 buffering differs by browser. This change removes the full-file generation/base64 wait but does not remove transcription, routing, writing or audit latency. No numerical improvement is claimed.

Expanded workbook meanings are sent once to routing. Writing/review receives a compact domain map and selected cards; duplicate unrelated meanings and citation metadata are omitted from review input. No model change or source validation bypass was made. Plan B remains unimplemented: it may improve supported coverage, but another lookup does not guarantee faster answers.

API reference: [ElevenLabs stream speech](https://elevenlabs.io/docs/api-reference/text-to-speech/stream).
