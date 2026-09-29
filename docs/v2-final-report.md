# YOKOBU v2 — checkpoint report

**Partial live acceptance.** API access was restored at **2026-09-29 14:06:39 KST**. Real multilingual chat generation has been exercised. The latest real RU/ZH runs reach readiness with source references and Korean meanings preserved; a targeted Chinese scope fix preserves Korean insurance but its final plan remains Partial because Korean wording omits rash and the price question presumes an initial consultation. The first real English laptop call transcribed a human Korean greeting and produced human-confirmed audible Korean but stalled. The second interrupted on a missing-transcript timeout. The third obtained four answers and readback confirmation, but a fact-reset defect caused repeated questions before disconnection. The complete voice/relay/result flow remains Unverified. Historical failures are preserved.

## Built

YOKOBU v2 implements a text-first customer chatbot with English as the initial language and English/Russian/Chinese choices. The backend uses OpenAI for clarification, fictional institution suggestions, required questions, business-evidence review and relay translation. AI extracts and validates localized business answers; the app groups those retained answers by provenance and outcome, while real AI generates a separately checked recommendation. A separate business tab uses OpenAI Realtime for Korean conversation after customer authorization and business acceptance.

The shared room tracks connection state, received transcripts, required questions, supported answers, pending customer clarification, and final confirmation. Local guards prevent premature voice initiation and successful completion with unresolved questions. They require exact quotation from stored business speech evidence, and preserve incompleteness on interruption or early ending. Public room snapshots omit room access tokens and private provider state.

The latest authorized device setup is **two tabs on this laptop**, replacing the earlier proposed two-phone arrangement. Institutions and calls are fictional. No actual telephone service or real institution discovery is implemented. V2 does not produce Korean reception/doctor sheets. The previous v1 code and evidence are preserved separately.

## Run and demonstrate

Use Node.js 20+ and a current microphone/WebRTC-capable browser. Securely configure the local `.env` from `.env.example`, including usable `OPENAI_API_KEY` access. Never paste the key into the browser or chat.

```sh
npm start
```

Open [the customer chat](http://localhost:4173). Select a language and send “I want to go to a hospital.” Follow the actual AI interview with fictional details, review the generated call plan, authorize the simulation, and open the business tab using the room link provided by the customer UI. Accept there, allow the microphone, and answer in Korean as a fictional business. Follow [v2-demo-guide.md](v2-demo-guide.md) for the unknown-detail relay, evidence export, and failure handling.

The default server is bound to this computer only. It is not publicly deployed. Accepting the call sends microphone audio to OpenAI; this app preserves text evidence and event metadata, not audio recordings. Room access links should remain private.

## Verification and product verdict

| Check | Result at this checkpoint |
| --- | --- |
| V2 state tests | **31/31 passed** |
| Preserved v1 tests | **15/15 passed** |
| `npm test` | **62/62 passed**, including 16 plan/summary-guard tests |
| V2 customer browser mock checks | **20/20 passed**, including English/Russian/Chinese synthetic UI flows; [customer-ui-check.json](../artifacts/v2/customer-ui-check.json). No upstream/audio invoked. |
| V2 business browser mock checks | **11/11 passed**; [business-ui-check.json](../artifacts/v2/business-ui-check.json). Every request/media event was mocked; no real API/microphone/audio. |
| Actual local HTTP route/guard checks | **17/17 passed**; [http-check.json](../artifacts/v2/http-check.json). No upstream/audio invoked. |
| Build | **Passed**; browser assets require the Node backend for v2. |
| Extracted runnable archive | **7/7 passed** without API/audio; see tested hash in [package-smoke.json](../artifacts/v2/package-smoke.json). Recheck after rebuilding the archive. |
| Real OpenAI API | **Access demonstrated** at 14:06:39; [live-api-recheck.json](../artifacts/v2/live-api-recheck.json). Earlier credit rejection preserved. |
| Actual English hospital interview and reviewed plan | **Requested core constraints covered**: female doctor around 15:30, cost, and appointment requirements; prior visit remains unknown. [live-english-plan.json](../artifacts/v2/live-english-plan.json). No business answers confirmed yet. |
| Actual Russian/Chinese chat checks | **Chinese scope fixed; broader plan Partial.** Latest targeted three-turn run preserves Korean-insurance scope, but Korean service wording drops rash and initial-consultation pricing is presumed. [live-zh-insurance-scope-check-three-turn.json](../artifacts/v2/live-zh-insurance-scope-check-three-turn.json). Russian source/Korean checks and earlier failures are preserved separately. |
| Actual laptop microphone + Korean Realtime conversation | **Partial:** first attempt confirms short mic/audio path; [first attempt](../artifacts/v2/live-voice-first-attempt.json). Second reaches the full service question but stops on missing-transcript timeout with zero questions resolved; [second attempt](../artifacts/v2/live-native-rehearsal-second-attempt.json). |
| Recorded third actual transcript replay | **11/11 passed**, five real review responses; [actual-third-readback-replay.json](../artifacts/v2/actual-third-readback-replay.json). Facts preserved and completion allowed only after recorded readback confirmation. No new speech acceptance. |
| Real API with synthetic business text | **Partial:** 10/10 known-detail, relay, evidence and readback checks pass, but final summary fails closed; [real-api-synthetic-business-rehearsal-recheck.json](../artifacts/v2/real-api-synthetic-business-rehearsal-recheck.json). No mic/audio evidence. |
| Revised summary-only checks | **Factual sections pass; recommendation Partial**, [final-summary-regression.json](../artifacts/v2/final-summary-regression.json). Manual review found strengthened uncertain-price wording and unsupported comparison despite model approval. No new speech. |
| Human confirmation of audible Korean | **Confirmed for the first short attempt** by the operator; no sustained-flow claim. |
| Incomplete-call summary | Original output had categorization and fictional-contact recommendation errors. A two-response real model replay corrected those errors without new audio; [live-summary-guard-check.json](../artifacts/v2/live-summary-guard-check.json). |
| Complete real example and final recommendation | **Unverified** |
| Target-user value | **Unverified** |

**Verdict:** real text generation, a short microphone/audio exchange and the local state safeguards are demonstrated within the recorded scope. The complete live flow is not demonstrated. The third real attempt established substantive answers and readback confirmation, but the old review/state logic erased facts and the human disconnected. Its successful corrected replay is backend evidence only; an actual unknown-detail relay and normally completed live result remain Unverified. Synthetic UI events do not expand this live evidence. See [v2-verification.md](v2-verification.md) for the preserved failures, later guarded text replays and source-version boundaries.

## Remaining limits and next verification

Repeat the real hospital-request rehearsal after the observed voice progression and plan-grounding fixes, and save the new conversation. Preserve all three interrupted runs and all language-check failures. The completion guard and fact-preservation repair now pass state and real-model transcript replay checks; they still need a fresh live run. The latest empty-transcript cleanup, microphone pause during playback and 30-second transcript deadline need a new actual microphone run; Chinese rash wording and the presumed initial-consultation price remain observed plan limitations. Test a known-detail answer and a genuinely unknown-detail relay, preserve evidence for every required answer and the key-detail readback confirmation, and compare the summary and recommendation against what was said. Also exercise empty input, missing customer response, unavailable information, and a microphone/connection failure without false success.

The assistant's spoken output remains Korean. The latest input transcription is configured for Korean with short context; the business operator should speak Korean. Record the actual input language. The prior mixed-language transcript belongs to an earlier auto-detection configuration, and the new setting still needs a real check. A 60-second unanswered relay should trigger a customer decision, and ending while AI review is in flight must preserve the interrupted result; live behavior still needs observation.

Do not substitute v1's fixed six-answer scenario or its old sheets for these v2 checks. V1 remains available for historical reproduction. General model understanding can fail even when a quotation is valid; factual review remains necessary. Two-phone connectivity is not claimed, and target-user feedback has not validated the value hypothesis.

## Three-minute presentation

0:00–0:35: users/problem, language selection, hospital request and real interview. 0:35–1:00: fictional institution, generated questions, and authorization. 1:00–2:15: business acceptance, Korean Realtime conversation, unknown-detail relay through customer text. 2:15–2:45: required-question status, grounded summary, recommendation. 2:45–3:00: demonstrated capabilities and explicit limitations. If a live step fails, show its actual incomplete outcome and identify the remaining limit.

## Artifacts and submission checks

- `lib/v2-state.mjs`, `lib/v2-ai.mjs`, `lib/v2-plan-guard.mjs`, `lib/v2-summary.mjs`, `lib/v2-config.mjs`, `server-v2.mjs`, and `public/v2/`: runnable v2 source.
- `tests/v2-state.test.js`: reproducible state safety checks; existing legacy tests remain separate.
- `artifacts/v2/http-check.json`, `live-api-check.json`, `live-api-recheck.json`, `live-english-plan.json`, and `live-language-check.json`: local HTTP guards, historical credit rejection, restored access, actual English plan, and Russian/Chinese plan audits, respectively.
- `artifacts/v2/live-language-source-guard-check.json`, `live-voice-first-attempt.json`, `live-native-rehearsal-second-attempt.json`, `live-native-rehearsal-third-attempt.json`, and `live-summary-guard-check.json`: multilingual guard check, three partial actual microphone attempts, and summary replay.
- `artifacts/v2/real-api-synthetic-business-rehearsal.json`, its `-recheck` artifact, and `actual-third-readback-replay.json`: premature-completion baseline, partial synthetic-text integration result, and fixed recorded-transcript regression.
- `docs/v2-demo-guide.md`, `docs/v2-verification.md`, `docs/v2-official-and-plan.md`, and this report: instructions, boundaries, and acceptance evidence.
- `scripts/package-v2.py`: allowlisted packaging with credential exclusion.
- `artifacts/v2/yokobu-v2-runnable.zip`: generated local runnable handoff archive.
- `artifacts/v2/local-runs/`: explicit server-side evidence exports, excluded from the runnable ZIP.

The independently rechecked official deadline is **2026-09-29 16:30 KST**. The [official participant page](https://ralphthon.org/kakao-ai-dot-2026) requires customer/problem, solution, a **PDF presentation of no more than five pages**, and a short Codex-use explanation; original prompts and Codex session logs must not be uploaded. The [official submission application](https://ralphthon.org/kakao-ai-dot-2026/app) requires team login.

A person must confirm organizer changes, inspect the actual authenticated fields and file limits, check the final five-page PDF against demonstrated v2 behavior, review simulation labels and unresolved limitations, ensure no credentials/private links/raw prompts are included, and authorize external submission. ZIP upload acceptance remains Unconfirmed. No external submission or public deployment has occurred as part of this work.
