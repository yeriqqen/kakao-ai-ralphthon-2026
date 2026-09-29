# V2 verification checkpoint

Updated on **2026-09-29 after the third actual laptop microphone rehearsal**. All institutions and business facts are fictional; no actual telephone calls were placed. OpenAI services and the microphone interaction described below were real. The overall live result remains **Partial / interrupted**.

| Evidence | Actual result | Limit |
| --- | --- | --- |
| Local code checks | 57 passed: 30 state, 12 plan guard, 15 preserved v1 | No microphone or real conversation proof |
| Local HTTP checks | 17 passed against the Node server | No upstream model or speech requests |
| Customer browser checks | 20 passed | Mocked API; real API, microphone, and audio flags are false |
| Business browser checks | 11 passed | Mocked HTTP, WebRTC, and microphone events |
| Build | Passed at the integration checkpoint | Build success does not establish product behavior |
| Archive checks | 7 passed on the tested package | A newly packaged archive needs its own check |
| Actual English chat | Real interview and four-question plan generated | Does not establish voice or all-language correctness |
| Actual Russian/Chinese chat | Both exercised; later Chinese run preserved Korean-insurance scope | Korean meaning and unsupported first-visit wording still limited; no blanket pass |
| Actual laptop microphone | Third run collected four Korean answers and readback | No new third-run audibility self-report; Korean audibility confirmed in first attempt |
| Confirmation | Four questions were resolved before readback, then all reset to unresolved after confirmation | Failed in the observed run; caused repetition and human disconnection |
| Unknown-detail relay | No unknown customer question occurred in the third run | Live relay Unverified |
| Normal completion | Third run ended as interrupted, not successful | Unverified |
| Final response | Reflected the interrupted conversation but exposed untranslated evidence details and duplicate recommendation text | Partial; localization and presentation defects |
| User value | No actual target-user feedback | Unverified |

## Actual rehearsal evidence

The third actual run is recorded in `artifacts/v2/live-native-rehearsal-third-attempt.json`; its expected-versus-actual audit is `artifacts/v2/live-native-third-attempt-audit.json` (14:42:47 KST audit). It used the real API, an accepted Realtime connection, and the laptop microphone. The teammate’s actual fictional business answers differed from optional role-play placeholders. The assistant’s readback preserved those answers, including cost uncertainty.

All four required questions were observed resolved before the confirmation step. The confirmation reset them, so the assistant repeated questions and the teammate disconnected. The final state was interrupted with all four questions unresolved and success false. No live unknown-detail relay occurred. This supports a Partial result, not an end-to-end pass.

Subsequent code changes add exact readback citations and preserve an answer snapshot through confirmation. Local tests cover these guards, but the observed third run did not contain those later changes. Another real rehearsal is needed to verify their effect on microphone interaction.

Actual language evidence includes `artifacts/v2/live-language-source-guard-check.json` and `artifacts/v2/live-zh-insurance-scope-check-three-turn.json`. Historical failures remain failures even after later repairs. The initial successful English turn is separately recorded in `artifacts/v2/live-api-recheck.json` at 14:06:39 KST.

## Reproducible synthetic evidence

Run `node scripts/v2-customer-ui-check.mjs` from the project root using the existing Playwright installation. It accepts `PLAYWRIGHT_MODULE` and `CHROME_EXECUTABLE` when paths differ, installs nothing, blocks external requests, and uses a fresh isolated browser profile.

The report is `artifacts/v2/customer-ui-check.json`: **20 passed**, `mock: true`, and real API/microphone/audio verification explicitly false. The screenshots are `artifacts/v2/customer-ui-en.png`, `customer-ui-ru.png`, and `customer-ui-zh.png`. They illustrate tested UI states, not successful real model output.

## Remaining acceptance work

Repeat the actual accepted laptop conversation after the latest changes. Include a business question about information the interview has not already collected. Observe the customer-language question, actual customer reply, Korean relay, preserved business answers, and confirmed completion or an explicit incomplete decision. Compare the final localized result with what was actually said. Do not substitute synthetic fixtures, typed transcripts, or successful tests for this run.

The role-play inputs in `docs/v2-demo-placeholders.md` are optional, team-authorized fictional data, not app defaults or verified facts. Preserve actual role-play answers even when they differ. Keep secrets and raw prompts/session logs out of the submission.
