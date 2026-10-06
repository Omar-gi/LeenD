# Leen character animation — 4 October 2026

The conversation uses `public/leen-character-expressions.png`, a transparent 2×2 sprite created from the owner's `Leenpossible logo.png` using Codex's built-in image generation tool. The original `public/leen-character.png` is preserved for the introduction. No external avatar service, additional runtime provider or microphone analyser is used.

| Frame | Expression |
|---|---|
| Top left | Resting closed smile; also used while thinking |
| Top right | Attentive listening, hand by head |
| Bottom left | Speaking pose, closed mouth |
| Bottom right | Speaking pose, open mouth |

`src/app/leen-character.tsx` decodes a separate silent copy of the reply with OfflineAudioContext and calculates amplitude in 50 ms windows. The native HTML audio element handles audible playback without being rerouted through Web Audio. This avoids switching the audio output path after speech starts. A smoothed level drives the glow/scale and open/closed mouth, with hysteresis and a 95 ms minimum hold. It follows speech energy, not phonemes or exact Arabic lip movements. CSS provides a talking fallback if decoding fails. The real recording/playback state controls the pose; end/stop cancels decoding and removes animation data. Reduced-motion preferences retain static expressions without decorative motion.

6 October playback investigation: the prepared greeting MP3 decoded successfully, with peak level −3.64 dBFS (no full-scale clipping in that sample). This does not establish perceptual voice quality or prove the cause of reported static; the original affected replies were not available. The playback-path fix removes a concrete interference risk while keeping the chosen voice/model unchanged.

## Exact generation prompt

Input: the supplied character image. Output: one PNG, transparent background enabled. Mode: built-in image generation, image edit.

> Use case: identity-preserve. Edit target: supplied blue Leen mascot image. Create ONE production PNG sprite sheet for a friendly Arabic voice assistant. Square canvas divided into an exact invisible 2 by 2 grid of equal square cells. TRANSPARENT alpha background everywhere outside the four mascots; remove the nursery, bear, floor and all scenery. No labels, letters, cell borders, shadows on a ground plane, watermarks or decorative extras. Preserve the exact light-blue pearlescent droplet character identity, curled tip, big glossy navy eyes, pink cheeks, little arms, soft 3D lighting and original small floating blue star in every frame. Entire character and star fit within each cell with consistent 10% safe padding. Place each at the EXACT same scale and centered anchor in its cell for CSS animation. TOP LEFT: resting, gentle small CLOSED smile, arms relaxed. TOP RIGHT: listening attentively, CLOSED smile, subtle curious head tilt and one little hand near the side of the head as if listening. BOTTOM LEFT: speaking pose facing front, small CLOSED smile, arms slightly open. BOTTOM RIGHT: EXACT SAME body, eyes, arms, tip, star, alignment and size as bottom-left, change ONLY the mouth to a rounded OPEN speaking smile with visible pink inside. Bottom two cells are two frames of a mouth animation and must align perfectly. High quality clean edges on genuine transparent alpha; keep the recognizable original mascot rather than redesigning it.
