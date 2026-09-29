# V2 integration checkpoint — 2026-09-29

This checkpoint is being pushed before the teammate UI changes are integrated.

- Run `npm start`, then open http://localhost:4173. The configured `.env` is local and excluded from Git; use `.env.example` on another computer.
- Current application: `public/v2/`, `server-v2.mjs`, and `lib/v2-*.mjs`. Historical v1 remains in `public/` and `server.mjs`.
- Preserve customer authorization, business acceptance, server-only API credentials, English/Russian/Chinese controls, required-question status, and the text relay while integrating the UI.
- Latest checks: **63/63 unit tests**, build passed, **17/17 local HTTP checks**, **20/20 mocked customer UI checks**, and **11/11 mocked business UI checks**. Mocked checks are not voice verification.
- Actual microphone rehearsals reached Korean conversation, four business answers, and readback. The last actual run was interrupted after a confirmation-state defect; its evidence is preserved. The fixed state logic passed an 11-check replay of that recorded conversation, without new microphone input.
- Late relay answers now clear the timeout decision and resume the conversation.
- Final facts are grouped from already AI-extracted, evidence-backed answers. The latest recommendation path asks the real AI to choose a structured next action and supporting question IDs; localized rendering reuses the exact saved answers. This latest structured-choice path has unit coverage but **has not yet been retested against the real API or microphone flow**. Earlier free-text recommendation failures remain in the evidence.
- Remaining acceptance work after UI integration: real unknown-detail chat relay, Korean return message, final confirmation/completion, and the latest recommendation result. Start the relay early by asking about prior-visit status only if it is still unknown.
- PDF/PPTX are honest partial-live checkpoint exports; refresh their evidence and packaged artifacts after the next verified run. No official submission or public deployment has occurred.

The next step is to fetch and integrate the teammate's UI commit, rerun the relevant checks, then continue the live rehearsal.
