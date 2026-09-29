# YOKOBU verification record

All clinic information and user details below are fictional simulation data.

<!-- BEGIN GENERATED DETERMINISTIC VERIFICATION -->
## Deterministic example run

Generated: 2026-09-29T03:43:47.535Z. Command: `npm run verify`.

Result: **14 passed; 0 failed**. These are actual runs of the local conversation engine with explicitly **synthetic text inputs**. They do not demonstrate a microphone conversation or audible Korean speech. The source of each received fact is preserved as `synthetic-fixture`.

| Check | Expected versus actual |
| --- | --- |
| No clinic answer exists before the receptionist speaks. | PASS |
| Previously collected age answers a Korean follow-up without a user relay. | PASS |
| Unknown prior-visit status is relayed in Russian. | PASS |
| The user’s explicit Russian answer is returned in Korean. | PASS |
| The six facts produce the exact requested Russian summary. | PASS |
| Every supported fact has the simulation-only confirmation status and transcript evidence. | PASS |
| Korean reception sheet contains only supplied fictional age and insurance. | PASS |
| Korean doctor sheet contains only supplied fictional symptoms and duration. | PASS |
| Both sheets carry the required fictional-data label. | PASS |
| Korean readback includes received cost and wait facts. | PASS |
| An empty request stops with useful guidance. | PASS |
| An uncertain wait time is Unclear and excluded from the summary. | PASS |
| Without a user answer, the relay remains unresolved and no personal fact is guessed. | PASS |
| Conflicting statements within a single turn do not become confirmed. | PASS |

Expected Russian summary:

> Клиника открыта. Женщина-врач сегодня не принимает, но доступен другой врач. Принимают без корейской государственной медицинской страховки. Консультация — примерно 20 000 вон. Сейчас ожидание — 15 минут.

Actual Russian summary:

> Клиника открыта. Женщина-врач сегодня не принимает, но доступен другой врач. Принимают без корейской государственной медицинской страховки. Консультация — примерно 20 000 вон. Сейчас ожидание — 15 минут.

Actual Korean sample sheets:

- 접수용: 나이: 7세 / 건강보험: 국민건강보험 없음.
- 진료용: 증상: 기침 / 증상 기간: 2일.
- Label for both: 데모용 가상 정보 — 실제 환자 정보 아님.

The exact inputs, outputs, transcript, evidence source, expected values, actual values, and negative-path results are preserved in [expected-vs-actual.json](../artifacts/expected-vs-actual.json).

## Evidence boundaries

| Capability | Status and evidence |
| --- | --- |
| Russian request, missing-information interview data, Korean plan and generated conversation text | Engine demonstration uses the supplied fictional example. UI evidence is separate. |
| First-visit relay and refusal to invent missing answers | Demonstrated by this synthetic run. |
| Six-fact Russian summary and Korean sample sheets | Demonstrated; exact expected summary matched when all six facts were supplied. |
| Actual microphone-based teammate conversation | **Unverified** by this run. Requires an actual teammate and working device permission. |
| Korean speech heard by a person | **Unverified** by this run. Generated Korean text is not audible speech verification. |
| Browser UI and injected browser speech events | See [browser-results.json](../artifacts/browser-results.json) and [audio feasibility](audio-feasibility.md). Mocked events do not verify audio hardware or speech recognition. |
| General-purpose Korean/Russian translation | **Mocked/limited**: deterministic phrase matching; unknown questions pause. |
| Real phone calls and real clinic facts | Out of scope; no real clinic contacted. All confirmations say “Confirmed in simulation.” |
| User value | **Unverified**; no actual user feedback. |

Safety checks cover empty requests, no received clinic answers, unknown personal information, missing user responses, uncertain numeric answers, and contradictory same-turn claims. Unrecognized Korean wording may require a clearer scripted phrase or remain **Unclear**. Korean spelled-out numbers such as “열다섯 분” are not generally parsed; they remain **Unclear**.

The fixture is synthetic. No patient names, identifiers, diagnoses, medications, allergies, or other missing health facts are added. No audio recording is created by this verification script.
<!-- END GENERATED DETERMINISTIC VERIFICATION -->

## Human microphone and audible-output evidence

**Actual microphone conversation: Unverified. Human audibility: Unverified.**

On 2026-09-29 at approximately 12:36–12:40 KST, the actual desktop Chrome UI was opened at `http://localhost:4173`. The authorized Russian request and fictional interview details were entered, the Korean plan was displayed, and Start simulation was activated. The native Chrome accessibility view subsequently showed the Korean introduction and the status “한국어 음성 재생 완료. 실제로 들렸는지는 팀원이 확인해 주세요.” This observes a real browser speech-completion UI event; it does **not** establish human audibility.

The team confirmed that a teammate can use this computer's microphone. The prepared live session and scripted instructions were handed to the team. At this checkpoint there is no preserved teammate microphone transcript or human audible-output confirmation. Six clinic facts remain unresolved in that live session; the synthetic test results are separate.

After the actual run, preserve its JSON under `artifacts/local-runs/` and record device/browser, permission outcome, actually recognized microphone replies, Korean speech heard, live relay result, any edited or fallback input, and expected-versus-actual results. Do not treat a saved synthetic test file as live evidence.

## Browser and build checkpoint

Final browser checks: **11/11 passed** on installed Chrome 154 in an isolated profile. Checks include the full fixture, known-age answer, live first-visit relay, missing response, altered wait, ambiguous input, denied permission, synthetic recognition event success, draft edits, stale callbacks, microphone cancellation, delayed permission, local JSON saving, and 390px layout. Speech APIs in these checks are **synthetic test doubles**. Every saved test run is explicitly marked `syntheticBrowserTest` and `testProvenance.synthetic`; it is not a real microphone run. Manual transcript editing stops microphone capture to prevent later recognition from overwriting corrections.

`npm test`: **15/15 passed**. `npm run verify`: **14/14 comparisons passed**. `npm run build`: **passed**, static output in `dist/`. Browser evidence: `artifacts/browser-results.json`; synthetic export evidence: `artifacts/browser-synthetic-download.json`. No actual microphone transcript has been provided at this checkpoint.
