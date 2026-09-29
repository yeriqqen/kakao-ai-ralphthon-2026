# Korean clinic presentation checkpoint

Use `feat/v2-design-integration`, the head of PR #1. At this checkpoint PR #1 remains a draft and `main` is unchanged. Teammate fixes through `7b7c42c` are preserved; `6def440` adds concise results and bounded voice shutdown.

## Changes

- Customer replies ask one focused question; exact customer qualifiers remain required.
- The summary displays evidence-backed answers and the next step first. The full record, reasoning and export are expandable. Unresolved questions remain visible.
- Demo setup instructions are collapsed, repeated live relay questions are removed, and newly arriving messages animate once with reduced-motion support.
- After all answers and readback are validated, the next Realtime response is forced to request `complete_call`. The server still decides whether completion is allowed.
- An authorized goodbye closes the peer and microphone on the matching `output_audio_buffer.stopped` event. A stalled farewell transcript save cannot keep local media open. An eight-second fallback closes already-completed calls if the final event never arrives. Incomplete calls are never made successful by this timeout.
- The teammate's playback ordering, business-speech gates, server-detected customer relay, localized customer labels, and saved transcript metadata fixes remain intact.

The Realtime event distinction was checked against the [OpenAI server event reference](https://platform.openai.com/docs/api-reference/realtime-server-events/input_audio_buffer/committed?lang=node): generation completion and audio drain are separate events.

## Validation

64 unit tests, 30 local HTTP checks, 20 customer UI checks, 19 business UI checks and 32 design checks passed (165 total); the build also passed. Browser and HTTP checks use synthetic provider/media events and cannot establish live audio success. The business regressions cover delayed playback, speech fragments, forced completion, stalled farewell saving, missing goodbye events and explicit local media release.

Latest reports are in `artifacts/v2-design/functional/` and `artifacts/v2-design/results.json`. Prior actual voice evidence remains unchanged. The latest complete microphone flow must be rehearsed on the friend's configured laptop.

## Presentation

Use `submission/final-ko/YOKOBU-Korean-Pitch.pptx` or its PDF backup. Five slides match the app's warm white and olive theme. The PPTX includes Korean speaker notes; `YOKOBU-Rehearsal-KO.md` includes the timed three-minute script, startup instructions, clinic roleplay, fallback line and likely questions.

Screenshots are explicitly labeled prepared examples from synthetic UI fixtures. They do not claim a completed real voice call. The current app contacts no real institution, performs no live institution search and confirms no real booking.

The local preview restart was blocked by automatic approval review. The presentation laptop must restart `npm start` after pulling the branch. No API key is included in the presentation or repository.
