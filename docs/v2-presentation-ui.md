# Presentation UI and real discovery — 2026-09-29

PR #1 remains on `feat/v2-design-integration`. Its remote head was checked before changes: open, `9edb3c4`. Local changes and all prior voice fixes were preserved. Discovery was ported selectively from `origin/feat/ui-polish` (`server/agent.mjs`, `public/app.js`); the old branch and backend were not merged.

Run `npm start`, open http://localhost:4173, and start a new chat. Configure the server-side key in the ignored `.env`. Customer chat and web search now use `OPENAI_CHAT_MODEL=gpt-6-astra`; grounded review retains `gpt-4.1`, and voice retains `gpt-realtime`. Account access is required; model errors fail visibly rather than silently switching.

The top bar opens/reuses three room-specific tabs: Chat, Debug, and Call. Call has Accept/Decline, mute, duration, and End call; accepting remains necessary before microphone access. Debug displays shared questions, transcript, relay and diagnostics without accessing the microphone or keeping a disconnected phone's heartbeat alive. Repeated setup/simulation notices were removed; About explains the demo boundary.

For discovery, describe a need and neighborhood. The interview reuses supplied context, asks one essential question when needed, and automatically issues a public category/location query through OpenAI web search. Search queries exclude personal identifiers and detailed medical history. Up to three cards show sourced address, description, optional sourced phone, source link and Google Maps search link. Results without an address or an actual search-source URL are rejected. Fewer results or no results are shown when evidence is insufficient; no fabricated fallback places are generated.

Choose a place to prepare the existing inquiry plan. Selection does not authorize or accept a call. A short note distinguishes real listings from the microphone call demonstration. No real business is called or booked, and search results never resolve call questions. The summary for a selected real place is explicitly labeled as demo conversation results.

Copy-paste request:

> Find 2–3 general clinics near Hongik University Station in Seoul. I would like to ask whether a female doctor is available this afternoon, whether they accept patients without Korean national health insurance, and the consultation price. Do not book anything.

Automated verification: 70 unit checks, 36 local HTTP checks, 20 customer UI checks, 20 voice UI checks, and 34 responsive design checks. Provider/media behavior in these checks is mocked. New checks cover sourced-result filtering, selection role checks, retained authorization, unresolved call questions, mobile cards, and maps/source links. Build and extracted-package smoke checks are also run. The live search/selection evidence is `artifacts/v2/real-discovery-check.json`; it is separate from the prior successful microphone rehearsal in `pr1-live-shop-fifth-completed.json`. The updated layout has not had another full human microphone rehearsal. Search listing accuracy still depends on source freshness; availability is never inferred.

API references: [Web search](https://developers.openai.com/api/docs/guides/tools-web-search), [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra). No deployment, main-branch merge, or official submission performed.
