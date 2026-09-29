# PR #1 review and rehearsal — 2026-09-29

PR: https://github.com/yeriqqen/kakao-ai-ralphthon-2026/pull/1
Branch: `feat/v2-design-integration`, original head `a071f50`, functional base `62f9a09`.
Newer local work was preserved first on `codex/pre-pr1-checkpoint` at `eb4e5ce`, then carried onto this branch as `ea7d30f`. The local `.env` stays ignored. V1 is preserved.

## Findings and repairs

- **Voice turn ordering:** consecutive speech fragments could queue multiple replies; generation completion could precede playback start and incorrectly release the microphone. Playback now drains by response ID, adjacent reviews coalesce, and an ongoing second utterance blocks the next response without truncating capture. A server-provided known answer gets one continuation.
- **Missed business question:** the third PR microphone run captured the alternative-color question, but Realtime skipped its relay tool. The server's semantic review now extracts explicit customer questions with exact transcript evidence, checks known information, and opens an unknown-detail relay before continuing. Later voice-tool requests reuse the same pending question.
- **Readback confirmation rejected at the HTTP boundary:** the transcript route passed the original request object into the state validator, omitting the saved `callId`. Its same-call check therefore rejected valid confirmations even though isolated state replays passed. The route now passes the persisted transcript record. A full HTTP regression covers required answers, refusal of early completion, saved readback evidence, accepted confirmation, completion, and final summary.
- **Repeated questions:** continuation control now selects the next unresolved question explicitly, prohibits recollecting resolved answers, distinguishes clarification from confirmation, and requests completion once the server validates the full readback. The original third run's pickup transcript was ambiguous, so it remained unresolved even while the voice assistant claimed to understand it. This mismatch is a recorded failure; targeted control requires another live test.
- **Unsupported facts:** greetings, apologies, and incomplete speech must not resolve stock/price. Intent guards and a fragment clarification instruction were added. Recorded real API replays retain no facts for the greeting, apology, or isolated “now.” These are bounded regressions, not a guarantee of model reliability.
- **Transcription prompt leakage:** an actual transcript repeated the transcription instruction. That prompt was removed; the Korean language setting and existing transcription model remain.
- **Customer detail context:** generated localized category labels now survive planning, state, UI, and summary, so a value such as “required” keeps its meaning.
- **Packaged design:** the runnable archive now includes the PR's self-hosted WOFF2 font, served with `font/woff2`.

## Actual live results

All three PR attempts used the real local OpenAI configuration, customer UI, Chrome business microphone, and fictional shop information. No business speech was injected. The operator ended each call.

| Run | Actual result | Evidence |
| --- | --- | --- |
| First PR run, ended 15:27 | Opening output events; stock available, price ₩10,000, pickup by 19:00; interrupted summary preserved those answers. No relay or valid completion. A later transcript repeated its own transcription prompt. | `artifacts/v2/pr1-live-shop-rehearsal.json` |
| Second, ended 15:33 | Opening followed by only “지금” (“now”); the reviewer wrongly inferred stock before disconnection. Original failure preserved. Later one-request replay treats it as unclear. | `pr1-live-shop-second-rehearsal.json`, `pr1-fragment-review-replay.json` |
| Third, ended 15:37 | Navy unavailable and an explicit alternative-color question; question was skipped. Price ₩10,000 regardless of color. Pickup transcript ambiguous, repeated questions/readbacks, interrupted outcome. A Korean parenthetical in the stock answer caused the summary's language guard to withhold that answer. | `pr1-live-shop-third-rehearsal.json` |

The user reported repeated questions and the ignored business question. Human audibility was not separately recorded for these PR runs. An earlier short hospital attempt had human-confirmed audible Korean. **No complete live customer → voice → relay → final completion flow has passed.** Target-user value and two-phone connectivity remain unverified; the authorized demo uses two tabs on this laptop.

A three-request real API replay of the third run's actual business question correctly detects unknown alternative-color acceptance, opens an English relay, blocks completion while waiting, and translates the authorized placeholder reply to Korean with waterproof/about-20-liter conditions intact. See `artifacts/v2/pr1-recorded-question-relay-replay.json`. It reconstructs an isolated active room and uses synthetic customer text; it is not new microphone or audible-return evidence.

## Verification and next run

- `npm test`: 64 unit tests.
- `npm run test:http`: 30 real localhost checks with mocked upstream AI; no external network/audio.
- `npm run test:customer`: 20 mocked browser checks.
- `npm run test:business`: 16 mocked browser checks.
- `CHROME_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:ui`: 32 design checks, all three languages, 320–1440 pixels.
- `npm run build`; `python3 scripts/package-v2.py --smoke`: build passed; 8/8 extracted archive checks passed, including font serving.

Run `npm start`, open http://localhost:4173, prepare the fictional shop plan, authorize it, and open its business link. The teammate accepts and asks whether another color is acceptable immediately after the opening. Customer placeholder: “Black is fine, as long as it is waterproof and about 20 liters.” Then provide clear stock/price/pickup answers and confirm the final readback. Compare the final summary with the actual utterances. Do not label replays or mocked checks as a successful live run.

No PR merge, public deployment, or official submission was performed. The older PDF/PPTX are explicitly dated partial-live checkpoints and do not establish acceptance of these later repairs.
