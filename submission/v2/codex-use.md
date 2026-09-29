# How we used Codex

The team set the intended users, problem, language choices, simulated-call scope, and completion requirements. Codex implemented a customer chat interface, dynamic OpenAI routing, a separate Korean Realtime business screen, shared call state, and evidence preservation while keeping the existing v1 work.

The customer UI uses server-generated interview and plan content. Its controls support English, Russian, and Chinese. Customer authorization and business acceptance are distinct steps. The active indicator depends on the actual shared connection state, and a lost connection clears it. Unknown personal information returns to the customer instead of receiving an invented answer.

A representative verification cycle was the customer UI test harness. It supplied explicitly synthetic API responses to test language selection, empty-input guidance, authorization, token-fragment links, connection indicators, relay rendering, unresolved completion, recommendation reasoning, and API-credit failures. Visual inspection checked the Russian mobile layout and Chinese desktop layout. Twenty checks passed, but the report explicitly excludes real API or microphone verification.

The team also attempted the actual API path. An earlier credit-limit error produced a clear blocked state. After configuration was resolved, the actual English hospital request succeeded at 14:06:39 KST and the model generated a relevant clarifying question. The next required evidence is the rest of the interview and an accepted Korean microphone/speaker conversation, followed by an unknown-detail relay and a conversation-grounded summary. The successful API turn does not prove audio behavior.

The team must judge whether the product helps its intended users. Automated checks and agent self-evaluation do not establish user value. That value hypothesis remains **Unverified**. This explanation deliberately excludes raw prompts and Codex session logs.
