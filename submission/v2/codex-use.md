# How we used Codex

The team set the intended users, language choices, simulated-call scope, and acceptance requirements. Codex implemented the customer chat, dynamic OpenAI routing, a separate Korean Realtime business screen, shared call state, and evidence preservation while keeping the earlier v1 work separate.

Codex split work across the customer interface, conversation logic, business audio, and submission evidence. The team checked expected behavior against observed results. Customer authorization and business acceptance are distinct steps. The active indicator depends on an actual connected state. Unknown personal information must return to the customer instead of receiving an invented answer.

A reproducible customer UI harness supplied explicitly synthetic API responses to check language selection, authorization, connection indicators, relay rendering, incomplete endings, recommendation reasoning, and failures. Its twenty checks passed. The report explicitly excludes real API, microphone, and audio verification. The current broader checkpoint has 57 local tests, 17 local HTTP checks, and 11 mocked business browser checks passed. Passing those checks does not establish a successful live conversation.

The most useful verification finding came from a real laptop microphone rehearsal. The assistant collected four Korean business answers and read them back, but the business’s confirmation reset the answers to unresolved and triggered repeated questions. The teammate ended the run. Codex then added stricter readback evidence and preserved answer snapshots through confirmation. The correction requires another actual microphone rehearsal before the team can claim that failure is fixed in practice.

Real language checks also found unsupported institution claims and loss of meaning between customer information and Korean questions. Some checks prompted targeted repairs, while remaining fidelity limitations are disclosed. Codex’s generated output was treated as something to inspect, not as proof of correctness.

The team must judge whether YOKOBU helps its intended users. No actual target-user feedback has been collected, so value remains **Unverified**. This explanation includes no raw prompts or Codex session logs.
