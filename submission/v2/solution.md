# YOKOBU v2

YOKOBU is a text interface for expats, tourists, and deaf or hard-of-hearing users in Korea who need information or help from businesses. Korean phone conversations can create language and accessibility barriers. Translation apps and online listings may not establish current business-specific answers.

The v2 implementation connects a single customer chat to OpenAI-generated clarification, a fictional institution suggestion, a generated list of required questions, and explicit customer authorization. A separate business tab on the same laptop receives the simulated incoming call. Only business acceptance starts the OpenAI Realtime connection for Korean microphone and speaker interaction.

The customer chooses English, Russian, or Chinese, with English as the default. Interface controls and server-generated customer content use the selected language. The customer side remains entirely text-based. If the business asks for unknown customer information, the assistant asks the customer in the existing chat and relays their actual answer in Korean. It reuses known information and must not guess missing personal details.

Normal completion requires meaningful supported answers to every required question and confirmation of the key details. An unavailable answer should produce a customer decision to continue or end with unresolved information preserved. The final chat response separates simulated business facts, customer-provided details, unresolved information, and the AI recommendation with its reasoning.

All suggested institutions are fictional. No actual telephone call or real institution search occurs. Reception and doctor sheets are outside v2 scope. The later team instruction to simulate on this laptop supersedes the earlier two-phone requirement. V1 code and its historical artifacts remain separate.

## Functionality verdict at preparation

The customer interface and its failure behavior passed synthetic browser checks. After an earlier API-credit failure, the actual English request “I want to go to a hospital.” succeeded through the local backend at **14:06:39 KST on 2026-09-29**. The real model generated a relevant question about the customer's issue or symptoms. This verifies the initial real API interview turn, not the complete interview or call.

A full Korean Realtime conversation, live unknown-detail relay, and conversation-grounded final response remain **Unverified** pending the teammate rehearsal. Real model behavior in Russian and Chinese is being checked separately. Synthetic UI checks do not satisfy those acceptance conditions. User value remains **Unverified** without feedback from actual target users.

## Three-minute demonstration

| Time | Demonstration |
| --- | --- |
| 0:00–0:25 | State the intended users and Korean-call barrier. |
| 0:25–0:55 | Select a language and enter “I want to go to a hospital.” Let the real AI generate its interview. |
| 0:55–1:25 | Provide fictional details, inspect the generated required questions, and authorize a fictional institution. Open the business tab on the same laptop and accept. |
| 1:25–2:00 | A teammate speaks Korean and asks a customer detail not already known. Answer in chat and observe the Korean relay. |
| 2:00–2:30 | Resolve and confirm all required questions, then inspect the summary and recommendation. If a question cannot be answered, demonstrate the continue/end decision instead. |
| 2:30–3:00 | Explain what Codex built, what the team checked, and what remains unverified. |

If API access or audio is still blocked, show the explicit blocked state and the synthetic UI evidence. Do not narrate the planned steps as if a live run succeeded.

## Submission check

The [official participant instructions](https://ralphthon.org/kakao-ai-dot-2026/#process) require customer/problem and solution descriptions, a PDF of at most five pages, and a short Codex-use explanation. The deadline is 2026-09-29 at 16:30 KST. Review any on-site changes, the latest evidence, all simulation labels, and the five-page PDF before a team representative uses the [official app](https://ralphthon.org/kakao-ai-dot-2026/app). Do not upload raw Codex prompts or session logs. No external submission or public deployment has been performed.
