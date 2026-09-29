# V2 verification checkpoint

Checkpoint updated after the **2026-09-29, 14:06:39 KST** real API success. This is a conservative preparation checkpoint, not a claim of completed live acceptance. All institutions are fictional and all calls are simulated. The AI services themselves must be real for v2 acceptance.

| Check | Expected | Actual | Verdict |
| --- | --- | --- | --- |
| Initial language | English | English shown in isolated browser | Passed with synthetic routes |
| Interface languages | English, Russian, Chinese controls and guidance | Locale key parity, Russian/Chinese selection and invalid-input guidance checked | Passed for covered UI paths |
| Missing configuration / API credit | Useful localized stop, no fake AI answer | Configuration stop and localized `API_QUOTA` shown | Passed with synthetic routes |
| Dynamic content | Display the server’s interview and plan | Supplied server fixture rendered; actual English API generated a relevant symptom question | Initial real interview turn verified; complete interview and plan pending |
| Authorization | A call remains idle until Yes | Pending state appears only after explicit authorization | Passed with synthetic routes |
| Business access | Separate tab link available before authorization | Link contains room ID and token fragment; customer bearer token stays in request header | Passed with synthetic routes |
| Active indicator | Green only with connected active call | Pending, unconnected, and lost connection show no green | Passed with synthetic routes |
| Unknown detail | Ask in customer language | Russian relay question and reply guidance rendered | UI passed; actual Korean relay Unverified |
| Required questions | Preserve unresolved information on early/incomplete ending | Inconsistent completed fixture with unresolved question received an incomplete warning | Defensive UI passed; live completion Unverified |
| Result | Summary, recommendation, reasoning | All supplied result fields rendered | UI passed; conversation grounding Unverified |
| Small viewport | No horizontal overflow | Checked at 390px width | Passed |
| State safeguards | Authorization, transcript provenance, relay and completion gates | 24 v2 tests plus 15 preserved v1 tests passed | Local tests passed; no live AI/audio |
| Actual local HTTP | Page serving, private room access and request guards | 17/17 checks passed against the Node server | Passed without upstream requests |
| Business browser lifecycle | Acceptance, waiting, tool sequencing, end and failure cleanup | 9/9 checks passed with mocked HTTP, WebRTC and microphone events | Synthetic checks only |
| Live OpenAI request | Generated interview | Earlier credit error resolved; actual English hospital request returned HTTP 200 with a relevant model-generated question at 14:06:39 KST | Initial real interview turn verified |
| Live Russian / Chinese chat | Model content in the selected language | Separate real-API checks in progress | Unverified until those records are available |
| Live Korean Realtime | Microphone input and audible Korean output after acceptance | No completed live audio run available at this checkpoint | Unverified |
| User value | Feedback from intended users | No actual target-user feedback | Unverified |

## Reproducible synthetic evidence

Run `node scripts/v2-customer-ui-check.mjs` from the project root using the existing Playwright installation. The script accepts `PLAYWRIGHT_MODULE` and `CHROME_EXECUTABLE` when paths differ. It installs nothing, blocks external requests, and uses a fresh isolated browser profile.

- Harness: `scripts/v2-customer-ui-check.mjs`
- Machine-readable report: `artifacts/v2/customer-ui-check.json`
- Images: `artifacts/v2/customer-ui-en.png`, `customer-ui-ru.png`, and `customer-ui-zh.png`
- Result: **20 passed**, with `mock: true` and real API/microphone/audio verification explicitly false.

These assertions do not verify Korean Realtime quality, browser microphone permission, real model behavior in all three languages, or the end-to-end live example. Preserve a separate actual conversation record when the team performs that run. Check required questions and actual evidence rather than requiring predetermined clinic answers.

## Actual API evidence

`artifacts/v2/live-api-recheck.json` records an actual request through the local backend, with `success: true` and HTTP 200. The input was “I want to go to a hospital.” The `gpt-4.1-mini-2025-04-14` response asked about the customer's medical issue or symptoms before suggesting a department. The provider response evidence is dated 2026-09-29 at 05:06:39 UTC (14:06:39 KST). This is a real model-generated interview turn, not a mocked response. The same record explicitly leaves real microphone and audible Korean verification false.

The optional role-play inputs in `docs/v2-demo-placeholders.md` are team-authorized fictional data. They are editable and are not app defaults, a transcript, or verification evidence. The actual interview must determine which details are still unknown.

## Before claiming a live demonstration

Use securely configured credited OpenAI access. Open customer and business tabs on this laptop. Enter the acceptance request, let the model generate its interview, provide fictional details, authorize the call, and have the teammate accept. Observe actual microphone input and audible Korean. Ask a detail the interview has not covered, answer it in chat, and confirm the Korean relay. Verify the completion gate or the explicit incomplete decision. Export the actual conversation evidence and compare the resulting summary and recommendation with it.

Do not paste secrets into chat or include them in evidence. A synthetic route fixture, typed business transcript, or successful test suite does not replace this live run.
