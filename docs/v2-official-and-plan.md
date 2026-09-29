# YOKOBU v2 — official requirements and acceptance plan

Checkpoint: **2026-09-29 13:45:13 KST**. The public official deadline remains **2026-09-29 16:30 KST**, leaving **2 hours 44 minutes 47 seconds** at this checkpoint. Recheck the clock before a later handoff. Changes announced only on site remain **Unconfirmed**.

## Current authorized scope

Upgrade the existing YOKOBU with real OpenAI-generated customer chat and Korean OpenAI Realtime conversation. The customer can complete their side entirely through text. Default language is English; English, Russian, and Chinese must cover the entire customer interface, AI conversation, errors, call state, relay, and result.

The latest user instruction is **“just simulate it on this laptop.”** This replaces the earlier two-phone device arrangement for this run. Use separate customer and business tabs on the same laptop, backed by shared call state. Keep actual microphone capture and audible Korean Realtime output as required live checks. A successful same-laptop check must not be described as a two-phone verification.

Institutions and calls are fictional/simulated. AI generation must use real OpenAI services to satisfy v2. Actual telephone calls, real institution discovery, and Korean reception/doctor sheets are outside v2 scope. No public deployment or external submission is authorized by this work.

## Official submission requirements reverified

The [official participant page](https://ralphthon.org/kakao-ai-dot-2026) was read in an actual Chrome tab at approximately 13:45 KST on 2026-09-29. Direct web-tool requests and an HTTP fetch were inaccessible/403, so the visible official page was used for the independent recheck. It still specifies:

- Team representative submits by **16:30 KST on September 29, 2026**.
- Written description of the customer and problem.
- Description of the completed solution.
- Required presentation PDF, **no more than five pages**.
- Short explanation of how Codex was used.
- Do **not** upload original prompts or Codex session logs.

The participant page's submission link was followed to the [official submission application](https://ralphthon.org/kakao-ai-dot-2026/app). The current unauthenticated page displays invited-account login and links to the [one-page final judging preparation guide](https://ralphthon.org/kakao-ai-dot-2026/student-preparation.pdf). Its visible guidance calls for a three-minute explanation of the problem, core user flow, AI delegation, and checking the AI's result. No login, credential entry, file upload, or submission was performed.

Authenticated form fields, upload-size limits, supplementary ZIP acceptance, team login readiness, and submission receipt remain **Unconfirmed**. The public pages show no visible update timestamp; this is an observation of the pages at the checkpoint, not a guarantee against later organizer changes.

The official participant schedule still lists:

| KST on September 29 | Activity |
| --- | --- |
| 10:30–12:00 | Ralph Loop preparation |
| 12:00–13:30 | First Ralph Loop with meal and mentoring |
| 13:30–15:30 | Second Ralph Run |
| 15:30–16:30 | Verification and final submission preparation |
| Before 16:00 | Check presenter, laptop, and demo |
| 16:30 | Final submission deadline |
| 16:30–17:10 | Group judging, eight-minute team slots |
| 17:40–18:20 | Four finalist presentations, ten minutes per team |
| 19:00 | Event ends |

Prior v1 research is preserved in [official-instructions.md](official-instructions.md). After 15:30 prioritize the core-flow rerun, evidence preservation, and the presentation. Do not plan implementation past 16:30 without a new explicit team time boundary.

## Starting state and evidence separation

The intended working folder is the existing `kakao-ai-ralphthon-2026` project. Its prior implementation, tests, artifacts, and local edits were inspected. The working tree already contained changes to README/demo instructions/packages plus the pronunciation guide; those are preserved. No `AGENTS.md` was found in the project file inventory at this check.

V1 remains a deliberately limited deterministic Korean/Russian simulation, with browser speech APIs and synthetic evidence. Its 15 state/parser tests, 14 expected-versus-actual checks, and recorded browser checks do not establish real OpenAI generation, actual microphone recognition, or audible Realtime output. V1's separate browser speech-completion event does not prove a person heard speech.

Preserve these historical files and clearly separate any new v2 artifacts:

- `public/engine.js`, `tests/engine.test.js`, and the existing v1 UI/code.
- `artifacts/expected-vs-actual.json`, `artifacts/browser-results.json`, and v1 screenshots.
- `docs/verification.md`, `docs/final-report.md`, and `docs/demo-guide.md`.
- Existing runnable and submission archives and source materials; do not overwrite historical evidence with claims about v2.
- V1 Korean sheets remain historical v1 output; they are not part of the v2 user flow or v2 acceptance.

The supplied v2 brief contains no visible credentials or real patient identifiers. Use fictional details for live tests. At the checkpoint, a local `.env` file exists and the `OPENAI_API_KEY` entry is nonempty; the process-level variable was absent. Only presence booleans were inspected. **Credential validity, API access, model availability, billing readiness, and successful calls remain Unconfirmed until the authorized backend test.** No secret value was displayed, logged, or added to this document, and no API request was made by this verification subtask.

## Acceptance matrix

All v2 results below start **Unverified**. Passing unit tests can establish state-machine invariants; they cannot establish model quality, actual audio, or user value. Record live API evidence separately from injected events and mock model responses.

| ID | Required behavior | Verification and evidence to preserve | Initial status |
| --- | --- | --- | --- |
| V2-01 | English is the initial customer language. | Fresh customer tab; visible controls, placeholder, and opening message. | Unverified |
| V2-02 | English, Russian, and Chinese consistently localize customer UI and AI output. | Run each selection; inspect controls, errors, pending/active/ended states, relay, summary, recommendation. Korean business speech stays in its separate tab. | Unverified |
| V2-03 | “I want to go to a hospital” begins a real AI interview. | Save actual request, model response, and clarifying turns with real API provenance and without credentials. | Unverified |
| V2-04 | Previously supplied details are reused. | Provide fictional age/symptom/insurance in chat; ask a covered Korean business question; verify the answer uses the collected detail without a redundant customer relay. | Unverified |
| V2-05 | Reliable general guidance is distinguished from current business facts. | Inspect actual interview and generated plan; availability, prices, and current waits require business evidence. | Unverified |
| V2-06 | Fictional institution suggestions and required questions are generated for the actual conversation. | Save institution labels and generated required-question list before authorization; no fixed six-fact clinic answer template. | Unverified |
| V2-07 | Customer authorization is explicit. | No incoming call/voice before localized Yes; authorization creates a pending incoming simulated call. Unit-test invalid transitions. | Unverified |
| V2-08 | Business acceptance gates voice. | Business tab inactive without incoming call; Accept call visible only while pending; Realtime starts only after acceptance. | Unverified |
| V2-09 | Both same-laptop tabs share the correct call lifecycle. | Observe pending, connecting, active, interrupted, and ended states; preserve room ID and timestamps without secrets. | Unverified |
| V2-10 | Real microphone and audible Korean Realtime output work. | Teammate uses laptop mic; record actual transcription and connection events, and a person's explicit audibility observation. API events alone are insufficient. | Unverified |
| V2-11 | Green indicator reflects a currently active connection. | It becomes active only after authorized/accepted connection and clears on disconnect/end/failure. State unit tests plus browser observation. | Unverified |
| V2-12 | A genuinely unknown customer detail triggers chat relay. | Choose a detail absent from the actual interview; save Korean business question, localized customer relay, typed answer, and Korean response. | Unverified |
| V2-13 | Missing customer response pauses without invention. | Leave a relay unanswered; verify unknown stays unresolved and assistant asks how to proceed instead of claiming success. | Unverified |
| V2-14 | Confirmed answers are supported by the business transcript. | Match each fact's evidence quote to actual business transcript text; customer/assistant assertions alone cannot confirm business facts. Unit tests for fabricated or missing evidence. | Unverified |
| V2-15 | Unclear or unavailable answers do not complete required questions. | Use an ambiguous answer or refusal; verify unresolved status and a localized customer decision request. | Unverified |
| V2-16 | Normal completion requires every generated required question resolved. | Attempt premature completion, then provide supported answers; preserve before/after required-question state. | Unverified |
| V2-17 | Disconnects and authorized early endings remain incomplete. | Disconnect or end with unresolved questions; retain unresolved items and do not present a successful call. | Unverified |
| V2-18 | Final summary and recommendation reflect the actual conversation. | Compare each confirmed fact, customer detail, unresolved question, recommendation, and stated reasoning against transcript evidence in the selected language. | Unverified |
| V2-19 | Empty input and mic/connection failure stop safely. | Useful localized guidance, no generated business facts, inactive indicator, no false success. | Unverified |
| V2-20 | Runnable artifacts and real/synthetic evidence remain distinct. | Run discovered checks/build, preserve source and expected-versus-actual record, inspect package for secrets and raw prompts. | Unverified |
| V2-21 | Value hypothesis is assessed honestly. | Actual target-user feedback is required to change this status. | Unverified |

## Test and implementation sequence

1. Preserve v1 and inspect existing commands. Build the smallest v2 shared-room state machine and localized customer/business screens.
2. Unit-test authorization and acceptance guards, connection transitions, evidence provenance, unknown-detail relay, and completion requirements. The planned dedicated file is `tests/v2-state.test.js`; wait for the real module API rather than inventing a disconnected test model.
3. Use securely configured OpenAI access for the authorized backend test. Confirm actual service response before labeling real chat or Realtime as working. Missing or rejected access is a Blocked integration, even if mocked development checks pass.
4. Run the actual example across the two same-laptop tabs. Have a teammate supply fictional customer details and natural Korean business answers. Preserve actual dynamically generated questions, relay, resolved/unresolved states, summary, and recommendation.
5. Repeat representative language and failure checks, fix only observed core failures, then rerun the same checks. Keep microphone/audio evidence explicit and separate from synthetic browser/state tests.
6. Before submission, update the five-page presentation and explanation to the final demonstrated v2 behavior. Keep any unverified capabilities visible. A person checks the authenticated form, organizer changes, and required authorization before submitting.

## Three-minute demonstration target

0:00–0:35: select a language and show the hospital request plus AI-generated interview. 0:35–1:00: show the fictional institution, required questions, and customer authorization. 1:00–2:15: accept in the business tab; conduct Korean Realtime conversation and a genuinely unknown-detail chat relay. 2:15–2:45: show required-question completion, conversation-grounded summary, and recommendation. 2:45–3:00: state what was tested, what is simulated, and what remains unverified.

No claim of live v2 success, deployment, submission, or validated user value is made by this plan.

## State implementation checkpoint

Implemented `lib/v2-state.mjs` and ran `node --test tests/v2-state.test.js`: **24 tests passed**. The tests exercise the actual mutable room implementation with synthetic data; no API or microphone is invoked by this test file.

Verified state invariants include customer authorization and business acceptance before voice, immutable stored transcript evidence, exact business-quote provenance, exclusion of unavailable/ambiguous information from completion, reuse of known customer details, unknown-detail pausing, required-question completion plus business confirmation of the readback, disconnect cleanup, preservation of unresolved questions on early ending, and private-token exclusion from public room snapshots. New calls cannot reuse old call evidence, and a post-completion assistant goodbye cannot change the successful result.

These results establish state behavior only. Actual OpenAI service responses, model factual consistency, all-language browser behavior, live microphone capture, audible Realtime Korean, and user value still require their separate evidence. State updates trust a semantic review produced by the real AI integration for whether an answer is meaningful and whether a business utterance confirms the readback; exact quotation and lifecycle rules provide additional local checks rather than a substitute for that model review.

## Later real-service checkpoint

Actual OpenAI access was demonstrated at **14:06:39 KST** after the earlier credit rejection. The real English hospital interview and reviewed plan cover female-doctor availability around 15:30, self-pay cost, and appointment requirements, with prior-visit status still unknown. Actual Russian/Chinese interviews used their selected languages; their first plans exposed semantic failures. A model-audited recheck improved required-question coverage and fictional labels but Chinese text still claimed female-doctor capabilities without business evidence. The later bounded guard eliminated those earlier positive capability claims, but the final two-turn Russian check omitted service context in Korean and Chinese failed closed on invalid source-message references. These checks assess actual requested constraints; qualified self-pay cost does not require an extra uninsured-eligibility question unless the customer asks it. These findings are preserved in `artifacts/v2/live-api-recheck.json`, `live-english-plan.json`, and `live-language-check.json` and discussed in [v2-verification.md](v2-verification.md).

The first real English Chrome rehearsal was authorized and accepted, connected to Realtime, transcribed a Korean human greeting and produced human-confirmed audible Korean. It stalled after greeting and was intentionally interrupted with all questions unresolved. Complete unknown-detail relay, business fact resolution, readback and final successful result remain Unverified. See `artifacts/v2/live-voice-first-attempt.json` and the later no-new-audio summary replay in `live-summary-guard-check.json`. The latest local suite has 31 state, 16 plan/summary-guard and 15 legacy tests (62 total) passing, including replacement of corrected full customer fact lists and source retention. Earlier Unconfirmed/Blocked statements above describe their original checkpoints; they are not the current API-access verdict.

## Latest bounded-language and second-voice checkpoint

A fresh exported-function RU/ZH run used the schema-enum source references, exact-source hydration and Korean-fidelity checks. Both languages reached plan readiness in two customer turns (ten real provider responses total), and Russian service-question omission was caught and repaired. Chinese remains Partial: its reply/customerInfo broaden no Korean insurance into no insurance, even though its business cost question preserves the qualifier. See `artifacts/v2/live-language-source-guard-check.json`. A narrow wording-preservation correction is pending verification; no extra eligibility requirement was imposed.

The second real English laptop microphone attempt reached the full Korean rash/female-doctor/15:30 question and further business transcripts, then interrupted on a missing-transcript timeout. All questions remained unresolved with no customer relay or final confirmation. Evidence: `artifacts/v2/live-native-rehearsal-second-attempt.json`. Later empty-transcript cleanup, microphone pausing during output audio and a 30-second transcript deadline await another real run. Earlier checkpoint observations remain historical.

The later targeted Chinese retry preserves the Korean-insurance qualifier in customer facts, reply and cost question and reaches a plan on a third preparation turn; that extra turn is friction, not failure alone. Its broader plan is still Partial: Korean service wording omits rash, and cost wording presumes an initial consultation despite unknown prior visit. See `artifacts/v2/live-zh-insurance-scope-check-three-turn.json`. No more voice acceptance is implied.

## Completion-guard repair checkpoint

The third actual microphone attempt obtained four business answers and readback confirmation but then lost its resolved facts and repeated questions before human disconnection. An isolated real-API/synthetic-business-text test also found premature completion without any readback. Both failures are preserved. The corrected state requires prior resolved answers, exact assistant readback evidence for every required question and an unchanged answer/evidence snapshot, and preserves facts on generic confirmation. Current unit tests total 62/62. Replaying the recorded third-call interval through the fixed functions passed11/11 with five real review calls, but is not a new microphone success. The synthetic full-flow recheck passed10 state/relay/readback checks and then failed summary validation; final output remains incomplete. See `actual-third-readback-replay.json` and `real-api-synthetic-business-rehearsal-recheck.json` under `artifacts/v2/`.
