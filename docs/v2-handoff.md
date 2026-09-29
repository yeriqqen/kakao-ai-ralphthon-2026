# V2 PR #1 handoff — 2026-09-29

Latest: [Korean clinic presentation and shutdown fixes](v2-presentation-ready.md). Use `submission/final-ko/` for the Korean three-minute deck and rehearsal notes. Pull this branch and restart the server on the configured presentation laptop.

The polished UI is integrated on `feat/v2-design-integration`. Newer local work was preserved at `codex/pre-pr1-checkpoint` (`eb4e5ce`) before switching and carried forward as `ea7d30f`. The `.env` is local and ignored.

Run `npm start` and open http://localhost:4173. Use the customer-generated business link in a separate Chrome tab on this laptop. The customer authorizes the simulated call; the teammate accepts it. No real telephone call is made.

Read [the PR review and latest evidence](v2-pr1-review.md) before demonstrating. Three actual PR microphone attempts were interrupted. The third exposed repeated questions and an ignored alternative-color question. Later fixes add server-detected relay, precise unresolved-question control, playback ordering, localized customer labels, and packaged font support. Recorded API replays and mocked regressions pass; the repaired full microphone relay and normal completion still require a new human rehearsal.

Current automated checks: 64 unit, 30 local HTTP with mocked AI, 20 mocked customer UI, 19 mocked business UI, and 32 design checks. The build and extracted runnable archive are checked separately. None establishes audible Korean or a successful live flow.

Use [editable shop placeholders](v2-shop-demo.md). Ask the unknown color question before answering the service questions. Customer example: “Black is fine, as long as it is waterproof and about 20 liters.” Preserve actual business answers if they differ from the guide. Explicitly confirm the assistant's final readback and inspect the final summary.

The older runnable ZIP at `artifacts/v2/yokobu-v2-runnable.zip` predates the latest shutdown and concise-output fixes; run the current branch source for this presentation. Use the new Korean deck in `submission/final-ko/`; the older English submission slides remain a historical checkpoint. No official submission, public deployment, or PR merge has occurred.
