# V2 integration checkpoint — 2026-09-29

This checkpoint is being pushed before the teammate UI changes are integrated.

- Run `npm start`, then open http://localhost:4173. The configured `.env` is local and excluded from Git; use `.env.example` on another computer.
- Current application: `public/v2/`, `server-v2.mjs`, and `lib/v2-*.mjs`. Historical v1 remains in `public/` and `server.mjs`.
- Preserve customer authorization, business acceptance, server-only API credentials, English/Russian/Chinese controls, required-question status, and the text relay while integrating the UI.
- Latest checks: **63/63 unit tests**, build passed, **23/23 local HTTP checks** (synthetic plan setup, upstream blocked), **20/20 mocked customer UI checks**, and **14/14 mocked business UI checks**. Mocked checks are not voice verification.
- Actual microphone rehearsals reached Korean conversation, four business answers, and readback. The last actual run was interrupted after a confirmation-state defect; its evidence is preserved. The fixed state logic passed an 11-check replay of that recorded conversation, without new microphone input.
- Late relay answers now clear the timeout decision and resume the conversation.
- Final facts are grouped from already AI-extracted, evidence-backed answers. The recommendation path asks the real AI to choose a structured next action and supporting question IDs; localized rendering reuses the exact saved answers. A new recorded-text regression passed **9/9 checks with one real API response**, preserving the original interrupted outcome and price uncertainty. This does not establish live normal completion. Earlier free-text recommendation failures remain in the evidence.
- The opening now waits for session creation, the remote audio track, and registered connection. It explicitly requests audio without tools and keeps the microphone paused until opening playback finishes. A 12-second missing-audio watchdog stops with retry guidance; bounded event diagnostics are exported. Automatic voice interruption is disabled for this half-duplex flow. The user's latest silent-opening report still requires a fresh human audibility check.
- The customer now has a localized shop-stock starter as well as the hospital starter. Real API interview checks produced stock, price and pickup-time questions; use [v2-shop-demo.md](v2-shop-demo.md) for editable placeholders. A fresh Chrome shop room has been prepared and authorized, awaiting teammate acceptance; no shop voice success is claimed.
- Russian/Chinese shop relay translation passed 12/12 checks with four real API requests on explicit synthetic text. No microphone or live call was involved. Chinese summary labels were generalized for shop timing/visits; the current English rehearsal can continue without a restart.
- Remaining acceptance work: audible opening, real unknown-detail chat relay, Korean return message, final confirmation/completion, and the latest recommendation result. For the shop, ask whether another color is acceptable while that preference remains unknown.
- PDF/PPTX are honest partial-live checkpoint exports; refresh their evidence and packaged artifacts after the next verified run. No official submission or public deployment has occurred.

Continue the shop rehearsal from the fresh customer/business tabs. This checkpoint includes the startup changes; the teammate UI branch has not yet been selected for integration.
