# V2 verification checkpoint

Updated on **2026-09-29 after the actual shop attempt ended at 15:15:45 KST**. The new opening was received, but the call remained incomplete and human audibility is unconfirmed. The check counts below describe the preceding 15:08 KST implementation checkpoint, before the latest repairs. All institutions and business facts are fictional; no actual telephone calls were placed. OpenAI services and the microphone interaction described below were real. The overall live result remains **Partial / interrupted**.

| Evidence | Actual result | Limit |
| --- | --- | --- |
| Local code checks | 63 passed: 31 state, 17 plan/summary guard, 15 preserved v1 | No microphone or real conversation proof |
| Local HTTP checks | 23 passed against the real local Node server, with synthetic setup plans | All upstream network blocked; no model or speech requests |
| Customer browser checks | 20 passed | Mocked API; real API, microphone, and audio flags are false |
| Business browser checks | 14 passed, including startup readiness, silent opening and autoplay refusal | Mocked HTTP, WebRTC, and microphone events |
| Build | Passed at the integration checkpoint | Build success does not establish product behavior |
| Runnable archive checks | 7 passed on the tested package | A newly packaged archive needs its own check |
| Actual English chat | Real interview and four-question plan generated | Does not establish voice or all-language correctness |
| Actual Russian/Chinese chat | Both exercised; later Chinese run preserved Korean-insurance scope | Korean meaning and unsupported first-visit wording still limited; no blanket pass |
| Actual laptop microphone | Third run collected four Korean answers and readback | No new third-run audibility self-report; Korean audibility confirmed in first attempt |
| Confirmation | Four questions were resolved before readback, then all reset to unresolved after confirmation | Failed in the observed run; caused repetition and human disconnection |
| Unknown-detail relay | No unknown customer question occurred in the third run | Live relay Unverified |
| Normal completion | Third run ended as interrupted, not successful | Unverified |
| Historical final response | Interrupted conversation output exposed untranslated evidence details and duplicate recommendation text | Historical failure retained |
| Current typed-advice replay | 9/9 checks passed with one real provider response on retained third-call answers | Original interrupted outcome and uncertain price preserved; no new speech or completed call |
| Real shop interview | Two customer turns and six real provider responses prepared stock, price and evening pickup questions | Price wording presupposes “available”; all business answers unresolved, no audio |
| Actual shop opening | Opening requested at 15:12:18.940 KST; output started at 15:12:19.502; full greeting and stock question transcribed | Human audibility Unverified; an output event is not a human hearing confirmation |
| Latest shop review and microphone | Greeting/apology wrongly marked stock negative and price unavailable; consecutive responses left the microphone paused; operator ended at 15:15:45 | Factual review failed; live relay and normal completion Unverified |
| User value | No actual target-user feedback | Unverified |

## Actual rehearsal evidence

The third actual run is recorded in `artifacts/v2/live-native-rehearsal-third-attempt.json`; its expected-versus-actual audit is `artifacts/v2/live-native-third-attempt-audit.json` (14:42:47 KST audit). It used the real API, an accepted Realtime connection, and the laptop microphone. The teammate’s actual fictional business answers differed from optional role-play placeholders. The assistant’s readback preserved those answers, including cost uncertainty.

All four required questions were observed resolved before the confirmation step. The confirmation reset them, so the assistant repeated questions and the teammate disconnected. The final state was interrupted with all four questions unresolved and success false. No live unknown-detail relay occurred. This supports a Partial result, not an end-to-end pass.

Subsequent code changes add exact readback citations and preserve an answer snapshot through confirmation. Local tests cover these guards, but the observed third run did not contain those later changes. Another real rehearsal is needed to verify their effect on microphone interaction.

Actual language evidence includes `artifacts/v2/live-language-source-guard-check.json` and `artifacts/v2/live-zh-insurance-scope-check-three-turn.json`. Historical failures remain failures even after later repairs. The initial successful English turn is separately recorded in `artifacts/v2/live-api-recheck.json` at 14:06:39 KST.

## Current startup and summary changes

The opening waits for a created Realtime session, remote audio track and registered connection. It sends one tool-free Korean opening and keeps the microphone paused until matching playback finishes and browser playback is permitted. Automatic speech interruption is disabled. A 12-second no-opening deadline fails explicitly with retry guidance; sanitized diagnostics preserve startup events. The new opening was exercised in the actual shop attempt: output audio and the full opening transcript were received. Human audibility is not confirmed. The later microphone stall means this is not a successful sustained-flow verification.

The app now groups validated AI-extracted answers deterministically. Real AI chooses a constrained recommendation action and references to existing answer IDs; the app renders those choices without adding factual prose. Earlier free-prose advice strengthened the uncertain price and introduced an unsupported provider comparison. Those failures are preserved. `artifacts/v2/recorded-third-typed-summary-check.json` passed 9/9 checks with one real provider request, keeping all four answers, “may exceed 100,000 KRW,” and the original interrupted outcome. This is a recorded-text regression, not a new microphone test.

The actual shop interview is recorded in `artifacts/v2/live-shop-plan-check.json`. It preserves the navy waterproof daypack, about 20 litres, any brand and evening pickup constraints, with Korean question coverage. The word “available” in its price question presupposes stock before a business reply; it is not inventory evidence. Alternate-color willingness stays unknown. The separate actual Chrome shop attempt is preserved in `artifacts/v2/live-shop-first-attempt.json`. It accepted and received an opening, then transcribed only a greeting and apology. Neither established stock or price, yet semantic review marked negative stock and unavailable price as resolved, and the final summary repeated those unsupported answers. Consecutive responses left the microphone paused; the operator disconnected at 15:15:45 KST. The observed outcome is Partial / interrupted with a factual-review failure. Repairs must be tested separately; do not treat the recorded stock or price as valid business facts.

## Reproducible synthetic evidence

Run `node scripts/v2-customer-ui-check.mjs` from the project root using the existing Playwright installation. It accepts `PLAYWRIGHT_MODULE` and `CHROME_EXECUTABLE` when paths differ, installs nothing, blocks external requests, and uses a fresh isolated browser profile.

The report is `artifacts/v2/customer-ui-check.json`: **20 passed**, `mock: true`, and real API/microphone/audio verification explicitly false. The screenshots are `artifacts/v2/customer-ui-en.png`, `customer-ui-ru.png`, and `customer-ui-zh.png`. They illustrate tested UI states, not successful real model output.

## Remaining acceptance work

Repeat the actual accepted laptop conversation after the latest changes. Include a business question about information the interview has not already collected. Observe the customer-language question, actual customer reply, Korean relay, preserved business answers, and confirmed completion or an explicit incomplete decision. Compare the final localized result with what was actually said. Do not substitute synthetic fixtures, typed transcripts, or successful tests for this run.

The role-play inputs in `docs/v2-demo-placeholders.md` and `docs/v2-shop-demo.md` are optional, team-authorized fictional data, not app defaults or verified facts. Preserve actual role-play answers even when they differ. Keep secrets and raw prompts/session logs out of the submission.
