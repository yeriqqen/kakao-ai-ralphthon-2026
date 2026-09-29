import test from 'node:test';
import assert from 'node:assert/strict';
import { planReviewIssues, hydratePlanReview, summaryOutputIssues } from '../lib/v2-plan-guard.mjs';
import { interview, summarize, reviewCallPlan } from '../lib/v2-ai.mjs';
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
test('summary rejects fabricated supporting transcript references even if reviewer approves', async () => {
  const originalFetch = globalThis.fetch, originalKey = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = 'synthetic-test-key'; let requests = 0;
  globalThis.fetch = async (_url, options) => { requests++; const purpose = JSON.parse(options.body).text.format.name; const output = purpose === 'summary_validation' ? { approved: true, violations: [], businessClaimEvidence: [{ claim: 'Service available', transcriptId: 'assistant-question', quote: 'Can you provide the service?' }] } : { text: 'Service available.', recommendation: 'Visit this fictional place.', reasoning: 'Available.' }; return { ok: true, json: async () => ({ id: 'synthetic-response', model: 'synthetic-model', status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] }) }; };
  try { await assert.rejects(summarize(summaryRoom()), error => error.code === 'AI_ERROR'); assert.equal(requests, 4); }
  finally { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; }
});
test('summary repair cannot publish fictional contact advice without fresh approval', async () => {
  const originalFetch = globalThis.fetch, originalKey = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = 'synthetic-test-key';
  const safe = { text: 'The simulation ended incompletely. No substantive business answers were obtained.', recommendation: 'Find and verify a real provider independently.', reasoning: 'The fictional place has no verified real contact details.' };
  const responses = [{ text: 'A call was attempted.', recommendation: 'Email Fictional East Studio.', reasoning: 'Ask them.' }, { approved: false, violations: ['Recommends contacting an imaginary place.'], businessClaimEvidence: [] }, safe, { approved: true, violations: [], businessClaimEvidence: [] }];
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ id: 'synthetic-response', model: 'synthetic-model', status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(responses.shift()) }] }] }) });
  try { assert.deepEqual(await summarize(summaryRoom()), safe); assert.equal(responses.length, 0); }
  finally { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; }
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
