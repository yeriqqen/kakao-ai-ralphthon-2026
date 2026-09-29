# YOKOBU handoff report

Checkpoint: **2026-09-29 12:49 KST**. The verified 16:30 deadline is 3 hours 41 minutes away. The locally runnable demo and submission materials are prepared. **The complete acceptance condition is still pending an actual teammate microphone run and audible Korean confirmation.** No external submission or deployment has occurred.

## Built and how to run

Run `npm start` with Node 20+; open `http://localhost:4173` in desktop Chrome. The server is already running on the development computer at this checkpoint. No package installation or API key is needed. Restart instructions and full limitations are in `README.md`.

Implemented: Russian request, missing-details interview, visible Korean plan, explicit Start simulation, Korean speech synthesis, microphone transcription with transcript review, unknown-question Russian relay and Korean reply, evidence-based Russian summary, Korean readback, and two fictional Korean sheets. The Russian user side requires only text. Both conversation panes and all output identify the simulation.

## Expected versus actual

The actual synthetic run produced the exact expected six-fact Russian summary and both Korean sheets. Evidence and per-check expected/actual values: `artifacts/expected-vs-actual.json` and `docs/verification.md`.

| Validation | Actual result | What it establishes |
| --- | --- | --- |
| Node tests | 15/15 passed | Parsing, evidence, unknown answers, conflicts, alternate outcomes |
| Fictional example comparison | 14/14 passed | Exact summary, relay, sheets, safe invalid-input handling from synthetic input |
| Browser tests | 11/11 passed | UI flow, synthetic speech events, failure paths, microphone lifecycle, export, 390px layout |
| Build | Passed | Static browser files preserved in `dist/` |
| Extracted runnable ZIP | Passed | Archived source starts and serves its required files independently |
| Actual Chrome Korean introduction | Speech-completion status observed | Real browser completion event, not proof a human heard it |
| Actual teammate microphone conversation | **Unverified** | No actual microphone transcript preserved yet |
| Audible Korean speech | **Unverified** | Human confirmation pending |

The native Chrome session was started with the fictional request and plan, then handed to the team. The team confirmed that a teammate can respond through this computer's microphone. Mock test exports in `artifacts/local-runs/` are explicitly tagged **SYNTHETIC BROWSER TEST** and must not be counted as live evidence.

## Product verdict and limits

**Partial demonstration:** core text flow and browser integration logic demonstrated; required actual audio acceptance remains Unverified. This is a local rule-based simulation. General AI conversation and translation are mocked by limited phrase rules; no general LLM/translation API or real telephone service is connected. Unsupported expressions pause or remain Unclear. Browser recognition may process audio through its provider. The app records no audio; explicit JSON export saves fictional conversation text and API events locally.

Two-phone synchronization is unimplemented; the agreed available setup is one computer. Other excluded work: actual calls, search, persistent profiles, multiple-place recommendations, other service categories, recordings, and follow-up services. API account availability and a separate two-phone setup are Unconfirmed. **Value hypothesis: Unverified** without target-user feedback; passing tests does not establish value.

## Three-minute presentation

0:00–0:25 users/problem and Russian request → 0:25–0:45 fictional interview and Korean plan → 0:45–2:15 teammate microphone replies, prior-visit question, Russian “Да” and Korean relay → 2:15–2:45 Korean readback, Russian summary and sheets → 2:45–3:00 verification boundaries and remaining limitations. Exact lines and controls: `docs/demo-guide.md`.

## Preserved package and submission checks

- `submission/slides.pdf`: reviewed five-page presentation; editable `slides.pptx` and build sources alongside.
- `submission/yokobu-submission-review.zip`: PDF, customer/problem, solution, Codex explanation, verification summary, demo guide, and SHA-256 manifest.
- `artifacts/yokobu-runnable-demo.zip`: source, reproducible checks, screenshots, and materials. Raw prompts and Codex session logs are excluded.
- `artifacts/sample-korean-sheets.pdf`: one-page fictional reception/doctor sample; editable HTML alongside.
- `artifacts/package-smoke.json`: extracted archive launch evidence.

Official destination: https://ralphthon.org/kakao-ai-dot-2026/app . Official format and schedule: https://ralphthon.org/kakao-ai-dot-2026/#process . Required PDF: at most five pages; required written fields: customer/problem, solution, and brief Codex usage. **Do not upload raw prompts or Codex session logs.**

A person must confirm actual-device microphone/speaker behavior, preserve simulation labels and the current limitations, inspect all five PDF pages, verify microphone permission/provider processing, check official login/form/upload limits and on-site schedule changes, and authorize the external submission. ZIP acceptance and submission completion remain **Unconfirmed**. Full checklist: `submission/README.md`.

## Required next human step

Complete the fictional microphone session in the prepared Chrome page, use “Да” for the first-visit relay, check the optional audible-Korean confirmation only if actually heard, then click **Сохранить результат JSON**. Report failures or edited/text fallback inputs. The resulting real run can then be compared against the same expected facts and used to update the conservative Unverified status in this report and the slides.
