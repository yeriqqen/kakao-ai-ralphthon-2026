# YOKOBU — A little more local.

A mobile-first concierge for foreigners in Korea. One conversation to find places, clarify what matters, prepare Korean requests, and plan the next step. English, Russian and Korean interface. The previous scripted clinic demo is preserved at `/demo/`.

## Run locally

Requires Node.js **22.6+**.

```sh
npm ci
npm start
```

Open **http://localhost:4173**. The server binds to `127.0.0.1` and is for one trusted local user. In the app, open **You → Connection** and enter your OpenAI API key. The server validates it and keeps it in memory until restart. The key is never put in browser storage, model conversation content, or logs.

Alternatively, copy `.env.example` to `.env` and set `OPENAI_API_KEY`. `.env` is ignored by Git. `OPENAI_MODEL`, `OPENAI_REALTIME_MODEL` and `OPENAI_CALL_MODEL` can be changed to models available to your API project. Defaults are `gpt-5.5`, `gpt-realtime-2.1`, and `gpt-live-1`, respectively. API usage is billed to your OpenAI project.

## What this version does

- A quiet, responsive conversation interface with reduced-motion support.
- Optional name, neighborhood, language and preferences. Remembering the profile on this device is opt-in, and it can be cleared.
- Responses API agent with hosted web search, source links, focused clarification questions, place comparisons, Korean instruction sheets, suggested follow-ups and downloadable notes.
- Realtime WebRTC voice with speech transcripts and a function tool that delegates research to the same concierge. Typed and spoken requests share profile and conversation context. The persistent key stays server-side.
- Review cards with the exact business, number, purpose and details to disclose before a call.
- An optional real outbound SIP integration with Korean AI speech, call-status monitoring, transcript capture, a five-minute cap, manual hang-up and automatic evidence-based summaries.

Chat and browser voice are separate from telephone calling. **An OpenAI key alone does not configure a phone provider.** When calling is unavailable, the app still supports research and prepares the request; it never displays a pretend completed call or appointment.

## Enable telephone calling

The outbound adapter uses OpenAI's Live SIP API, which requires outbound SIP access enabled for the OpenAI organization and a compatible telephone provider. Configure a TLS/Opus/SDES-SRTP SIP trunk and set these server environment variables:

```dotenv
ENABLE_OUTBOUND_CALLS=true
SIP_PROVIDER_URL=sips:your-provider.example:5061
SIP_USERNAME=your-sip-username
SIP_PASSWORD=your-sip-password
SIP_CALLER_NUMBER=+your-provider-number
```

Restart after configuring. The UI flag means credentials are present, **not that a live call has been verified**. Approval applies to a particular server-stored action; clients cannot submit arbitrary telephone numbers. Do not automatically retry an ambiguous outbound request: the first call might already exist. The server blocks subsequent requests in that session while a request is unresolved. Check the provider directly before restarting the session. Keep the server running until every real call has ended.

The caller identifies itself as an AI assistant. It can book only within the exact approved terms. If the business needs missing personal details, it ends politely and the summary brings the missing information back to the user. This version does not yet support pausing a live phone call for an in-app user reply. There is no calendar integration or background scheduling.

## Data and access

Profile is stored in browser local storage only when the user selects “Remember this on this device.” Visible conversation notes are kept in session storage for the tab. AI conversation state, phone transcripts and proposed actions live in server memory for up to four hours of inactivity; restarting clears them. Audio is not recorded by this application. OpenAI and the phone provider process the data sent to them under their own service settings.

This local server is **not a public, multi-user deployment**. Public use needs authentication, user-isolated credentials/state, HTTPS and operational controls. A physical phone needs a properly hosted HTTPS endpoint for browser microphone access; a desktop localhost address cannot be opened directly on another device. Building static assets alone does not provide the API endpoints.

## Verification

```sh
npm test
npm run build
npm run test:browser
```

Browser checks use an installed Playwright and Chrome. Set `PLAYWRIGHT_MODULE` and `CHROME_EXECUTABLE` when auto-discovery does not find them. Windows example:

```powershell
$env:PLAYWRIGHT_MODULE = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright"
$env:CHROME_EXECUTABLE = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm.cmd run test:browser
```

New browser evidence is in `artifacts/concierge/`. Browser tests mock AI responses and microphone events: **passing them does not establish live API, hardware audio, telephone or booking success**. Real key-backed chat/search, audible voice and phone-provider behavior still require a live rehearsal.

`npm run verify` and `npm run test:legacy-browser` check the **original simulation**, not the new agent. Historical verification and presentation files in `docs/`, `artifacts/`, and `submission/` describe that original version and have not been rewritten as proof of this version. See `docs/legacy-demo-readme.md` for the previous instructions.

## API references

- [Responses web search](https://developers.openai.com/api/docs/guides/tools-web-search)
- [Realtime WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc?voice-api=realtime)
- [Telephony and outbound SIP](https://developers.openai.com/api/docs/guides/voice-sip)
- [Live transcript and session lifecycle](https://developers.openai.com/api/docs/guides/live-conversations)
