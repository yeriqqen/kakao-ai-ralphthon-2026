> Latest presentation update: [three-view UI and real place discovery](v2-presentation-ui.md). Use the header Chat / Debug / Call links. The older checkpoint below describes the successful voice rehearsal.

# V2 PR #1 handoff — 2026-09-29, 16:10 KST

Use `feat/v2-design-integration`. Newer local work remains preserved at `codex/pre-pr1-checkpoint` (`eb4e5ce`); it was carried onto this branch as `ea7d30f`. Preference repairs are in `8ce4526`, integrated with teammate updates through `92cedd6` by merge `da81743`. The local `.env` is ignored. V1 remains available.

Run `npm start`, open http://localhost:4173, and use the generated business link in a separate Chrome tab on this laptop. The customer authorizes; the teammate accepts. No real telephone call is made.

**The fifth shop microphone rehearsal completed successfully at 16:04 KST.** The shop said navy was unavailable and black available, without asking a question. YOKOBU asked the customer whether black was acceptable, returned the human reply in Korean, retained black availability, collected ₩10,000 and pickup by 19:00, confirmed the readback, generated the matching summary/recommendation, and closed the connection. The user confirmed audible opening, relay return, goodbye and microphone shutdown. One truncated price utterance required a legitimate clarification.

See [the PR review](v2-pr1-review.md), `artifacts/v2/pr1-live-shop-fifth-completed.json` and its result screenshot. Four earlier failures remain preserved. The successful run used the preference repair before the later teammate merge; the combined source passed 67 unit, 30 HTTP, 20 customer UI, 19 business UI and 32 design checks, plus build and eight extracted-package checks. Automated checks use mocked provider/media events. They do not expand the single live run into a reliability claim.

The current runnable ZIP is `artifacts/v2/yokobu-v2-runnable.zip`. English submission materials in `submission/v2/` describe this successful shop run and the remaining limitations. The teammate’s Korean clinic deck and notes are preserved separately in `submission/final-ko/`; that deck uses labeled prepared screenshots and is not evidence of a completed clinic rehearsal. Use [editable shop placeholders](v2-shop-demo.md) for the demonstrated scenario.

Actual two-phone connectivity and target-user value remain Unverified. Russian/Chinese interfaces have automated coverage and recorded API checks, with disclosed model-fidelity limits. No official submission, public deployment or PR merge to main occurred.
