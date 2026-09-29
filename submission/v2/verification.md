# Verification checkpoint — 2026-09-29, 16:10 KST

All institutions, customer details and business answers are fictional. The team authorized two tabs on this laptop instead of two actual phones. No real call, institution search, order, booking, deployment or official submission occurred.

## Expected and actual

| Requirement | Actual evidence | Verdict |
| --- | --- | --- |
| Real customer interview and generated plan | English hospital and shop requests generated plans through OpenAI | Demonstrated in recorded scope |
| Three customer languages | English default; English/Russian/Chinese UI checks and recorded API checks | UI checks pass; broad model fidelity remains Partial |
| Authorization then business acceptance | Fifth actual call followed both actions before voice began | Demonstrated |
| Korean microphone and output | Real teammate speech and Realtime output; human confirmed opening, relay return and goodbye | Demonstrated on this laptop |
| Offered alternative without a question | “Navy is unavailable, but black is available” opened English customer clarification automatically | Demonstrated |
| Customer choice updates remaining questions | Human accepted black; Korean return and current questions changed to black; earlier stock answer retained | Demonstrated |
| Required answers and readback | Black available, ₩10,000, pickup by 19:00; full readback confirmed | Demonstrated |
| Normal completion and shutdown | Completed state, connection closed, human confirmed microphone stopped | Demonstrated |
| Grounded result | Final summary and recommendation use black, ₩10,000 and 19:00; original navy unavailability preserved as history | Demonstrated |
| Invalid input and failure paths | Empty input, unauthorized actions, microphone denial, connection loss and interrupted outcomes covered by automated checks | Automated checks pass |
| Target-user value | No target-user study or feedback | Unverified |

The fifth PR rehearsal completed at 16:04 KST. One price utterance was transcribed only as an incomplete fragment; the assistant asked for clarification and retained the later explicit price. This successful run is not a guarantee of recognition or model reliability. The first four unsuccessful PR rehearsals remain preserved.

The live run used the preference repair committed as `8ce4526`. Teammate UI and shutdown improvements through `92cedd6` were integrated afterward by `da81743` and tested separately. The original live record is not presented as another microphone run of the merged code.

## Checks and evidence

The combined branch passed 67 unit tests, 30 localhost HTTP checks with mocked AI, 20 mocked customer UI checks, 19 mocked business UI checks and 32 design checks across three languages and 320–1440 pixel widths. The build and eight extracted runnable-package checks passed. Upstream network/audio are mocked in these automated checks.

The actual completed export and screenshot are `artifacts/v2/pr1-live-shop-fifth-completed.json` and `pr1-live-shop-fifth-result.png`. `docs/v2-pr1-review.md` records the failures, repairs, original PR state and preserved newer local work. `pr1-fourth-preference-replay.json` is a separate three-request real API replay with six passing checks. Earlier replay failures and multilingual limitations remain available for local review.

Raw transcripts, room credentials, API keys, Codex prompts and session logs are excluded from the submission review ZIP. Evidence paths identify local records; they are not instructions to upload those records.

## Before submission

Review the five-page PDF and use fictional/simulation labels in the demonstration. The official deadline is 16:30 KST and the destination is the participant submission app. Check organizer changes and authenticated upload limits. ZIP acceptance remains Unconfirmed. The teammate’s Korean clinic deck is preserved separately and uses labeled prepared screenshots; this successful shop run does not establish clinic-specific live acceptance. Actual phones and user value remain unverified.


Official public page rechecked at 16:10 KST: submission remains 16:30 KST, PDF at most five pages, with customer/problem, solution and Codex-use descriptions. The current schedule lists eight-minute group-judging slots and ten-minute finalist presentations. The prepared three-minute sequence is a short demo script within those slots. Authenticated upload limits and ZIP acceptance are still Unconfirmed.
