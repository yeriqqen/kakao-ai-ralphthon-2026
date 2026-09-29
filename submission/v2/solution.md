# YOKOBU v2

YOKOBU is a text interface for expats, tourists, and deaf or hard-of-hearing users in Korea who need information or help from businesses. Korean phone conversations create language and accessibility barriers. The team’s hypothesis is that a text conversation can make information available that otherwise requires a phone call.

The implementation connects a single customer chat to OpenAI-generated clarification, a fictional institution suggestion, a generated list of required questions, and explicit customer authorization. A separate business tab on the same laptop receives the simulated incoming call. Only business acceptance starts the OpenAI Realtime connection for Korean microphone and speaker interaction.

The customer chooses English, Russian, or Chinese, with English as the default. The customer side remains entirely text-based. The intended flow reuses known customer information and sends an unknown business question back to the customer’s chat, then relays their actual answer in Korean. It must not guess missing personal details. Live unknown-detail relay is still Unverified.

Normal completion requires supported answers to every required question and confirmation of the key details. If an answer is unavailable, the customer should decide whether to continue or end while preserving unresolved information. The result groups validated AI-extracted business answers separately from customer details and unresolved information. Real AI selects a constrained recommendation action with references to the existing answers, which the app renders without new factual prose. These are acceptance requirements; the latest real rehearsal did not complete them successfully.

All suggested institutions and business facts are fictional. No actual telephone call or real institution search occurs. Reception and doctor sheets are outside v2 scope. The later team instruction to simulate on this laptop supersedes the earlier two-phone requirement. V1 code and its historical artifacts remain separate.

## Functionality checkpoint: 2026-09-29

The real API produced an English interview and a concrete four-question plan. Real Russian and Chinese interviews were also exercised, exposing meaning-preservation problems. A later Chinese check preserved the Korean-insurance qualifier, but Korean question coverage and unsupported first-visit wording remained limited. This is not an all-language pass. A real shop interview also prepared stock, price and evening-pickup questions in two customer turns and six provider responses. Its price question says “available” before stock is confirmed; all business answers remain unresolved. The alternate-color preference is intentionally unknown.

In the third actual laptop microphone rehearsal, the teammate supplied four Korean answers and the assistant read them back. The assistant preserved the actual role-play statements, including an uncertain cost estimate, rather than requiring the optional demo fixtures. Business confirmation then incorrectly reset all four questions to unresolved and caused repeated questioning; the human disconnected. The outcome is **Partial / interrupted**. Korean audibility was human-confirmed during the first attempt; the third attempt establishes microphone/transcript progress without a separate audibility confirmation.

The third run did not include an unknown customer question, so live unknown-detail relay is **Unverified**. Normal completion remains **Unverified**. A final response was produced after interruption, but exposed untranslated evidence details and duplicated recommendation text. A later recorded-text regression passed 9/9 checks with one real provider request and preserved all four answers, cost uncertainty and the original interrupted outcome. It did not create new speech evidence. Startup now waits for session, remote-track and connection readiness, holds the microphone through permitted opening playback, and fails explicitly if no opening audio starts within 12 seconds. The actual shop attempt received the full Korean opening and stock question, but human audibility remains Unverified. Only a greeting and apology were transcribed from the business; review wrongly turned these into negative stock and unavailable price, which also entered the summary. Consecutive responses left the microphone paused. The operator ended at 15:15:45 KST; the shop flow is incomplete, with a factual-review failure. Later repairs require new verification. User value remains **Unverified** without feedback from actual target users.

## Three-minute demonstration

| Time | Demonstration |
| --- | --- |
| 0:00–0:25 | State the intended users and Korean-call barrier. |
| 0:25–0:55 | Select a language and ask whether a shop has an item in stock. Let the real AI generate its interview. The hospital example remains available separately. |
| 0:55–1:25 | Provide fictional details, review the generated questions, and authorize a fictional institution. Open the business tab on this laptop and accept. |
| 1:25–2:00 | Have the teammate speak Korean and conditionally ask whether black is acceptable if navy is unavailable. That preference is unknown; answer in customer chat. This live relay is a planned acceptance step, still Unverified. |
| 2:00–2:30 | Show the actual result and its unresolved status. If a new run completes and confirms every answer, demonstrate that result; otherwise state the interruption clearly. |
| 2:30–3:00 | Explain Codex’s contribution, the observed failure, and the limits of the evidence. |

The hospital and latest shop rehearsals both ended incomplete. The shop opening was received, but its inferred stock/price answers were unsupported and must not be presented as facts. Do not narrate planned relay or completion steps as if they succeeded. If access or audio fails during presentation, show the actual failure state and distinguish any synthetic evidence from real behavior.

## Submission check

The [official participant instructions](https://ralphthon.org/kakao-ai-dot-2026/#process) require customer/problem and solution descriptions, a PDF of at most five pages, and a short Codex-use explanation. The deadline is 2026-09-29 at 16:30 KST. The [official app](https://ralphthon.org/kakao-ai-dot-2026/app) is the submission destination. Do not upload raw Codex prompts or session logs. No external submission or public deployment has been performed.
