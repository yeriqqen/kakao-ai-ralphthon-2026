# YOKOBU v2 — editable shop-stock demonstration

This is a fictional shop inquiry using the same general business-call flow as the hospital example. No real shop search, telephone call, purchase or reservation is performed. A customer uses text and a teammate plays the shop in the separate business tab. The assistant speaks Korean.

## Customer placeholders

Edit these before the live run. They are preferences to investigate, not known shop facts.

| Detail | Example |
| --- | --- |
| Product | Waterproof daypack, about 20 litres |
| Requested color | Navy |
| Brand | No particular brand; any product matching those specifications |
| Area | Mapo, Seoul |
| Timing | Pickup this evening |
| Information wanted | Current matching stock, price, closing time or latest pickup time |
| Intentionally unknown | Whether the customer would accept a different color |

Start a fresh English customer chat with:

> Can you help me check whether a shop has an item in stock?

Answer the actual interview question. The tested detail message is:

> This is a fictional shop-call simulation. I am looking for a navy waterproof daypack with a capacity of about 20 litres. I do not have a particular brand in mind; any bag matching those specifications is fine. I am looking in Mapo, Seoul, and would like to pick it up this evening. Please check whether the matching item is currently in stock, its price, and the shop closing time or latest pickup time this evening.

Do not pre-answer the alternative-color question. A request for navy does not establish whether black would be acceptable. If the model asks permission to prepare the plan before producing it, a possible additional message is:

> Yes, please prepare the fictional shop-call plan now using those details. Do not place an order, reserve an item, or start the call yet.

Review the generated plan. It should ask about the specified product, its current stock, price and this evening's pickup/closing constraints. Shop details remain unconfirmed before the teammate answers. Hospital-only questions, invented inventory, or an assumed willingness to change color are failures to preserve, not facts to accept.

## Teammate guide

After the customer reviews and explicitly authorizes the fictional call, accept it in the business tab. Use the actual generated questions on screen. Let the assistant finish speaking before replying; the microphone pauses during assistant playback and evidence review.

The following are **editable fictional lines**, not recorded business evidence. Say only the line relevant to the current question. The product and timing must remain consistent with any edits above.

| Purpose | Optional Korean line | Meaning |
| --- | --- | --- |
| Reuse a known detail | 찾으시는 가방은 무슨 색인가요? | What color bag are you looking for? The assistant should reuse navy without asking the customer again. |
| Ask an unknown detail | 혹시 네이비색이 없으면 검은색도 괜찮으실까요? | If navy is unavailable, would black be acceptable? This is a conditional question; it does not assert that navy is unavailable. |
| Answer matching stock | 네이비색 20리터 방수 데이팩은 현재 재고가 있습니다. | The navy 20-litre waterproof daypack is currently in stock. |
| Answer price | 가격은 7만 9천 원입니다. | The price is 79,000 won. |
| Answer closing and pickup | 오늘은 오후 8시에 문을 닫고, 픽업은 오후 7시 30분까지 가능합니다. | We close at 8 pm today; pickup is possible until 7:30 pm. |
| Clarify that nothing is held | 아직 상품을 예약하거나 따로 보관한 것은 아닙니다. | No item has been reserved or set aside. |
| Confirm an accurate readback | 네, 말씀하신 내용이 모두 맞습니다. | Yes, all those details are correct. Use only after hearing the assistant accurately repeat them. |

When the unknown-color question appears in the customer chat, the customer should give their own answer. For example:

> Black is fine, as long as it is waterproof and about 20 litres.

Alternatively, answer that navy is required. The assistant must relay that actual answer rather than choose a color. If the relay is left unanswered, it should pause and eventually ask whether to keep waiting or end; a valid late answer should resume the call.

The conditional alternative-color question can be asked before checking inventory. Afterwards, the teammate may confirm that the original navy item is available. This keeps the original stock request consistent while exercising a genuinely unknown preference. If the teammate instead reports navy unavailable, preserve that negative answer and discuss the alternative explicitly; do not silently report the navy item as available.

## Inspect the result

Check the original transcript against every resolved question. An affirmative stock answer must match color, waterproof requirement and capacity; evening pickup must respect the stated closing/pickup limit. Price, quantity and timing must not be invented before a reply. A “not sure” or refusal remains unresolved.

Normal completion should follow an accurate assistant readback and the teammate's confirmation. The result must distinguish shop answers, customer preferences and remaining uncertainty. It must not claim a purchase, held item, real store address or actual booking. Preserve the unknown-color exchange separately from known-color reuse.

## Evidence checkpoint

The bounded real-API interview produced a plan after **two customer turns and six real provider responses**. The first detailed-turn candidate asked unnecessary budget/material questions; independent review rejected it and one repair prepared the plan. Exact inputs, accepted output, provider metadata, source hashes and manual audit are in [live-shop-plan-check.json](../artifacts/v2/live-shop-plan-check.json). The saved public-state snapshot is under `artifacts/v2/local-runs/`.

The accepted questions in this particular run were:

| Generated topic | Actual English question |
| --- | --- |
| Matching stock and evening pickup | Do you currently have a navy waterproof daypack with a capacity of about 20 litres in stock, regardless of brand, for pickup this evening? |
| Price | What is the price of the available navy waterproof daypack (about 20 litres)? |
| Closing/pickup limit | What is your closing time or latest possible pickup time this evening? |

The plan stayed shop-specific, retained the supplied product constraints in Korean, and left every business answer unresolved. No actual stock, price or hours were asserted; alternative-color willingness was not inferred. **Wording caveat:** the price question says “available” before stock is confirmed. That question should be conditional on the stock answer or use neutral product wording. Treat this as an observed limitation; do not take the word as inventory evidence. The generated plan may differ in a new run.

This test uses the exported interview/state functions only. It does not authorize a call, touch the live server, operate the UI, capture a microphone or play audio. The teammate lines above are proposed synthetic test material; they are not evidence of a successful shop conversation. A complete live shop relay and result remain Unverified until actually observed.
