import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRoom, publicRoom, appendMessage, applyPlan, authorizeCall, acceptCall, setConnection,
  appendTranscript, applyBusinessReview, requestRelay, resolveRelay, canComplete, finishCall,
} from '../lib/v2-state.mjs';

function planned(language = 'en') {
  const room = createRoom(language);
  const source = appendMessage(room, 'user', 'I want to go to a hospital. My child is 7.');
  applyPlan(room, {
    reply: 'I will check current opening and walk-in availability with a fictional clinic.',
    customerInfo: [{ key: 'child_age', value: '7 years', sourceMessageId: source.id }],
    institutions: [{ id: 'fictional-clinic', name: 'Fictional Demo Clinic', description: 'Fictional institution for this test.' }],
    requiredQuestions: [
      { id: 'opening', text: 'Are you open now?', korean: '지금 진료하시나요?' },
      { id: 'walkin', text: 'Can we visit without an appointment?', korean: '예약 없이 방문해도 되나요?' },
    ], readyToCall: true,
  });
  return room;
}

function active() {
  const room = planned(); authorizeCall(room, 'fictional-clinic'); acceptCall(room); setConnection(room, true); return room;
}

function resolveQuestions(room) {
  const business = appendTranscript(room, { id: 'business-answer', role: 'business', text: '오늘은 진료합니다. 예약 없이 오셔도 됩니다.' });
  applyBusinessReview(room, { answers: [
    { id: 'opening', status: 'resolved', meaningful: true, answer: 'Open now', evidence: [{ transcriptId: business.id, quote: '오늘은 진료합니다.' }] },
    { id: 'walkin', status: 'resolved', meaningful: true, answer: 'Walk-in visits accepted', evidence: [{ transcriptId: business.id, quote: '예약 없이 오셔도 됩니다.' }] },
  ] }, business);
  return business;
}

function confirmReadback(room) {
  const readback = appendTranscript(room, { id: 'readback', role: 'assistant', text: '오늘 진료하고 예약 없이 방문할 수 있다는 말씀이 맞나요?' });
  const confirmation = appendTranscript(room, { id: 'business-confirmation', role: 'business', text: '네, 맞습니다.' });
  applyBusinessReview(room, { answers: [], confirmedKeyDetails: true, confirmationQuote: '네, 맞습니다.', readbackEvidence: room.requiredQuestions.map(question => ({ questionId: question.id, transcriptId: readback.id, quote: readback.text })) }, confirmation);
}

test('v2 defaults to English and accepts all three configured languages', () => {
  assert.equal(createRoom().language, 'en');
  for (const language of ['en', 'ru', 'zh']) assert.equal(createRoom(language).language, language);
  assert.throws(() => createRoom('ko'), error => error.code === 'INVALID_LANGUAGE' && error.statusCode === 400);
});

test('public room never leaks access tokens or private provider chains and is detached', () => {
  const room = planned();
  room.private = { providerApiKey: 'synthetic-secret', previousResponseId: 'private-chain' };
  room.apiKey = 'another-synthetic-secret';
  const result = publicRoom(room);
  const serialized = JSON.stringify(result);
  for (const hidden of [room.customerToken, room.businessToken, 'synthetic-secret', 'private-chain']) assert.equal(serialized.includes(hidden), false);
  result.requiredQuestions[0].status = 'resolved';
  assert.equal(room.requiredQuestions[0].status, 'unresolved');
});

test('voice, acceptance, and transcript entry are forbidden before customer authorization', () => {
  const room = planned();
  assert.equal(room.call.status, 'idle');
  assert.equal(room.call.connected, false);
  assert.throws(() => acceptCall(room), { code: 'NO_INCOMING_CALL' });
  assert.throws(() => setConnection(room, true), { code: 'VOICE_NOT_AUTHORIZED' });
  assert.throws(() => appendTranscript(room, { role: 'business', text: '네.' }), { code: 'VOICE_NOT_AUTHORIZED' });
  assert.equal(room.transcripts.length, 0);
});

test('authorizing creates only a pending call; acceptance and connection are separate transitions', () => {
  const room = planned(); authorizeCall(room, 'fictional-clinic');
  assert.equal(room.call.status, 'pending');
  assert.equal(room.call.connected, false);
  assert.throws(() => setConnection(room, true), { code: 'VOICE_NOT_AUTHORIZED' });
  acceptCall(room);
  assert.equal(room.call.status, 'connecting');
  assert.equal(room.call.connected, false);
  setConnection(room, true);
  assert.equal(room.call.status, 'active');
  assert.equal(room.call.connected, true);
  assert.throws(() => authorizeCall(room, 'fictional-clinic'), { code: 'CALL_ALREADY_EXISTS' });
});

test('generated questions and a chosen fictional institution are required before authorization', () => {
  assert.throws(() => authorizeCall(createRoom(), 'unknown'), { code: 'PLAN_NOT_READY' });
  const room = planned();
  assert.throws(() => authorizeCall(room, 'not-generated'), { code: 'INVALID_INSTITUTION' });
  assert.equal(room.institutions[0].fictional, true);
});

test('required plan stays fixed while the authorized call is in progress', () => {
  const room = active();
  assert.throws(() => applyPlan(room, { requiredQuestions: [], readyToCall: true }), { code: 'PLAN_LOCKED' });
  assert.equal(room.requiredQuestions.length, 2);
});

test('a full corrected customer fact list replaces obsolete keys and keeps verified original sources', () => {
  const room = createRoom();
  const original = appendMessage(room, 'user', 'I am 27 and prefer a female doctor.');
  applyPlan(room, { customerInfo: [
    { key: 'age', value: '27', sourceMessageId: original.id },
    { key: 'preferred_gender_of_doctor', value: 'female', sourceMessageId: original.id },
  ] });
  const correction = appendMessage(room, 'user', 'Correction: I am 28.');
  appendMessage(room, 'user', 'Please prepare the plan now.');
  applyPlan(room, { customerInfo: [
    { key: 'age', value: '28', sourceMessageId: correction.id },
    { key: 'doctor_gender_preference', value: 'female', sourceMessageId: original.id },
  ] });
  assert.deepEqual(room.customerInfo, [
    { key: 'age', value: '28', sourceMessageId: correction.id },
    { key: 'doctor_gender_preference', value: 'female', sourceMessageId: original.id },
  ]);
  applyPlan(room, { reply: 'I have preserved your details.' });
  assert.equal(room.customerInfo.length, 2, 'Omitting the full-list field does not clear existing facts.');
  applyPlan(room, { customerInfo: [] });
  assert.deepEqual(room.customerInfo, [], 'An explicit empty full list removes all former facts.');
});

test('empty messages and empty relay replies give safe errors without fabricating state', () => {
  const room = active();
  assert.throws(() => appendMessage(room, 'user', '  '), { code: 'EMPTY_MESSAGE' });
  requestRelay(room, 'first_visit', 'Is this your first visit?');
  assert.throws(() => resolveRelay(room, ''), { code: 'EMPTY_RELAY_ANSWER' });
  assert.equal(room.call.status, 'waiting_customer');
  assert.ok(room.pendingRelay);
  assert.equal(room.customerInfo.some(item => item.key === 'first_visit'), false);
});

test('known customer information is reused without a duplicate relay', () => {
  const room = active();
  const answer = requestRelay(room, 'child_age', 'How old is your child?');
  assert.equal(answer.known, true);
  assert.equal(answer.value, '7 years');
  assert.equal(room.pendingRelay, null);
  assert.equal(room.call.status, 'active');
});

test('an unknown detail pauses and resolves only from the customer response', () => {
  const room = active();
  const pending = requestRelay(room, 'first_visit', 'Is this your first visit?');
  assert.equal(pending.key, 'first_visit');
  assert.equal(room.call.status, 'waiting_customer');
  assert.equal(canComplete(room), false);
  assert.throws(() => requestRelay(room, 'another_detail', 'Another question?'), { code: 'RELAY_PENDING' });
  const response = resolveRelay(room, 'Yes, first visit.');
  assert.equal(response.answer, 'Yes, first visit.');
  assert.equal(room.pendingRelay, null);
  assert.equal(room.call.status, 'active');
  assert.equal(requestRelay(room, 'first_visit', 'Again?').value, 'Yes, first visit.');
});

test('a late relay answer clears the waiting decision and resumes without a separate Continue action', () => {
  for (const prompt of ['The answer has not arrived. Keep waiting or end?', null]) {
    const room = active(); requestRelay(room, 'first_visit', 'Is this your first visit?');
    room.call.status = 'awaiting_decision'; room.decisionPrompt = prompt;
    assert.throws(() => resolveRelay(room, '  '), { code: 'EMPTY_RELAY_ANSWER' });
    assert.equal(room.call.status, 'awaiting_decision');
    assert.ok(room.pendingRelay);
    const answer = appendMessage(room, 'user', 'Yes, this is my first visit.', 'relay');
    const result = resolveRelay(room, answer);
    assert.equal(result.sourceMessageId, answer.id);
    assert.equal(room.call.status, 'active');
    assert.equal(room.decisionPrompt, null);
    assert.equal(room.pendingRelay, null);
    assert.equal(room.customerInfo.find(item => item.key === 'first_visit').value, answer.text);
    assert.equal(room.messages.filter(message => message.id === answer.id).length, 1);
  }
});

test('missing, fabricated and assistant-only evidence cannot confirm business answers', () => {
  for (const evidence of [[], [{ transcriptId: 'missing', quote: 'We are open.' }], [{ transcriptId: 'assistant', quote: 'We are open.' }], [{ transcriptId: 'business', quote: 'We are open.' }]]) {
    const room = active();
    appendTranscript(room, { id: 'assistant', role: 'assistant', text: 'We are open.' });
    appendTranscript(room, { id: 'business', role: 'business', text: 'I cannot confirm opening hours.' });
    applyBusinessReview(room, [{ id: 'opening', status: 'resolved', answer: 'Open now', evidence }]);
    assert.equal(room.requiredQuestions[0].status, 'unresolved');
    assert.equal(room.requiredQuestions[0].answer, null);
    assert.equal(room.requiredQuestions[0].resolutionReason, 'unsupported_evidence');
  }
});

test('exact quotes from stored business transcripts can support answers', () => {
  const room = active(); resolveQuestions(room);
  assert.ok(room.requiredQuestions.every(question => question.status === 'resolved'));
  assert.deepEqual(room.requiredQuestions[0].evidence, [{ transcriptId: 'business-answer', quote: '오늘은 진료합니다.', role: 'business' }]);
  assert.equal(canComplete(room), false, 'A final readback confirmation is still missing.');
});

test('unclear and unavailable information do not resolve questions even with genuine quotes', () => {
  for (const status of ['unclear', 'unavailable']) {
    const room = active();
    const transcript = appendTranscript(room, { id: 'business', role: 'business', text: '잘 모르겠습니다. 알려드릴 수 없습니다.' });
    applyBusinessReview(room, [{ id: 'opening', status, answer: 'Cannot answer', evidence: [{ transcriptId: transcript.id, quote: transcript.text }] }], transcript);
    assert.equal(room.requiredQuestions[0].status, 'unresolved');
    assert.equal(room.requiredQuestions[0].resolutionReason, status);
    assert.equal(canComplete(room), false);
  }
});

test('a supported concrete negative answer meaningfully resolves its question', () => {
  const room = active();
  const transcript = appendTranscript(room, { id: 'closed', role: 'business', text: '지금은 문을 닫았습니다.' });
  applyBusinessReview(room, [{ id: 'opening', status: 'resolved', answer: 'Closed now', meaningful: true, quote: transcript.text }], transcript);
  assert.equal(room.requiredQuestions[0].status, 'resolved');
  assert.equal(room.requiredQuestions[0].answer, 'Closed now');
  assert.equal(room.requiredQuestions[1].status, 'unresolved');
});

test('normal completion requires all questions, no pending relay, and supported final readback confirmation', () => {
  const room = active();
  assert.throws(() => finishCall(room, { success: true }), { code: 'INCOMPLETE_CALL' });
  resolveQuestions(room);
  assert.throws(() => finishCall(room, { success: true }), { code: 'INCOMPLETE_CALL' });
  confirmReadback(room);
  assert.equal(canComplete(room), true);
  requestRelay(room, 'arrival', 'When will you arrive?');
  assert.equal(canComplete(room), false);
  resolveRelay(room, 'In 30 minutes.');
  assert.equal(canComplete(room), true);
  finishCall(room, { success: true, reason: 'all_required_answers_confirmed' });
  assert.equal(room.call.status, 'completed');
  assert.equal(room.call.success, true);
  assert.equal(room.call.connected, false);
});

test('fabricated or assistant-only final confirmation never enables completion', () => {
  const room = active(); resolveQuestions(room);
  const assistant = appendTranscript(room, { id: 'fake-confirmation', role: 'assistant', text: 'Yes, confirmed.' });
  applyBusinessReview(room, { answers: [], confirmedKeyDetails: true, confirmationQuote: 'Yes, confirmed.' }, assistant);
  assert.equal(room.call.confirmedKeyDetails, false);
  assert.equal(canComplete(room), false);
});

test('changed evidence invalidates old readback confirmation', () => {
  const room = active(); resolveQuestions(room); confirmReadback(room);
  const updated = appendTranscript(room, { id: 'correction', role: 'business', text: '예약 없이는 안 됩니다.' });
  applyBusinessReview(room, [{ id: 'walkin', status: 'resolved', answer: 'Appointment required', quote: updated.text, changesPriorAnswer: true }], updated);
  assert.equal(room.call.confirmedKeyDetails, false);
  assert.equal(canComplete(room), false);
});

test('disconnect clears the active indicator and cannot masquerade as success', () => {
  const room = active(); resolveQuestions(room); confirmReadback(room);
  setConnection(room, false, 'network_lost');
  assert.equal(room.call.connected, false);
  assert.equal(room.call.status, 'interrupted');
  assert.equal(room.call.success, false);
  assert.equal(canComplete(room), false);
  assert.ok(room.call.endedAt);
  assert.throws(() => setConnection(room, true), { code: 'VOICE_NOT_AUTHORIZED' });
  finishCall(room, { success: true });
  assert.equal(room.call.success, false, 'A terminal interrupted call cannot be upgraded to success.');
});

test('microphone connection failure and early ending preserve unresolved questions', () => {
  const room = planned(); authorizeCall(room, 'fictional-clinic'); acceptCall(room);
  setConnection(room, false, 'microphone_denied');
  assert.equal(room.call.status, 'failed');
  assert.equal(room.call.connected, false);
  finishCall(room, { success: false, reason: 'user_ended_early' });
  assert.equal(room.call.success, false);
  assert.ok(room.requiredQuestions.every(question => question.status === 'unresolved'));
  assert.throws(() => setConnection(room, true), { code: 'VOICE_NOT_AUTHORIZED' });
});

test('stored transcript evidence cannot be replaced with different text', () => {
  const room = active(); resolveQuestions(room);
  assert.throws(() => appendTranscript(room, { id: 'business-answer', role: 'business', text: 'Different fact.' }), { code: 'TRANSCRIPT_CONFLICT' });
  assert.equal(room.transcripts.find(entry => entry.id === 'business-answer').text, '오늘은 진료합니다. 예약 없이 오셔도 됩니다.');
});

test('AI evidenceQuote schema is supported and a pre-appended relay message is not duplicated', () => {
  const room = active();
  const transcript = appendTranscript(room, { id: 'schema', role: 'business', text: '오늘은 진료합니다.' });
  applyBusinessReview(room, { answers: [{ questionId: 'opening', status: 'resolved', answer: 'Open now', evidenceQuote: transcript.text, reason: '' }], confirmedKeyDetails: false, confirmationQuote: '' }, transcript);
  assert.equal(room.requiredQuestions[0].status, 'resolved');
  requestRelay(room, 'first_visit', 'First visit?');
  const message = appendMessage(room, 'user', 'Yes.');
  const count = room.messages.length;
  const resolved = resolveRelay(room, 'Yes.');
  assert.equal(room.messages.length, count);
  assert.equal(resolved.sourceMessageId, message.id);
});

test('normal connection cleanup after completion does not erase a successful result', () => {
  const room = active(); resolveQuestions(room); confirmReadback(room); finishCall(room, { success: true });
  setConnection(room, false, 'peer_closed_after_goodbye');
  assert.equal(room.call.status, 'completed');
  assert.equal(room.call.success, true);
  assert.equal(room.call.reason, 'completed');
});

test('a later call cannot cite business evidence from an earlier call', () => {
  const room = active(); const old = resolveQuestions(room); finishCall(room, { success: false });
  authorizeCall(room, 'fictional-clinic'); acceptCall(room); setConnection(room, true);
  applyBusinessReview(room, [{ id: 'opening', status: 'resolved', answer: 'Open', evidenceQuote: '오늘은 진료합니다.' }], old);
  assert.equal(room.requiredQuestions[0].status, 'unresolved');
  assert.equal(room.requiredQuestions[0].resolutionReason, 'unsupported_evidence');
});

test('completed assistant goodbye can be saved but later business answers are rejected', () => {
  const room = active(); resolveQuestions(room); confirmReadback(room); finishCall(room, { success: true });
  appendTranscript(room, { id: 'goodbye', role: 'assistant', text: '감사합니다. 안녕히 계세요.' });
  assert.equal(room.transcripts.at(-1).id, 'goodbye');
  assert.throws(() => appendTranscript(room, { id: 'late-answer', role: 'business', text: '다른 답변입니다.' }), { code: 'CALL_ENDED' });
  assert.equal(room.call.success, true);
});

test('a new business utterance invalidates previous confirmation until reviewed again', () => {
  const room = active(); resolveQuestions(room); confirmReadback(room);
  assert.equal(canComplete(room), true);
  appendTranscript(room, { id: 'clarification', role: 'business', text: '잠깐만요, 다시 확인해야 합니다.' });
  assert.equal(room.call.confirmedKeyDetails, false);
  assert.equal(canComplete(room), false);
});

test('an erroneous model confirmation flag on the first answers cannot skip the readback', () => {
  const room = active();
  const questions = appendTranscript(room, { id: 'initial-questions', role: 'assistant', text: '지금 진료하시나요? 예약 없이 갈 수 있나요?' });
  const business = appendTranscript(room, { id: 'first-answers', role: 'business', text: '네, 지금 진료합니다. 예약 없이 오셔도 됩니다.' });
  applyBusinessReview(room, {
    answers: [
      { questionId: 'opening', status: 'resolved', answer: 'Open now', evidenceQuote: '지금 진료합니다.' },
      { questionId: 'walkin', status: 'resolved', answer: 'Walk-ins accepted', evidenceQuote: '예약 없이 오셔도 됩니다.' },
    ],
    confirmedKeyDetails: true, confirmationQuote: business.text,
    readbackEvidence: room.requiredQuestions.map(q => ({ questionId: q.id, transcriptId: questions.id, quote: questions.text })),
  }, business);
  assert.ok(room.requiredQuestions.every(q => q.status === 'resolved'));
  assert.equal(room.call.confirmedKeyDetails, false);
  assert.equal(canComplete(room), false);
  assert.throws(() => finishCall(room, { success: true }), { code: 'INCOMPLETE_CALL' });
});

test('readback confirmation requires exact assistant citations covering every required question', () => {
  for (const invalid of ['missing', 'partial', 'fabricated_quote', 'wrong_transcript', 'wrong_question']) {
    const room = active(); resolveQuestions(room);
    const readback = appendTranscript(room, { id: 'full-readback', role: 'assistant', text: '오늘 진료하고 예약 없이 방문 가능합니다. 맞나요?' });
    const business = appendTranscript(room, { id: 'confirmation', role: 'business', text: '네, 맞습니다.' });
    let refs = room.requiredQuestions.map(q => ({ questionId: q.id, transcriptId: readback.id, quote: readback.text }));
    if (invalid === 'missing') refs = [];
    if (invalid === 'partial') refs.pop();
    if (invalid === 'fabricated_quote') refs[0].quote = 'This was never said.';
    if (invalid === 'wrong_transcript') refs[0].transcriptId = business.id;
    if (invalid === 'wrong_question') refs[0].questionId = 'not-required';
    applyBusinessReview(room, { answers: [], confirmedKeyDetails: true, confirmationQuote: business.text, readbackEvidence: refs }, business);
    assert.equal(canComplete(room), false, invalid);
  }
});

test('a generic confirmation does not erase supported answers when the review repeats unresolved entries', () => {
  const room = active(); resolveQuestions(room);
  const before = structuredClone(room.requiredQuestions);
  const readback = appendTranscript(room, { id: 'full-readback', role: 'assistant', text: '오늘 진료하며 예약 없이 방문할 수 있다는 뜻이 맞습니까?' });
  const business = appendTranscript(room, { id: 'confirmation', role: 'business', text: '네, 맞습니다.' });
  applyBusinessReview(room, {
    answers: room.requiredQuestions.map(q => ({ questionId: q.id, status: 'unresolved', answer: '', evidenceQuote: business.text, changesPriorAnswer: false, reason: 'This turn only says yes.' })),
    confirmedKeyDetails: true, confirmationQuote: business.text,
    readbackEvidence: room.requiredQuestions.map(q => ({ questionId: q.id, transcriptId: readback.id, quote: readback.text })),
  }, business);
  assert.deepEqual(room.requiredQuestions, before);
  assert.equal(canComplete(room), true);
});

test('a correction after the readback invalidates its fact snapshot until a new readback', () => {
  const room = active(); resolveQuestions(room);
  const oldReadback = appendTranscript(room, { id: 'old-readback', role: 'assistant', text: '오늘 진료하고 예약 없이 갈 수 있나요?' });
  const correction = appendTranscript(room, { id: 'correction', role: 'business', text: '아니요, 예약이 필요합니다.' });
  applyBusinessReview(room, {
    answers: [{ questionId: 'walkin', status: 'resolved', answer: 'Appointment required', evidenceQuote: correction.text, changesPriorAnswer: true }],
    confirmedKeyDetails: true, confirmationQuote: correction.text,
    readbackEvidence: room.requiredQuestions.map(q => ({ questionId: q.id, transcriptId: oldReadback.id, quote: oldReadback.text })),
  }, correction);
  assert.equal(room.requiredQuestions.find(q => q.id === 'walkin').answer, 'Appointment required');
  assert.equal(canComplete(room), false);
  const readback = appendTranscript(room, { id: 'corrected-readback', role: 'assistant', text: '오늘 진료하고 사전 예약이 필요하다는 말씀이 맞나요?' });
  const confirmation = appendTranscript(room, { id: 'new-confirmation', role: 'business', text: '네, 맞습니다.' });
  applyBusinessReview(room, { answers: [], confirmedKeyDetails: true, confirmationQuote: confirmation.text, readbackEvidence: room.requiredQuestions.map(q => ({ questionId: q.id, transcriptId: readback.id, quote: readback.text })) }, confirmation);
  assert.equal(canComplete(room), true);
});

test('an identical repeated answer preserves its original evidence through confirmation', () => {
  const room = active(); resolveQuestions(room);
  const original = structuredClone(room.requiredQuestions[0].evidence);
  const readback = appendTranscript(room, { id: 'readback', role: 'assistant', text: '오늘 진료하고 예약 없이 방문할 수 있다는 말씀이 맞나요?' });
  const business = appendTranscript(room, { id: 'confirmation', role: 'business', text: '네, 오늘 진료하고 예약 없이 방문 가능합니다.' });
  applyBusinessReview(room, {
    answers: [{ questionId: 'opening', status: 'resolved', answer: 'Open now', evidenceQuote: '오늘 진료하고', changesPriorAnswer: true }],
    confirmedKeyDetails: true, confirmationQuote: business.text,
    readbackEvidence: room.requiredQuestions.map(q => ({ questionId: q.id, transcriptId: readback.id, quote: readback.text })),
  }, business);
  assert.deepEqual(room.requiredQuestions[0].evidence, original);
  assert.equal(canComplete(room), true);
});
