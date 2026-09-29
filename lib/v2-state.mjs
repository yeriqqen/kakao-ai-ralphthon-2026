import { randomUUID, randomBytes } from 'node:crypto';

const LANGUAGES = new Set(['en', 'ru', 'zh']);
const ENDED = new Set(['completed', 'interrupted', 'failed']);
const LIVE = new Set(['active', 'waiting_customer', 'awaiting_decision']);
const now = () => new Date().toISOString();
const text = value => typeof value === 'string' ? value.trim() : '';
const copy = value => structuredClone(value);

function fail(code, message, statusCode = 409) {
  const error = new Error(message); error.code = code; error.statusCode = statusCode; throw error;
}

export function touch(room) {
  room.version += 1; room.revision = room.version; room.updatedAt = now(); return room;
}

export function createRoom(language = 'en') {
  if (!LANGUAGES.has(language)) fail('INVALID_LANGUAGE', 'Choose English, Russian, or Chinese.', 400);
  const createdAt = now();
  const transcripts = [];
  return {
    id: randomUUID(), language, version: 0, revision: 0, createdAt, updatedAt: createdAt,
    customerToken: randomBytes(24).toString('base64url'), businessToken: randomBytes(24).toString('base64url'),
    messages: [], transcripts, transcript: transcripts, customerInfo: [], institutions: [], requiredQuestions: [],
    planReady: false, pendingRelay: null, decisionPrompt: null, summary: null, busy: false, error: null, voiceMessage: null,
    call: { id: null, status: 'idle', institutionId: null, authorized: false, accepted: false, authorizedAt: null, acceptedAt: null, connected: false, confirmedKeyDetails: false, confirmationEvidence: [], readbackEvidence: [], endedAt: null, reason: null, success: false },
    private: {},
  };
}

export function publicRoom(room) {
  // Explicit allowlist: never serialize access tokens, provider credentials, or private model chains.
  return copy(Object.fromEntries([
    'id', 'language', 'version', 'revision', 'createdAt', 'updatedAt', 'messages', 'transcripts',
    'customerInfo', 'institutions', 'requiredQuestions', 'planReady', 'pendingRelay', 'decisionPrompt',
    'summary', 'busy', 'error', 'voiceMessage', 'call',
  ].map(key => [key, room[key]])));
}

export function appendMessage(room, role, content, kind = 'chat') {
  const value = text(content);
  if (!value) fail('EMPTY_MESSAGE', 'Enter a message before sending.', 400);
  if (!['user', 'assistant', 'system'].includes(role)) fail('INVALID_ROLE', 'Unsupported chat role.', 400);
  const message = { id: randomUUID(), role, text: value, kind, createdAt: now() };
  room.messages.push(message); touch(room); return message;
}

export function applyPlan(room, output) {
  if (!output || typeof output !== 'object') fail('INVALID_PLAN', 'A generated plan is required.', 400);
  if (room.call.authorized && !ENDED.has(room.call.status)) fail('PLAN_LOCKED', 'The authorized call plan cannot change during a call.');
  if (Array.isArray(output.customerInfo)) {
    const previousInfo = room.customerInfo;
    const nextInfo = new Map();
    const isUserSource = id => room.messages.some(message => message.id === id && message.role === 'user');
    for (const entry of output.customerInfo) {
      if (!text(entry?.key) || !text(entry?.value)) continue;
      const previous = previousInfo.find(existing => existing.key === text(entry.key));
      const suppliedSource = text(entry.sourceMessageId);
      const unchangedSource = previous?.value === text(entry.value) ? previous.sourceMessageId : null;
      const sourceMessageId = (isUserSource(suppliedSource) ? suppliedSource : null) || (isUserSource(unchangedSource) ? unchangedSource : null) || room.messages.findLast(message => message.role === 'user')?.id || null;
      const item = { key: text(entry.key), value: text(entry.value), sourceMessageId };
      nextInfo.set(item.key, item);
    }
    // The model returns the full validated list. Replacing it removes corrected
    // facts and old synonymous keys instead of retaining contradictory values.
    room.customerInfo = [...nextInfo.values()];
  }
  if (Array.isArray(output.institutions)) {
    room.institutions = output.institutions.filter(item => text(item?.id) && text(item?.name)).map(item => ({
      id: text(item.id), name: text(item.name), nameKo: text(item.nameKo || item.korean),
      description: text(item.description || item.reason), reason: text(item.reason || item.description), fictional: true,
    }));
  }
  if (Array.isArray(output.requiredQuestions)) {
    const ids = new Set();
    room.requiredQuestions = output.requiredQuestions.filter(item => text(item?.id) && text(item?.text || item?.question) && !ids.has(item.id) && ids.add(item.id)).map(item => ({
      id: text(item.id), text: text(item.text || item.question), korean: text(item.korean || item.questionKo),
      status: 'unresolved', resolutionReason: null, answer: null, evidence: [],
    }));
  }
  room.planReady = output.readyToCall === true && room.institutions.length > 0 && room.requiredQuestions.length > 0;
  if (text(output.reply)) appendMessage(room, 'assistant', output.reply);
  touch(room); return room;
}

export function authorizeCall(room, institutionId) {
  if (!room.planReady || !room.requiredQuestions.length) fail('PLAN_NOT_READY', 'Prepare the required questions before calling.');
  const institution = room.institutions.find(item => item.id === institutionId);
  if (!institution) fail('INVALID_INSTITUTION', 'Choose a fictional institution from the generated plan.', 400);
  if (room.call.status !== 'idle' && !ENDED.has(room.call.status)) fail('CALL_ALREADY_EXISTS', 'A call is already pending or active.');
  for (const question of room.requiredQuestions) Object.assign(question, { status: 'unresolved', resolutionReason: null, answer: null, evidence: [] });
  room.pendingRelay = null; room.decisionPrompt = null; room.summary = null;
  room.call = { id: randomUUID(), status: 'pending', institutionId, authorized: true, accepted: false, authorizedAt: now(), acceptedAt: null, connected: false, confirmedKeyDetails: false, confirmationEvidence: [], readbackEvidence: [], endedAt: null, reason: null, success: false };
  touch(room); return room;
}

export function acceptCall(room) {
  if (!room.call.authorized || room.call.status !== 'pending') fail('NO_INCOMING_CALL', 'There is no authorized incoming call to accept.');
  Object.assign(room.call, { status: 'connecting', accepted: true, acceptedAt: now(), connected: false });
  touch(room); return room;
}

export function setConnection(room, connected, reason = null) {
  if (connected) {
    if (!room.call.authorized || !room.call.accepted || room.call.endedAt || !['connecting', 'active', 'waiting_customer', 'awaiting_decision', 'interrupted', 'failed'].includes(room.call.status)) {
      fail('VOICE_NOT_AUTHORIZED', 'Voice requires customer authorization and business acceptance.');
    }
    room.call.connected = true;
    room.call.status = room.pendingRelay ? 'waiting_customer' : room.decisionPrompt ? 'awaiting_decision' : 'active';
    room.call.reason = null;
  } else {
    if (room.call.endedAt) { room.call.connected = false; touch(room); return room; }
    const wasLive = room.call.connected || LIVE.has(room.call.status);
    room.call.connected = false;
    if (!room.call.endedAt && room.call.authorized && room.call.accepted) {
      room.call.status = wasLive ? 'interrupted' : 'failed'; room.call.endedAt = now();
    }
    room.call.reason = text(reason) || 'disconnected';
    room.call.success = false;
  }
  touch(room); return room;
}

export function appendTranscript(room, entry) {
  if (!room.call.authorized || !room.call.accepted) fail('VOICE_NOT_AUTHORIZED', 'No transcript is accepted before call authorization and acceptance.');
  if (room.call.endedAt && !(room.call.status === 'completed' && entry?.role === 'assistant')) fail('CALL_ENDED', 'The call has ended.');
  if (!['business', 'assistant'].includes(entry?.role) || !text(entry.text)) fail('INVALID_TRANSCRIPT', 'Transcript role and text are required.', 400);
  const id = text(entry.id) || randomUUID();
  const existing = room.transcripts.find(item => item.id === id);
  if (existing) {
    if (existing.role !== entry.role || existing.text !== text(entry.text)) fail('TRANSCRIPT_CONFLICT', 'A transcript entry cannot be replaced with different evidence.');
    return existing;
  }
  const item = { id, role: entry.role, text: text(entry.text), callId: room.call.id, createdAt: now() };
  if (item.role === 'assistant' && questionsResolved(room)) item.resolvedQuestionSnapshot = questionSnapshot(room);
  room.transcripts.push(item);
  if (item.role === 'business') { room.call.confirmedKeyDetails = false; room.call.confirmationEvidence = []; room.call.readbackEvidence = []; }
  touch(room); return item;
}

function evidenceFor(room, evidence, transcript) {
  const refs = Array.isArray(evidence) ? evidence : evidence ? [evidence] : [];
  if (!refs.length) return null;
  const result = [];
  for (const ref of refs) {
    const quote = text(typeof ref === 'string' ? ref : ref.quote || ref.text);
    const id = typeof ref === 'object' ? text(ref.transcriptId || ref.id) : '';
    const entry = id ? room.transcripts.find(item => item.id === id) : transcript && room.transcripts.find(item => item.id === transcript.id);
    if (!quote || !entry || entry.role !== 'business' || entry.callId !== room.call.id || !entry.text.includes(quote)) return null;
    result.push({ transcriptId: entry.id, quote, role: 'business' });
  }
  return result;
}

function questionsResolved(room) {
  return room.requiredQuestions.length > 0 && room.requiredQuestions.every(question => question.status === 'resolved' && text(question.answer) && evidenceFor(room, question.evidence));
}

function questionSnapshot(room) {
  return copy(room.requiredQuestions.map(({ id, answer, evidence }) => ({ id, answer, evidence })));
}

function readbackFor(room, refs, business, expectedSnapshot = questionSnapshot(room)) {
  if (!Array.isArray(refs) || !refs.length || business?.role !== 'business' || business.callId !== room.call.id) return null;
  const businessIndex = room.transcripts.findIndex(item => item.id === business.id);
  const assistant = room.transcripts.slice(0, businessIndex).findLast(item => item.role === 'assistant' && item.callId === room.call.id);
  if (!assistant?.resolvedQuestionSnapshot || JSON.stringify(assistant.resolvedQuestionSnapshot) !== JSON.stringify(expectedSnapshot)) return null;
  const assistantIndex = room.transcripts.indexOf(assistant);
  // A readback must follow every answer it summarizes. Merely asking the
  // original questions before receiving the answers is never a readback.
  if (expectedSnapshot.some(question => question.evidence.some(ref => {
    const index = room.transcripts.findIndex(item => item.id === ref.transcriptId);
    return index < 0 || index >= assistantIndex;
  }))) return null;
  const ids = new Set(room.requiredQuestions.map(question => question.id));
  if (refs.some(ref => !ids.has(ref.questionId) || ref.transcriptId !== assistant.id || !text(ref.quote) || !assistant.text.includes(text(ref.quote)))) return null;
  if ([...ids].some(id => !refs.some(ref => ref.questionId === id))) return null;
  return refs.map(ref => ({ questionId: ref.questionId, transcriptId: assistant.id, quote: text(ref.quote), role: 'assistant' }));
}

export function applyBusinessReview(room, updates, transcript = null) {
  if (!room.call.authorized || !room.call.accepted || !room.call.connected || room.call.endedAt) fail('CALL_NOT_ACTIVE', 'Business review requires an accepted active call.');
  const review = Array.isArray(updates) ? { answers: updates } : updates || {};
  const current = typeof transcript === 'string' ? room.transcripts.find(item => item.id === transcript) : transcript;
  const resolvedBeforeReview = questionsResolved(room);
  const answersBeforeReview = questionSnapshot(room);
  for (const update of review.answers || []) {
    const question = room.requiredQuestions.find(item => item.id === (update.id || update.questionId));
    if (!question) continue;
    const quote = update.evidenceQuote || update.quote;
    const evidence = evidenceFor(room, update.evidence || (quote ? [{ transcriptId: update.transcriptId || current?.id, quote }] : []), current);
    // A later greeting, confirmation, or unrelated reply is not a retraction.
    // Keep supported facts unless the review identifies an explicit, quoted
    // correction of the earlier answer.
    if (question.status === 'resolved' && (update.changesPriorAnswer !== true || !evidence)) continue;
    const resolved = (update.status === 'resolved' || update.resolved === true) && !['unresolved', 'unclear', 'unavailable'].includes(update.status) && update.meaningful !== false && text(update.answer) && evidence;
    const previous = JSON.stringify({ answer: question.answer, evidence: question.evidence });
    if (resolved) {
      // A repeated identical answer need not replace the original supported
      // evidence and invalidate an otherwise correct subsequent readback.
      const retainedEvidence = question.status === 'resolved' && question.answer === text(update.answer) && evidenceFor(room, question.evidence) ? question.evidence : evidence;
      Object.assign(question, { status: 'resolved', resolutionReason: null, answer: text(update.answer), evidence: retainedEvidence });
    } else {
      Object.assign(question, { status: 'unresolved', resolutionReason: !evidence && (update.status === 'resolved' || update.resolved === true) ? 'unsupported_evidence' : text(update.reason || update.resolutionReason) || (update.status !== 'resolved' ? text(update.status) : '') || 'unclear', answer: null, evidence: evidence || [] });
    }
    if (previous !== JSON.stringify({ answer: question.answer, evidence: question.evidence })) {
      room.call.confirmedKeyDetails = false; room.call.confirmationEvidence = []; room.call.readbackEvidence = [];
    }
  }
  if (review.confirmedKeyDetails === true) {
    const evidence = evidenceFor(room, review.confirmationEvidence || (review.confirmationQuote ? [{ transcriptId: review.confirmationTranscriptId || current?.id, quote: review.confirmationQuote }] : []), current);
    const readback = resolvedBeforeReview && JSON.stringify(answersBeforeReview) === JSON.stringify(questionSnapshot(room))
      ? readbackFor(room, review.readbackEvidence, current, answersBeforeReview) : null;
    if (evidence && evidence.every(ref => ref.transcriptId === current?.id) && readback && questionsResolved(room)) {
      room.call.confirmedKeyDetails = true; room.call.confirmationEvidence = evidence; room.call.readbackEvidence = readback;
    }
  }
  touch(room); return room;
}

export function requestRelay(room, key, question) {
  if (!room.call.connected || !room.call.accepted || room.call.endedAt) fail('CALL_NOT_ACTIVE', 'A relay requires an active accepted call.');
  if (!text(key) || !text(question)) fail('INVALID_RELAY', 'A detail key and localized question are required.', 400);
  const known = room.customerInfo.find(item => item.key === key && text(item.value));
  if (known) return { known: true, key, value: known.value, sourceMessageId: known.sourceMessageId };
  if (room.pendingRelay) fail('RELAY_PENDING', 'Wait for the current customer answer.');
  room.pendingRelay = { id: randomUUID(), key, question: text(question), status: 'pending', askedAt: now() };
  room.call.status = 'waiting_customer'; touch(room); return room.pendingRelay;
}

export function resolveRelay(room, message) {
  if (!room.pendingRelay || room.call.endedAt) fail('NO_PENDING_RELAY', 'There is no pending customer question.');
  const value = text(typeof message === 'string' ? message : message?.text);
  if (!value) fail('EMPTY_RELAY_ANSWER', 'Enter an answer or choose how to proceed.', 400);
  const latest = room.messages.at(-1);
  const entry = typeof message === 'object' && message.id ? room.messages.find(item => item.id === message.id && item.role === 'user' && item.text === value)
    : latest?.role === 'user' && latest.text === value ? latest : appendMessage(room, 'user', value, 'relay');
  if (!entry) fail('INVALID_RELAY_SOURCE', 'The relay response must come from a customer message.', 400);
  const resolved = { ...room.pendingRelay, answer: value, sourceMessageId: entry.id, answeredAt: now(), status: 'answered' };
  room.customerInfo.push({ key: resolved.key, value, sourceMessageId: entry.id });
  room.pendingRelay = null;
  if (room.call.connected) room.call.status = room.decisionPrompt ? 'awaiting_decision' : 'active';
  touch(room); return resolved;
}

export function canComplete(room) {
  return Boolean(room.call.authorized && room.call.accepted && room.call.connected && !room.call.endedAt
    && room.call.status === 'active' && !room.pendingRelay && !room.decisionPrompt
    && questionsResolved(room)
    && room.call.confirmedKeyDetails && evidenceFor(room, room.call.confirmationEvidence)
    && readbackFor(room, room.call.readbackEvidence, room.transcripts.find(item => item.id === room.call.confirmationEvidence?.[0]?.transcriptId)));
}

export function finishCall(room, { reason = '', success = false } = {}) {
  if (!room.call.authorized || room.call.status === 'idle') fail('NO_CALL', 'There is no authorized call to finish.');
  if (room.call.endedAt) return room;
  if (success && !canComplete(room)) fail('INCOMPLETE_CALL', 'Resolve every required question and confirm key details before completing.');
  const wasAccepted = room.call.accepted;
  Object.assign(room.call, { status: success ? 'completed' : room.call.status === 'failed' ? 'failed' : wasAccepted ? 'interrupted' : 'failed', connected: false, success: Boolean(success), endedAt: now(), reason: text(reason) || (success ? 'completed' : 'ended_early') });
  touch(room); return room;
}
