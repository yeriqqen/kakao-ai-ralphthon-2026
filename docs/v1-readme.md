# YOKOBU — fictional clinic conversation

Russian text request → necessary interview → Korean plan → **Start simulation** → Korean speech and receptionist microphone input → Russian/Korean live question relay → Russian summary and two Korean sample sheets.

**Simulated call. No real clinic contacted.** All patient details are fictional. This is a deliberately limited, rule-based demo, not a deployed AI calling service. No API key, account, package installation, or real phone connection is required to run the local application.

## Run

Requires Node.js 20+ and a browser. For the microphone demonstration, use current desktop Chrome, internet, an available microphone, Korean speech synthesis, and browser/OS microphone permission.

```sh
npm start
```

Open **http://localhost:4173**. Keep the terminal running. Stop it with Ctrl+C. `PORT=4174 npm start` changes the port. The server intentionally binds only to this computer (127.0.0.1). It does not publicly deploy or make telephone calls.

No `npm install` is needed. The application uses native browser APIs and Node's standard library. If 4173 is already serving this demo, use that running instance instead of starting another.

## Run the authorized example

1. Click **Вставить пример** (insert example), then **Продолжить** (continue).
2. Enter age **7**, symptoms **Кашель** (cough), duration **2** days, insurance **Нет** (none). The explicit fictional-example button fills only those values. Prior-visit status is deliberately absent.
3. Read the Korean call plan, then click **Start simulation**. Both sides say **Simulated call**. The user can participate entirely by typing.
4. The teammate, acting as the receptionist, clicks **마이크로 답하기**, allows the requested microphone permission, and says one Korean reply. Review the recognized words and click **이 답변 전달하기**. Repeat per reply. See [demo guide](docs/demo-guide.md).
5. For **처음 방문하시나요?**, the user's view shows **Вы впервые в этой клинике?**. Enter **Да** and click **Передать**. The assistant says **네, 처음 방문입니다.** and resumes its pending question. It never guesses prior-visit status.
6. Finish with **Завершить и показать результат**. Read the evidence-based Russian summary, Korean readback, and two clearly labeled fictional sheets. If a question was unanswered or ambiguous, its fact remains **Unclear**.
7. Save the JSON with **Сохранить результат JSON**. This downloads a browser copy and, when served by the included server, writes a local copy under `artifacts/local-runs/`. This contains conversation text and speech API events, **not an audio recording**. Only use fictional data.

The six scripted answers are available in the receptionist panel. Its **다음 가상 답변 삽입** button is an explicitly labeled **synthetic text fallback**. It does not count as a microphone test. Edited recognition results also receive separate provenance.

## What is real, simulated, or unverified

| Capability | Status |
| --- | --- |
| Interview, plan, explicit start, visible relay, summary, and sheets | Implemented and exercised in browser with synthetic text |
| Evidence-bound summaries; empty/unclear/contradictory input handling | Automated checks pass; see verification record |
| Browser microphone capture and Korean speech recognition | Implemented using `getUserMedia` and Web Speech; actual-device run **Unverified** until recorded separately |
| Korean speech synthesis | Implemented using an installed Korean voice; API availability observed; human audibility **Unverified** until recorded separately |
| AI conversation/translation | **Mocked/limited**: local Korean phrase rules and scripted Korean/Russian mapping; no general LLM or translation API |
| Clinic, user details, and all reported clinic facts | **Simulated**; never verified by a real clinic |
| Two-phone synchronization | **Unimplemented / Unconfirmed**; agreed test arrangement is one computer with teammate |
| User value | **Unverified**; no target-user feedback |

Browser recognition may use its provider's remote service. Korean offline recognition is not assumed or installed. The app does not save audio. The browser/provider's own processing is outside this app's control. The microphone is released after each recognition turn, on failure, when the assistant speaks, and when leaving the page. No real names, diagnoses, medications, allergies, identifiers, or additional patient data are requested.

The parser supports the authorized scenario and common nearby phrases. Unsupported wording, spelled-out Korean numbers, unresolved conflicts, or unknown questions can remain **Unclear**. For arbitrary questions without a supported translation, the app labels translation unavailable and waits; it does not fabricate a Russian translation or Korean answer. Refreshing clears conversation memory. Saved evidence files are the explicit exception.

## Checks and artifacts

```sh
npm test
npm run verify
npm run build
```

`npm test` uses Node's built-in test runner. `npm run verify` runs the exact fictional example and regenerates the expected/actual evidence and marked verification section. `npm run build` copies the browser application to `dist/`; use an HTTP server, not `file://`, for module and microphone support.

For browser QA, start the app first and use an already installed Playwright and Chrome:

```sh
node scripts/browser-check.mjs
```

If not auto-discovered, set `PLAYWRIGHT_MODULE` to an existing Playwright package and `CHROME_EXECUTABLE` to an installed Chrome executable. Browser checks explicitly mock speech and permission failures and **do not** verify audio hardware. They run in an isolated profile.

- [Verification report](docs/verification.md) — exact expected vs actual summary and limitations.
- `artifacts/expected-vs-actual.json` — deterministic run and failure-path evidence.
- `artifacts/browser-results.json` and `artifacts/browser-*.png` — browser checks and screenshots.
- [Audio feasibility](docs/audio-feasibility.md) — observed browser capability and live-test limits.
- [Three-minute demo guide](docs/demo-guide.md).
- [English pronunciation guide](docs/korean-pronunciation-guide.md) — meanings and approximate sound hints for the exact Korean microphone script.
- [Submission checklist](submission/README.md).
- `submission/slides.pdf` — official-format presentation, five pages.
- `submission/slides.pptx` — editable presentation.
- `artifacts/sample-korean-sheets.pdf` — printable fictional reception/doctor sheets; editable HTML alongside.
- `submission/yokobu-submission-review.zip` — reviewed PDF and submission text; acceptance of ZIP is Unconfirmed.
- `artifacts/yokobu-runnable-demo.zip` — source, checks, and supporting artifacts. Rebuild both archives with `python3 scripts/package-demo.py`.

## Scope and submission

Target users are expats, tourists, and deaf or hard-of-hearing users in Korea needing information available only by calling a local service. The problem is that essential dynamic information can remain behind a Korean-language telephone call. Existing workaround: translation apps, general LLMs, and online listings cannot reliably obtain information requiring a live call. This demo only simulates the authorized pediatric-clinic flow.

**Out of scope today:** actual calls, search, persistent profiles, multiple-place recommendations, other service categories, recordings, and follow-up services. No additional product scope is assumed.

Official deadline: **2026-09-29 16:30 KST**. [Official instructions](https://ralphthon.org/kakao-ai-dot-2026/#process) require a PDF of at most five pages and a brief Codex usage explanation; they forbid uploading raw prompts or Codex session logs. [Submission destination](https://ralphthon.org/kakao-ai-dot-2026/app). Account readiness, upload limits, authenticated form fields, ZIP acceptance, and any on-site changes remain **Unconfirmed**. Nothing has been externally submitted or publicly deployed.
