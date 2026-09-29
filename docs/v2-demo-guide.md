# YOKOBU v2 — laptop demonstration guide

This version uses real OpenAI chat and OpenAI Realtime for a **fictional business-call simulation**. No telephone call is made. Use fictional customer details and business answers. The customer uses text; a teammate plays the business in another tab on the same laptop. The assistant speaks Korean. The latest input transcription is configured for Korean with short context. Use a Korean-speaking teammate for the business role and record the actual spoken input language. The prior auto-detection attempt is historical evidence, not the current configuration.

## Run locally

1. Use Node.js 20 or newer and a current browser with microphone and WebRTC support. The app has no npm package dependencies to install.
2. Configure `OPENAI_API_KEY` in the local `.env` file. If the file does not exist, copy `.env.example` to `.env` and edit it locally. Never place a secret in chat, browser code, screenshots, exports, or a submission package. Process environment configuration is also supported.
3. Defaults are `OPENAI_CHAT_MODEL=gpt-4.1-mini`, `OPENAI_REVIEW_MODEL=gpt-4.1`, `OPENAI_REALTIME_MODEL=gpt-realtime`, `HOST=127.0.0.1`, and `PORT=4173`. This laptop setup uses localhost; no public URL, hosting deployment, or certificate installation is needed. API access and usable credit must be established separately from the presence of a configured key.
4. Run `npm start`, then open [the customer chat](http://localhost:4173). Keep the terminal running. If another copy already serves this port, use it rather than starting a conflicting server. `PORT=4174 npm start` uses another port if needed; open the matching localhost URL.

The API key stays on the local server. Accepting the simulated call sends business microphone audio to OpenAI. This application saves conversation text and event evidence; it does not create an audio recording. Keep room access links private: the business link contains a room-specific access token.

## Demonstrate the real flow

1. **Customer tab:** confirm English is initially selected. Choose English, Russian, or Chinese before starting a new chat. The customer UI and model responses should use that language.
2. Choose a hospital or shop starter, or describe another business inquiry. The original hospital acceptance example remains available. For the team's current shop-stock rehearsal, use the editable details and teammate lines in [v2-shop-demo.md](v2-shop-demo.md). Answer the model's actual clarifying questions using fictional details.
3. Inspect the fictional institution suggestion and generated required-question list. Check that current business facts remain unknown before the business conversation. The assistant should explain the proposed simulation and request authorization.
4. Select the localized **Yes** action. Use **Open business tab** from the customer chat. That link opens the correct room; opening `/business` directly without its room link is insufficient.
5. **Business tab:** before authorization it must be inactive. Once an incoming simulation is pending, select **Accept call**. Allow the requested microphone permission. The assistant should begin speaking Korean through OpenAI Realtime only after acceptance.
6. The teammate listens and answers naturally in Korean as the fictional business. Use the displayed generated questions as a guide. There is no required v1 answer sequence or fixed successful clinic result. State an actual fictional answer for each current question, including negative answers when appropriate.
7. Ask one question about a customer detail the interview has **not** collected. “처음 방문하시나요?” means “Is this your first visit?” and is suitable only when prior-visit status is still unknown. If that fact is already known, choose another relevant unknown detail. Never ask the teammate to guess the customer's answer.
8. The assistant should say in Korean that it will check, pause, and send a translated question to the customer's existing chat. Type the answer there. The assistant should relay the actual answer in Korean and continue. A covered question should instead reuse known information without asking again.
9. Let the assistant resolve every generated required question, read back key details, and receive the business's confirmation. Successful completion requires the local completion guard to pass. Unclear information or refusal should lead to a customer decision about continuing or ending incompletely.
10. Inspect the final summary and recommendation in the customer chat. They must separate business-confirmed simulated facts, customer-provided information, unresolved items, and the recommendation's reasoning. V2 does not produce Korean reception/doctor sheets.
11. In the business tab, check **I personally heard intelligible Korean from OpenAI** only if that actually happened. Use **Download conversation evidence** in the customer chat after the call. Retain the exact transcript and generated required questions as evidence. Keep exported room data local until reviewed for sharing.

The green customer call indicator should appear only while the accepted call is connected. It must clear on disconnect, failure, or completion. Pause after each business reply while the app reviews it before continuing. The business microphone pauses during incoming assistant audio, review and customer clarification, and stops when the connection ends. Let the assistant finish before speaking.

## If something fails

- **API configuration or credit error:** leave the integration marked Blocked. A configured key, a successful page load, or a synthetic browser test does not establish a successful OpenAI call. After the team securely resolves access, start a fresh chat and retry the real example.
- **Microphone denied or unsupported:** inspect the browser's site permission and device settings. Do not describe a text-only run as microphone verification. The call must remain failed/interrupted, with no invented answers.
- **No audible Korean:** the opening waits for the Realtime session and remote audio track. If no opening audio arrives within 12 seconds of the registered connection, the call stops with an explicit retry message. Use **Retry this simulation** in the customer chat. If playback is blocked, use **Play incoming audio**; the microphone stays paused until playback is allowed and the opening has finished. Do not mark the human audibility checkbox unless speech was heard and understood. The export includes bounded event diagnostics, without raw audio or event payloads.
- **Unknown detail unanswered:** the implementation asks the customer how to proceed after a 60-second wait. Keep it pending or choose to end incompletely. Never replace silence with a guessed answer.
- **Business cannot answer a required question:** choose to clarify or end with unresolved information preserved. A concrete negative answer can resolve a question; “I don't know” cannot.
- **Connection loss:** confirm the microphone stops and the green indicator clears. Preserve incomplete evidence. A new clean room is the simplest rerun after a terminal failure.

## Three-minute presentation

| Time | Show |
| --- | --- |
| 0:00–0:35 | Language selection, hospital request, real AI-generated interview. Explain the language/accessibility barrier. |
| 0:35–1:00 | Fictional institution, generated required questions, explicit customer authorization. |
| 1:00–2:15 | Accept in the business tab; Korean Realtime exchange; unknown-detail relay through customer text. |
| 2:15–2:45 | Required-question completion, evidence-grounded summary, recommendation and reasoning. |
| 2:45–3:00 | What was actually tested, what is simulated, and any remaining limitations. |

If real API or voice access is unavailable, present the implementation and recorded checks with their limitations instead of pretending the live segment succeeded.

## Reproduce checks and package

```sh
npm test
npm run build
python3 scripts/package-v2.py --smoke
```

`npm run verify` remains the **v1 deterministic fixture** check. It does not verify v2 AI or voice. V2 test and live evidence boundaries are in [v2-verification.md](v2-verification.md). The package script creates `artifacts/v2/yokobu-v2-runnable.zip` from an allowlist, excluding credentials, room tokens, local run exports, raw prompts, and session logs. This ZIP is a local runnable handoff artifact, not a verified official submission format.

With the server running, `node scripts/check-v2-http.mjs` repeats local HTTP guards without invoking upstream AI/audio. `npm run build` copies frontend assets to `dist/`; it does not remove the need for the Node backend.

The package command's `--smoke` option extracts the archive into a temporary directory, starts that copy on an available localhost port with no OpenAI key, checks its routes, and writes `artifacts/v2/package-smoke.json`. It does not invoke AI/audio or affect the running demonstration.

The historical v1 remains available at `/legacy` under the v2 server or via `npm run start:v1`. Its old microphone guidance and Korean sheets are v1 artifacts only.
