# YOKOBU v2

A text conversation helps expats, tourists, and deaf or hard-of-hearing users in Korea prepare questions for a business. After the customer authorizes a fictional call, a separate business tab accepts it and uses OpenAI Realtime for Korean voice. Unknown customer details return to the same chat. A normal ending requires supported answers to every required question and confirmation of the key details.

**All institutions and calls are fictional. No real telephone calls, searches, public deployment, or external submission occur.** The v2 application uses real OpenAI services; it has no automatic mocked chat or voice fallback. English is the default; Russian and Chinese are available for the entire customer view.

## Run on this laptop

Requires Node.js 20+ and current Chrome with a working microphone/speaker. No package installation is needed for the app.

1. Copy `.env.example` to `.env` only if `.env` does not already exist. Set `OPENAI_API_KEY` locally with credited API access. Never put the key in chat, frontend code, or an archive. Optional models default to `gpt-4.1-mini` and `gpt-realtime`.
2. Run `npm start` and open [the customer view](http://localhost:4173).
3. Choose a language and enter “I want to go to a hospital.” Answer the AI's questions using fictional customer details.
4. Review the generated fictional institution and required questions. Open the business tab; it stays inactive until the customer selects **Yes** to authorize the call.
5. In the business tab, select **Accept call** and allow microphone access. The customer indicator turns green only after the Realtime connection opens. Speak as the fictional business and provide your own answers to the generated questions.
6. Ask for one customer detail the interview has not covered. Answer the resulting question in the customer chat and listen for its Korean relay. For a known detail, the assistant should reuse the existing answer.
7. Resolve the required questions and confirm the assistant's readback. Review the same-chat summary and recommendation. Unavailable information or an interrupted call must remain incomplete.

The user explicitly chose **two tabs on this laptop** instead of two physical phones. `localhost` supports microphone access without a public deployment. Use headphones if speaker feedback interferes. Keep the server running; `PORT=4174 npm start` changes its port. Configuration is reread for API requests, so a locally replaced key does not require printing it or sending it through the browser. Restarting the server clears in-memory rooms; start a new chat if an old room has expired.

API key stays on the Node server. Browser room credentials are separate, local access tokens. The business link carries its token in the URL fragment. Evidence exports exclude credentials. Microphone audio streams to OpenAI; this application does not record audio files. Conversation evidence is written locally under `artifacts/v2/local-runs/`; use fictional information.

## Verification checkpoint

The real Responses API initially returned **429 / credit_balance_exhausted** at 13:49:58 KST on 2026-09-29. Access was restored by **14:06:39 KST**, when the actual hospital request produced a real English clarification. Live English interview and call-plan generation have since run. Testing exposed premature business-availability claims, so plan validation is being strengthened and the three languages rechecked. Actual Realtime microphone input, audible Korean, full relay, and grounded completion remain **Unverified**. Local tests are not evidence of live voice or user value.

- 24 v2 state tests and 15 preserved v1 tests passed.
- 17 checks against the actual local HTTP server passed without calling OpenAI.
- Customer and business UI checks use explicitly mocked routes/events; see their artifacts for exact results.
- The value hypothesis remains **Unverified** without actual target-user feedback.

```sh
npm test
npm run build
node scripts/check-v2-http.mjs
```

`npm run build` copies frontend assets into `dist/`. V2 still requires the Node backend; a static file server alone cannot run its AI flow. Browser checks use an existing Playwright installation and isolated Chrome profile, with no production mock path.

## Preserved work and handoff

V1 remains available through `npm run start:v1`. Its original interface, rules, tests, Korean sheets, evidence, and submission files are preserved. The former README is [docs/v1-readme.md](docs/v1-readme.md). V1 is a limited rule-based prototype and does not establish v2 live acceptance.

- [V2 official requirements and acceptance plan](docs/v2-official-and-plan.md)
- [V2 demonstration guide](docs/v2-demo-guide.md)
- [Editable fictional rehearsal details](docs/v2-demo-placeholders.md) — teammate answers in Korean
- [V2 verification record](docs/v2-verification.md)
- [V2 final report](docs/v2-final-report.md)
- `artifacts/v2/` — local verification results and runnable archive
- `submission/v2/` — updated submission materials, separate from v1

Official deadline: **29 September 2026, 16:30 KST**. The [official instructions](https://ralphthon.org/kakao-ai-dot-2026/#process) require a PDF of at most five pages plus the customer/problem, solution, and short Codex usage explanation. Do not upload raw prompts, Codex session logs, `.env`, or room credentials. [Submission portal](https://ralphthon.org/kakao-ai-dot-2026/app). Authenticated form details and any on-site changes remain Unconfirmed. Nothing has been submitted.
