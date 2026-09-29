import http from 'node:http';
import https from 'node:https';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { config, apiError } from './lib/v2-config.mjs';
import * as state from './lib/v2-state.mjs';
import * as ai from './lib/v2-ai.mjs';

const cfg = config();
const root = path.resolve(fileURLToPath(new URL('./public/', import.meta.url)));
const rooms = new Map();
const terminal = new Set(['completed', 'interrupted', 'failed']);
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }); res.end(JSON.stringify(data)); };
const matches = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const touch = room => state.touch(room);
const pub = room => state.publicRoom(room);
async function body(req, raw = false) {
  let text = '';
  for await (const chunk of req) { text += chunk; if (text.length > 250000) throw apiError('INVALID_INPUT', 413); }
  if (raw) return text;
  try { return JSON.parse(text || '{}'); } catch { throw apiError('INVALID_INPUT'); }
}
function requireRole(role, expected) { if (role !== expected) throw apiError('UNAUTHORIZED', 403); }
function messageText(value) { if (typeof value !== 'string' || !value.trim() || value.length > 8000) throw apiError('INVALID_INPUT'); return value.trim(); }
async function exclusive(room, action) {
  if (room.busy) throw apiError('BUSY', 409);
  room.busy = true; room.error = null; touch(room);
  try { return await action(); }
  catch (error) { room.error = { code: error.code || 'AI_ERROR', message: error.code || 'AI_ERROR' }; throw error; }
  finally { room.busy = false; touch(room); }
}
async function saveEvidence(room) {
  const dir = fileURLToPath(new URL('./artifacts/v2/local-runs/', import.meta.url));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${room.id}.json`), JSON.stringify({ simulation: true, realTelephoneCall: false, aiProvider: 'OpenAI', hardwareVerification: room.observations || [], ...pub(room), apiEvidence: room.apiEvidence || [], voiceDiagnostics: room.voiceDiagnostics || [], savedAt: new Date().toISOString() }, null, 2) + '\n');
}
async function finalSummary(room) {
  if (room.summary || room.summaryPending) return;
  const callId = room.call.id;
  room.summaryPending = true; touch(room);
  try {
    const summary = await ai.summarize(room);
    if (room.call.id !== callId) return;
    room.summary = summary;
    state.appendMessage(room, 'assistant', [room.summary.text, room.summary.recommendation, room.summary.reasoning].join('\n\n'), 'summary');
  } catch (error) { room.error = { code: error.code || 'AI_ERROR', message: 'Summary is not available yet.' }; }
  finally { room.summaryPending = false; touch(room); await saveEvidence(room); }
}
async function askDecision(room, reasonKorean) {
  if (terminal.has(room.call.status) || room.decisionPrompt) return;
  const callId = room.call.id;
  room.call.status = 'awaiting_decision'; touch(room);
  const result = await ai.decisionQuestion(room, reasonKorean);
  if (room.call.id !== callId || room.call.endedAt || room.call.status !== 'awaiting_decision') return;
  room.decisionPrompt = result.message;
  state.appendMessage(room, 'assistant', result.message, 'decision'); touch(room);
}
async function resolveCustomerDetail(room, key, questionKorean) {
  if (room.pendingRelay) return { ok: true, pending: true, message: 'Wait for the customer to answer the existing question.' };
  const callId = room.call.id;
  const answer = await ai.relayQuestion(room, key, questionKorean);
  if (room.call.id !== callId || terminal.has(room.call.status)) throw apiError('INVALID_STATE', 409);
  if (answer.known) return { ok: true, known: true, pending: false, answerKorean: answer.answerKorean };
  const relay = state.requestRelay(room, answer.key, answer.question);
  if (relay.known) {
    const known = await ai.knownCustomerAnswer(room, relay.key, relay.value, questionKorean);
    return { ok: true, known: true, pending: false, answerKorean: known.answerKorean };
  }
  room.pendingRelay.questionKorean = questionKorean;
  state.appendMessage(room, 'assistant', answer.question, 'relay');
  return { ok: true, known: false, pending: true, message: 'Customer asked in chat. Wait without guessing.' };
}

const handler = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'POST' && req.headers.origin) {
      const allowed = new Set([`http://localhost:${cfg.port}`, `http://127.0.0.1:${cfg.port}`, config().publicBaseUrl, cfg.cert ? `https://localhost:${cfg.port}` : ''].filter(Boolean));
      if (!allowed.has(req.headers.origin)) throw apiError('UNAUTHORIZED', 403);
    }
    if (url.pathname === '/api/config' && req.method === 'GET') {
      const current = config(); return json(res, 200, { configured: !!current.key, chatModel: current.chatModel, realtimeModel: current.realtimeModel, publicBaseUrl: current.publicBaseUrl || `${cfg.cert ? 'https' : 'http'}://localhost:${cfg.port}`, simulation: true });
    }
    if (url.pathname === '/api/rooms' && req.method === 'POST') {
      const input = await body(req);
      if (!['en', 'ru', 'zh'].includes(input.language)) throw apiError('INVALID_INPUT');
      const room = state.createRoom(input.language); room.apiEvidence = []; room.observations = []; room.voiceDiagnostics = []; room.reviewChain = Promise.resolve(); room.toolResults = new Map();
      rooms.set(room.id, room);
      return json(res, 201, { id: room.id, customerToken: room.customerToken, businessToken: room.businessToken, state: pub(room) });
    }
    const match = url.pathname.match(/^\/api\/rooms\/([\w-]+)(?:\/(\w+))?$/);
    if (match) {
      const room = rooms.get(match[1]); if (!room) throw apiError('NOT_FOUND', 404);
      const token = req.headers.authorization?.replace(/^Bearer /, '');
      const role = matches(token, room.customerToken) ? 'customer' : matches(token, room.businessToken) ? 'business' : null;
      if (!role) throw apiError('UNAUTHORIZED', 403);
      const operation = match[2] || '';
      if (role === 'business') room.lastBusinessSeen = Date.now();
      if (room.call.connected && room.lastBusinessSeen && Date.now() - room.lastBusinessSeen > 18000 && !terminal.has(room.call.status)) {
        state.setConnection(room, false, 'Business connection heartbeat expired.'); void finalSummary(room);
      }
      if (room.pendingRelay && room.call.connected && room.call.status === 'waiting_customer' && !room.decisionPending && Date.now() - Date.parse(room.pendingRelay.askedAt) > 60000) {
        room.decisionPending = true;
        void askDecision(room, '고객 답변이 1분 이상 도착하지 않았습니다. 더 기다릴지 미완료 상태로 종료할지 결정이 필요합니다.').catch(error => { room.error = { code: error.code || 'AI_ERROR' }; }).finally(() => { room.decisionPending = false; });
      }
      if (req.method === 'GET') {
        if (operation === 'export') { await saveEvidence(room); return json(res, 200, { simulation: true, ...pub(room), apiEvidence: room.apiEvidence, observations: room.observations, voiceDiagnostics: room.voiceDiagnostics }); }
        if (!operation) return json(res, 200, pub(room));
        throw apiError('NOT_FOUND', 404);
      }
      if (req.method !== 'POST') throw apiError('INVALID_INPUT', 405);
      const input = await body(req, operation === 'realtime');
      if (operation === 'chat') {
        requireRole(role, 'customer');
        const text = messageText(input.message);
        await exclusive(room, async () => {
          if (room.pendingRelay) {
            const relayId = room.pendingRelay.id;
            const translation = await ai.translateRelay(room, text);
            if (room.call.endedAt || room.pendingRelay?.id !== relayId) throw apiError('INVALID_STATE', 409);
            const message = state.appendMessage(room, 'user', text, 'relay');
            state.resolveRelay(room, message);
            state.appendMessage(room, 'assistant', translation.acknowledgement, 'relay');
            room.voiceMessage = { id: randomUUID(), text: `고객의 실제 답변: ${translation.answerKorean}. 이 내용만 전달하고 나머지 필수 질문을 계속하세요.` };
          } else {
            if (room.call.status !== 'idle') throw apiError('INVALID_STATE', 409);
            room.planReady = false;
            const last = room.messages.at(-1);
            if (last?.role !== 'user' || last.text !== text) state.appendMessage(room, 'user', text);
            const result = await ai.interview(room);
            state.applyPlan(room, result);
          }
        });
      } else if (operation === 'authorize') {
        requireRole(role, 'customer'); if (!config().key) throw apiError('CONFIG_REQUIRED', 503);
        if (room.busy || room.summaryPending) throw apiError('BUSY', 409);
        state.authorizeCall(room, input.institutionId);
        room.realtimeStarted = false; room.toolResults.clear(); room.voiceMessage = null;
        room.observations = [];
        room.voiceDiagnostics = [];
      } else if (operation === 'accept') {
        requireRole(role, 'business'); state.acceptCall(room);
      } else if (operation === 'realtime') {
        requireRole(role, 'business');
        if (room.call.status !== 'connecting' || room.realtimeStarted) throw apiError('INVALID_STATE', 409);
        if (!input.startsWith('v=0') || input.length < 50) throw apiError('INVALID_INPUT');
        room.realtimeStarted = true;
        try {
          const sdp = await ai.createRealtimeCall(room, input);
          res.writeHead(200, { 'Content-Type': 'application/sdp', 'Cache-Control': 'no-store' }); return res.end(sdp);
        } catch (error) { state.setConnection(room, false, error.code); throw error; }
      } else if (operation === 'connection') {
        requireRole(role, 'business');
        if (typeof input.connected !== 'boolean') throw apiError('INVALID_INPUT');
        if (!input.connected && room.call.status === 'completed') { room.call.connected = false; touch(room); }
        else { state.setConnection(room, input.connected, String(input.reason || '').slice(0, 500)); }
        if (!input.connected && terminal.has(room.call.status)) void finalSummary(room);
      } else if (operation === 'transcript') {
        requireRole(role, 'business');
        if (!room.call.accepted || !['business', 'assistant'].includes(input.role)) throw apiError('INVALID_STATE', 409);
        const text = messageText(input.text);
        const id = messageText(input.id);
        const exists = room.transcripts.some(item => item.id === id && item.role === input.role);
        if (!exists) {
          const transcript = { id, role: input.role, text };
          state.appendTranscript(room, transcript);
          if (input.role === 'business' && !terminal.has(room.call.status)) {
            const callId = room.call.id;
            room.reviewChain = room.reviewChain.catch(() => {}).then(async () => {
              if (room.call.id !== callId || terminal.has(room.call.status)) return;
              const review = await ai.reviewBusiness(room, transcript);
              if (room.call.id !== callId || terminal.has(room.call.status)) return;
              state.applyBusinessReview(room, review, transcript);
              if (review.unavailable && room.call.status === 'active') await askDecision(room, review.explanation);
              // The evidence review also catches explicit customer questions.
              // Do not rely on the voice model remembering to call its tool.
              const question = review.customerQuestion;
              if (question?.asked && question.key?.trim() && question.questionKorean?.trim() && question.evidenceQuote?.trim() && transcript.text.includes(question.evidenceQuote) && room.call.status === 'active') {
                const result = await resolveCustomerDetail(room, question.key, question.questionKorean);
                if (result.known && room.call.id === callId && room.call.status === 'active') {
                  room.voiceMessage = { id: randomUUID(), sourceTranscriptId: transcript.id, text: `Answer the business's question in Korean using this already supplied customer information before continuing. Question: ${question.questionKorean}\nAnswer: ${result.answerKorean}` }; touch(room);
                }
              }
            });
            try { await room.reviewChain; }
            catch (error) { if (room.call.id === callId && !terminal.has(room.call.status)) { room.error = { code: error.code || 'AI_ERROR' }; state.setConnection(room, false, 'Business evidence review failed.'); void finalSummary(room); } throw error; }
          }
          await saveEvidence(room);
        }
      } else if (operation === 'tool') {
        requireRole(role, 'business');
        if (!room.call.connected || terminal.has(room.call.status)) throw apiError('INVALID_STATE', 409);
        const callId = messageText(input.callId);
        if (room.toolResults.has(callId)) return json(res, 200, room.toolResults.get(callId));
        await room.reviewChain;
        const args = input.arguments || {};
        let output;
        if (input.name === 'request_customer_detail') {
          output = await resolveCustomerDetail(room, String(args.key || ''), messageText(args.questionKorean));
        } else if (input.name === 'cannot_proceed') {
          await askDecision(room, messageText(args.reasonKorean)); output = { ok: true, pending: true, message: 'Wait for customer decision. Do not repeat or invent an answer.' };
        } else if (input.name === 'complete_call') {
          const permitted = state.canComplete(room);
          const allowComplete = typeof permitted === 'boolean' ? permitted : permitted.allowed === true || permitted.ok === true;
          output = { ok: true, allowComplete, pending: false, unresolved: room.requiredQuestions.filter(q => q.status !== 'resolved').map(q => ({ id: q.id, korean: q.korean })), message: allowComplete ? 'Completion authorized. Say goodbye briefly in Korean.' : !room.call.confirmedKeyDetails ? 'Before finishing, resolve remaining questions, read back key facts and wait for the business to confirm. Then request completion again.' : 'Resolve unanswered questions before ending. If information is unavailable ask cannot_proceed.' };
          if (allowComplete) { state.finishCall(room, { reason: 'All required answers supported and key details confirmed.', success: true }); void finalSummary(room); }
        } else throw apiError('INVALID_INPUT');
        room.toolResults.set(callId, output); touch(room); return json(res, 200, output);
      } else if (operation === 'decision') {
        requireRole(role, 'customer');
        if (room.call.status !== 'awaiting_decision') throw apiError('INVALID_STATE', 409);
        if (input.action === 'continue') {
          room.decisionPrompt = null; room.call.status = room.pendingRelay ? 'waiting_customer' : 'active';
          if (room.pendingRelay) room.pendingRelay.askedAt = new Date().toISOString();
          room.voiceMessage = { id: randomUUID(), text: room.pendingRelay ? '고객이 답변을 더 기다리기로 선택했습니다. 고객 정보를 추측하지 말고 잠시 기다리세요.' : '고객이 대화를 계속하기로 선택했습니다. 아직 미해결된 내용만 다시 명확하게 확인하세요. 답을 얻을 수 없으면 추측하지 말고 다시 고객에게 결정 요청하세요.' }; touch(room);
        } else if (input.action === 'end') { state.finishCall(room, { reason: 'Customer chose to end with unresolved information.', success: false }); await finalSummary(room); }
        else throw apiError('INVALID_INPUT');
      } else if (operation === 'end') {
        requireRole(role, 'customer'); state.finishCall(room, { reason: 'Customer ended the simulated call early.', success: false }); await finalSummary(room);
      } else if (operation === 'diagnostics') {
        requireRole(role, 'business');
        if (!room.call.id || input.callId !== room.call.id || !Array.isArray(input.events) || input.events.length > 30) throw apiError('INVALID_INPUT');
        const allowed = new Set(['call.accepted', 'remote.track', 'playback.allowed', 'playback.blocked', 'connection.registered', 'opening.requested', 'opening.finished', 'opening.timeout', 'session.created', 'response.created', 'response.done', 'output_audio_buffer.started', 'output_audio_buffer.stopped', 'output_audio_buffer.cleared', 'error', 'input_audio_buffer.speech_started', 'input_audio_buffer.speech_stopped']);
        for (const event of input.events) {
          if (!event || !allowed.has(event.type)) continue;
          const safe = { callId: room.call.id, type: event.type, receivedAt: new Date().toISOString() };
          if (typeof event.at === 'string' && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(event.at) && event.at.length < 30) safe.at = event.at;
          for (const field of ['responseId', 'status', 'code']) if (typeof event[field] === 'string' && /^[A-Za-z0-9_.-]{1,100}$/.test(event[field])) safe[field] = event[field];
          room.voiceDiagnostics.push(safe);
        }
        room.voiceDiagnostics = room.voiceDiagnostics.slice(-200);
        await saveEvidence(room); return json(res, 200, { ok: true });
      } else if (operation === 'observation') {
        requireRole(role, 'business');
        room.observations.push({ callId: room.call.id, audibleKorean: input.audibleKorean === true, deviceLabel: String(input.deviceLabel || 'Laptop business tab').slice(0, 200), source: 'human_operator_self_report', at: new Date().toISOString() }); await saveEvidence(room);
      } else throw apiError('NOT_FOUND', 404);
      return json(res, 200, pub(room));
    }
    if (!['GET', 'HEAD'].includes(req.method)) throw apiError('NOT_FOUND', 404);
    const pathname = decodeURIComponent(url.pathname);
    const file = ['/', '/v2/'].includes(pathname) ? '/v2/index.html' : pathname === '/business' ? '/v2/business.html' : pathname === '/legacy' ? '/index.html' : pathname;
    const target = path.resolve(root, '.' + file);
    if (!target.startsWith(root + path.sep)) throw apiError('NOT_FOUND', 404);
    const bytes = await readFile(target);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'microphone=(self)' }); res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (error) { if (!res.headersSent) json(res, error.statusCode || (error.code === 'ENOENT' ? 404 : 500), { error: { code: error.statusCode ? error.code : 'AI_ERROR', message: error.statusCode ? error.code : 'Request could not be completed.' } }); }
};

const server = cfg.cert && cfg.tlsKey ? https.createServer({ cert: await readFile(cfg.cert), key: await readFile(cfg.tlsKey) }, handler) : http.createServer(handler);
server.listen(cfg.port, cfg.host, () => console.log(`YOKOBU v2 fictional simulation: ${cfg.cert ? 'https' : 'http'}://localhost:${cfg.port} — real OpenAI chat and Realtime; key stays server-side.`));
