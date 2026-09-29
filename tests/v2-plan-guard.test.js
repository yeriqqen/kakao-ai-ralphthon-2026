import test from 'node:test';
import assert from 'node:assert/strict';
import { planReviewIssues, hydratePlanReview, summaryOutputIssues } from '../lib/v2-plan-guard.mjs';
import { interview, summarize, reviewCallPlan, reviewBusiness } from '../lib/v2-ai.mjs';
import { factualSummary, renderAdviceChoice } from '../lib/v2-summary.mjs';
const messages = [{ id: 'u1', role: 'user', text: 'I need a haircut on Saturday. Please ask the cost.' }];
const plan = { reply: 'A fictional simulation plan is ready. Details remain unconfirmed. Shall we proceed?', customerInfo: [{ key: 'need', value: 'haircut' }], institutions: [{ id: 'a', name: 'Fictional East Studio', reason: 'To ask whether it can meet your request.' }], requiredQuestions: [{ id: 'fit', text: 'Can you provide the requested haircut on Saturday?', korean: '토요일에 요청한 이발이 가능한가요?' }, { id: 'cost', text: 'What would it cost?', korean: '비용은 얼마인가요?' }], readyToCall: true };
const review = { questionMeaningChecks: [{ questionId: 'fit', faithful: true, explanation: 'All requested clauses preserved.' }, { questionId: 'cost', faithful: true, explanation: 'Same cost question.' }], approved: true, violations: [], customerFactEvidence: [{ key: 'need', sourceMessageId: 'u1', sourceQuote: 'I need a haircut' }], constraintCoverage: [{ constraint: 'haircut and Saturday availability', sourceMessageId: 'u1', sourceQuote: 'I need a haircut on Saturday.', questionIds: ['fit'] }, { constraint: 'cost', sourceMessageId: 'u1', sourceQuote: 'Please ask the cost.', questionIds: ['cost'] }] };
test('a structurally grounded and independently approved plan can pass', () => { assert.deepEqual(planReviewIssues(plan, review, messages, 'en'), []); });
test('a semantic rejection cannot be accepted despite a fictional label', () => { assert(planReviewIssues(plan, { ...review, violations: [{ code: 'unsupported_business_claim' }] }, messages, 'en').includes('semantic_review_rejected')); });
test('invented evidence and absent coverage fail even when model says approved', () => {
  const changed = structuredClone(review); changed.customerFactEvidence[0].sourceQuote = 'female doctor'; changed.constraintCoverage[1].questionIds = [];
  const issues = planReviewIssues(plan, changed, messages, 'en');
  assert(issues.includes('ungrounded_customer_fact')); assert(issues.includes('uncovered_customer_constraints')); assert(issues.includes('unrequested_required_question'));
});
test('assistant text is never accepted as customer fact evidence', () => { const changed = structuredClone(review); changed.customerFactEvidence[0].sourceMessageId = 'a1'; assert(planReviewIssues(plan, changed, [...messages, { id: 'a1', role: 'assistant', text: messages[0].text }], 'en').includes('ungrounded_customer_fact')); });
test('interview repairs a rejected result, then requires fresh independent approval', async () => {
  const originalFetch = globalThis.fetch, originalKey = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = 'synthetic-test-key';
  const room = { language: 'en', messages: [...messages, { id: 'u2', role: 'user', text: 'Please prepare now.' }], apiEvidence: [] }, purposes = [];
  const rejected = { ...review, approved: false, violations: [{ code: 'unsupported_business_claim', field: 'reply', quote: 'has staff', explanation: 'No business evidence.' }] };
  const responses = [plan, rejected, plan, review];
  globalThis.fetch = async (_url, options) => { const format = JSON.parse(options.body).text.format; purposes.push(format.name); if (format.name === 'call_plan_validation') { assert.deepEqual(format.schema.properties.customerFactEvidence.items.properties.sourceMessageId.enum, ['u1', 'u2']); assert.deepEqual(format.schema.properties.customerFactEvidence.items.properties.key.enum, ['need']); assert.equal('sourceQuote' in format.schema.properties.customerFactEvidence.items.properties, false); } return { ok: true, json: async () => ({ id: 'synthetic-response', model: 'synthetic-model', status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(responses.shift()) }] }] }) }; };
  try { assert.deepEqual(await interview(room), { ...plan, customerInfo: plan.customerInfo.map(info => ({ ...info, sourceMessageId: 'u1' })) }); assert.deepEqual(purposes, ['customer_interview', 'call_plan_validation', 'call_plan_repair', 'call_plan_validation']); assert.deepEqual(room.apiEvidence.filter(e => e.purpose === 'call_plan_validation_result').map(e => e.accepted), [false, true]); }
  finally { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; }
});
test('persistent rejection exhausts two repairs and never returns rejected prose', async () => {
  const originalFetch = globalThis.fetch, originalKey = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = 'synthetic-test-key';
  const room = { language: 'en', messages, apiEvidence: [] }; let requests = 0;
  globalThis.fetch = async (_url, options) => { requests++; const purpose = JSON.parse(options.body).text.format.name; const output = purpose === 'call_plan_validation' ? { ...review, approved: false, violations: [{ code: 'unsupported_business_claim', field: 'reply', quote: 'has staff', explanation: 'No business evidence.' }] } : plan; return { ok: true, json: async () => ({ id: 'synthetic-response', model: 'synthetic-model', status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] }) }; };
  try { await assert.rejects(interview(room), error => error.code === 'AI_ERROR' && error.statusCode === 502); assert.equal(requests, 6); assert.equal(room.apiEvidence.filter(e => e.purpose === 'call_plan_validation_result' && e.accepted).length, 0); }
  finally { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; }
});

const summaryRoom = () => ({ language: 'en', call: { id: 'call-a', status: 'interrupted', institutionId: 'a' }, institutions: plan.institutions, customerInfo: [], requiredQuestions: [], transcripts: [{ id: 'business-greeting', callId: 'call-a', role: 'business', text: '안녕하세요.' }, { id: 'assistant-question', callId: 'call-a', role: 'assistant', text: 'Can you provide the service?' }], apiEvidence: [] });
function pricedSummaryRoom() {
  const room = summaryRoom();
  room.customerInfo = [{ key: 'doctor_preference', value: 'female doctor' }, { key: 'insurance_status', value: 'no Korean health insurance' }];
  room.transcripts.push({ id: 'business-price', callId: 'call-a', role: 'business', text: '비용은 10만 원이 넘을 수도 있습니다.' });
  room.requiredQuestions = [{ id: 'cost', text: 'What is the expected consultation cost?', status: 'resolved', answer: 'The cost may exceed 100,000 KRW.', evidence: [{ transcriptId: 'business-price', quote: '10만 원이 넘을 수도 있습니다.' }] }, { id: 'time', text: 'Is the requested time available?', status: 'unresolved', evidence: [] }];
  return room;
}
const mockResponse = output => ({ ok: true, json: async () => ({ id: 'synthetic-response', model: 'synthetic-model', status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] }) });
test('fact presentation retains exact validated qualifiers and interrupted outcome with clear customer labels', () => {
  const facts = factualSummary(pricedSummaryRoom());
  assert.match(facts.text, /Simulation ended incompletely/);
  assert.match(facts.text, /The cost may exceed 100,000 KRW\./);
  assert.match(facts.text, /Doctor preference: female doctor/);
  assert.match(facts.text, /Insurance: no Korean health insurance/);
  assert.deepEqual(facts.unresolved.map(item => item.id), ['time']);
  assert.equal(/[가-힣]|business-price|gender_preference/.test(facts.text), false);
});
test('assistant evidence, previous-call evidence, invented quotes and untranslated answers never appear as business facts', () => {
  for (const mutation of ['assistant', 'previous', 'invented', 'untranslated']) {
    const room = pricedSummaryRoom();
    if (mutation === 'assistant') room.transcripts.at(-1).role = 'assistant';
    if (mutation === 'previous') room.transcripts.at(-1).callId = 'old-call';
    if (mutation === 'invented') room.requiredQuestions[0].evidence[0].quote = 'invented';
    if (mutation === 'untranslated') room.requiredQuestions[0].answer = '10만 원입니다.';
    const facts = factualSummary(room);
    assert.equal(facts.answers.length, 0); assert.equal(facts.unresolved.length, 2);
    assert.doesNotMatch(facts.text, /100,000|10만|business-price/);
  }
});
test('factual grouping uses Russian and Chinese labels without exposing metadata keys', () => {
  for (const [language, completed, doctor] of [['ru', 'Симуляция завершена.', 'Предпочтение врача'], ['zh', '模拟已完成。', '医生偏好']]) {
    const room = summaryRoom(); room.language = language; room.call.status = 'completed';
    room.customerInfo = [{ key: 'doctor_preference', value: language === 'ru' ? 'Предпочтительно женщина-врач' : '希望由女医生看诊' }];
    const facts = factualSummary(room);
    assert(facts.text.includes(completed)); assert(facts.text.includes(doctor)); assert(!facts.text.includes('doctor_preference'));
  }
  const shop = summaryRoom(); shop.language = 'zh';
  shop.customerInfo = [{ key: 'pickup_time', value: '今晚取货' }, { key: 'prior_visit', value: '以前未到访过此店' }, { key: 'gender_preference', value: '中性款式' }];
  const shopText = factualSummary(shop).text;
  assert.match(shopText, /期望时间: 今晚取货/);
  assert.match(shopText, /以往到访情况: 以前未到访过此店/);
  assert.match(shopText, /信息: 中性款式/);
  assert.doesNotMatch(shopText, /就诊|医生|gender_preference/);
  for (const [language, label, value] of [['en', 'Waterproofing', 'required'], ['ru', 'Водонепроницаемость', 'обязательна'], ['zh', '防水要求', '必须防水']]) {
    shop.language = language; shop.customerInfo = [{ key: 'waterproof', label, value }];
    assert(factualSummary(shop).text.includes(`${label}: ${value}`));
  }
});
test('recommendation failures preserve validated facts and explicitly label unavailable advice', async () => {
  const originalFetch = globalThis.fetch, originalKey = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = 'synthetic-test-key';
  const room = pricedSummaryRoom();
  globalThis.fetch = async () => { throw new Error('Synthetic provider failure'); };
  try { const result = await summarize(room); assert.equal(result.text, factualSummary(room).text); assert.match(result.recommendation, /unavailable/); assert.equal(room.apiEvidence.at(-1).purpose, 'recommendation_fallback'); assert.equal(room.apiEvidence.at(-1).accepted, false); }
  finally { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; }
});
test('one structured AI choice selects exact retained answers without generating or rephrasing facts', async () => {
  const originalFetch = globalThis.fetch, originalKey = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = 'synthetic-test-key';
  const room = pricedSummaryRoom(), purposes = [];
  const decision = { action: 'clarify_selected_questions', reasonQuestionIds: ['cost'], clarificationQuestionIds: ['time'] };
  globalThis.fetch = async (_url, options) => { const body = JSON.parse(options.body); purposes.push(body.text.format.name); assert.deepEqual(body.text.format.schema.properties.reasonQuestionIds.items.enum, ['cost']); assert.deepEqual(body.text.format.schema.properties.clarificationQuestionIds.items.enum, ['time']); assert(!('reasoning' in body.text.format.schema.properties)); return mockResponse(decision); };
  try { const facts = factualSummary(room); assert.deepEqual(await summarize(room), { text: facts.text, details: { answers: facts.answers, unresolved: facts.unresolved, institution: facts.institution }, ...renderAdviceChoice(facts, decision, room.language) }); assert.deepEqual(purposes, ['grounded_recommendation']); assert.equal(room.apiEvidence.at(-1).purpose, 'recommendation_choice_result'); }
  finally { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; }
});
test('invalid AI IDs or action consistency produce explicit unavailable advice with facts intact', async () => {
  const originalFetch = globalThis.fetch, originalKey = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = 'synthetic-test-key';
  try {
    for (const decision of [{ action: 'review_recorded_answers', reasonQuestionIds: ['cost'], clarificationQuestionIds: [] }, { action: 'clarify_selected_questions', reasonQuestionIds: ['invented'], clarificationQuestionIds: ['time'] }]) {
      const room = pricedSummaryRoom(); let requests = 0;
      globalThis.fetch = async () => { requests++; return mockResponse(decision); };
      const output = await summarize(room);
      assert.equal(requests, 1); assert.equal(output.text, factualSummary(room).text); assert.match(output.recommendation, /unavailable/); assert.equal(room.apiEvidence.at(-1).accepted, false);
    }
  } finally { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; }
});
test('localized structured advice preserves chosen answer qualifiers and rejects unsupported choices', () => {
  const facts = factualSummary(pricedSummaryRoom());
  const decision = { action: 'clarify_selected_questions', reasonQuestionIds: ['cost'], clarificationQuestionIds: ['time'] };
  for (const language of ['en', 'ru', 'zh']) {
    const output = renderAdviceChoice(facts, decision, language);
    assert(output.reasoning.includes('The cost may exceed 100,000 KRW.'));
    assert(!output.reasoning.includes('business-price'));
  }
  for (const choice of [{ ...decision, reasonQuestionIds: ['cost', 'cost'] }, { ...decision, clarificationQuestionIds: [] }, { ...decision, action: 'reasons' }, { action: 'try_another_simulated_option', reasonQuestionIds: [], clarificationQuestionIds: [] }]) assert.throws(() => renderAdviceChoice(facts, choice, 'en'), error => error.code === 'INVALID_ADVICE_CHOICE');
  const none = factualSummary(summaryRoom());
  assert.match(renderAdviceChoice(none, { action: 'insufficient_information', reasonQuestionIds: [], clarificationQuestionIds: [] }, 'en').reasoning, /No validated/);
});

test('selected source IDs hydrate exact original text; fabricated references stay rejected', () => {
  const hydrated = hydratePlanReview({ ...review, customerFactEvidence: [{ key: 'need', sourceMessageId: 'u1', supportReason: 'The customer asks for a haircut.' }] }, messages);
  assert.equal(hydrated.customerFactEvidence[0].sourceQuote, messages[0].text);
  assert.deepEqual(planReviewIssues(plan, hydrated, messages, 'en'), []);
  const invalid = hydratePlanReview({ ...review, customerFactEvidence: [{ key: 'need', sourceMessageId: 'truncated-u', sourceQuote: 'Fabricated quote' }] }, messages);
  assert.equal(invalid.customerFactEvidence[0].sourceQuote, '');
  assert(planReviewIssues(plan, invalid, messages, 'en').includes('ungrounded_customer_fact'));
});
test('missing Korean clause cannot pass merely because localized question covers it', () => {
  const changed = { ...review, questionMeaningChecks: [{ questionId: 'fit', faithful: false, explanation: 'Korean omitted requested service.' }, review.questionMeaningChecks[1]] };
  assert(planReviewIssues(plan, changed, messages, 'en').includes('korean_question_mismatch'));
});

test('targeted saved-plan replay does not generate an interview and stops after one repair', async () => {
  const originalFetch = globalThis.fetch, originalKey = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = 'synthetic-test-key';
  const purposes = [];
  globalThis.fetch = async (_url, options) => { const purpose = JSON.parse(options.body).text.format.name; purposes.push(purpose); const output = purpose === 'call_plan_validation' ? { ...review, approved: false, violations: [{ code: 'presupposed_answer', field: 'requiredQuestions', quote: 'initial visit', explanation: 'Prior visit is unknown.' }] } : plan; return { ok: true, json: async () => ({ id: 'synthetic-response', model: 'synthetic-model', status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] }) }; };
  try { await assert.rejects(reviewCallPlan({ language: 'en', messages, apiEvidence: [] }, plan, { maxRepairs: 1 }), error => error.code === 'AI_ERROR'); assert.deepEqual(purposes, ['call_plan_validation', 'call_plan_repair', 'call_plan_validation']); }
  finally { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; }
});

test('localized summaries reject raw Korean, transcript IDs and duplicate recommendations', () => {
  const recommendation = 'Independently identify a real provider and verify its contact information.';
  const issues = summaryOutputIssues({ text: `Business said 네, 맞습니다. (item_abc). ${recommendation}`, recommendation, reasoning: 'The simulated call ended.' }, [{ id: 'item_abc' }], 'en');
  assert(issues.includes('untranslated_korean')); assert(issues.includes('internal_evidence_id')); assert(issues.includes('duplicated_recommendation'));
  assert.deepEqual(summaryOutputIssues({ text: 'The business confirmed the readback in this fictional simulation.', recommendation, reasoning: 'Real-world facts remain unverified.' }, [{ id: 'item_abc' }], 'en'), []);
});

test('social speech and readback classification cannot author new business facts', async () => {
  const originalFetch = globalThis.fetch, originalKey = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = 'synthetic-test-key';
  const fabricated = [{ questionId: 'cost', status: 'resolved', answer: 'Not available.', evidenceQuote: '네, 죄송합니다.', reason: '', changesPriorAnswer: false }];
  try {
    for (const utteranceKind of ['social_only', 'unclear', 'readback_confirmation', 'explicit_refusal', 'substantive_answer', 'contextual_answer']) {
      globalThis.fetch = async () => mockResponse({ utteranceKind, answers: fabricated, confirmedKeyDetails: false, confirmationQuote: '', readbackEvidence: [], unavailable: false, explanation: '' });
      const result = await reviewBusiness(pricedSummaryRoom(), { id: 'synthetic-apology', text: '네, 죄송합니다.' });
      assert.deepEqual(result.answers, ['substantive_answer', 'contextual_answer'].includes(utteranceKind) ? fabricated : []);
      assert.equal(result.unavailable, utteranceKind === 'explicit_refusal');
    }
  } finally { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; }
});

test('inferred cross-question answers are discarded even in a substantive business turn', async () => {
  const originalFetch = globalThis.fetch, originalKey = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = 'synthetic-test-key';
  const explicit = { questionId: 'fit', answerBasis: 'explicit_answer', answer: 'Not in stock.' };
  globalThis.fetch = async () => mockResponse({ utteranceKind: 'substantive_answer', answers: [explicit, { questionId: 'cost', answerBasis: 'inferred', answer: 'No price because unavailable.' }] });
  try { assert.deepEqual((await reviewBusiness(pricedSummaryRoom(), { id: 'stock-only', text: '재고가 없습니다.' })).answers, [explicit]); }
  finally { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; }
});
