# Current text model — 6 October 2026

Local configuration and the default template now use `gpt-6-luna` for routing, answer writing and independent grounding. Responses requests explicitly set `reasoning.effort: "none"`; they retain strict JSON schemas and `store:false`. Transcription and Noorah speech are unchanged. Setting `OPENAI_TEXT_MODEL=gpt-4.1-mini` remains a rollback option; Luna-specific reasoning settings are omitted for that model.

Migration verification: build succeeded and Luna accepted the API/schema configuration. The first full request failed. Subsequent inspection showed a format repair and a brevity rejection on a fictional jealousy scenario. Prompt instructions were aligned to one practical segment plus the stored meaning/quotation; the repeated scenario returned FULL, grounded=true, with `comparison_gratitude` and its exact stored excerpt. This is a targeted compatibility check, not a full model-quality evaluation or measured speed improvement. No production deployment has been made.

References: [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [migration parameters](https://developers.openai.com/api/docs/guides/latest-model).
