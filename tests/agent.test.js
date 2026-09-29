import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanProfile, prepareResult, runAgent, realtimeConfig } from '../server/agent.mjs';
import { startCall, callingConfigured } from '../server/calls.mjs';

const state = () => ({ profile: { language: 'ru' }, history: [], turns: [], actions: new Map() });
const config = { key: 'test-secret-not-real', model: 'test-model', realtimeModel: 'test-voice', calling: false };
test('profile is bounded and drops fields not needed by the agent', () => {
  assert.deepEqual(cleanProfile({ name: 'Ada', apiKey: 'secret', preferences: 'a'.repeat(2000) }), { name: 'Ada', language: '', location: '', preferences: 'a'.repeat(1800) });
});
test('action proposals require real-number formatting and safe source URLs', () => {
  const s = state(); const r = prepareResult({ message: 'Hello', actions: [{ phone: 'invented', sourceUrl: 'https://example.com' }, { phone: '+82212345678', sourceUrl: 'javascript:alert(1)' }, { phone: '+82212345678', sourceUrl: 'https://example.com', business: 'Test business' }] }, {}, s);
  assert.equal(r.actions.length, 1); assert.equal(s.actions.size, 1); assert.equal(r.actions[0].status, 'proposed');
});
test('streaming search events preserve UTF-8 and tool-call history', async () => {
  const raw = { message: 'Здравствуйте. 안녕하세요.', question: null, choices: [], actions: [], places: [], suggestions: [], summary: null };
  const result = { output: [{ type: 'web_search_call', action: { sources: [{ url: 'https://example.com', title: 'Example' }] } }, { type: 'function_call', name: 'present_result', call_id: 'call_1', arguments: JSON.stringify(raw) }] };
  const bytes = new TextEncoder().encode(`data: ${JSON.stringify({ type: 'response.web_search_call.in_progress' })}\n\ndata: ${JSON.stringify({ type: 'response.completed', response: result })}\n\n`);
  let request; const s = state(); const events = [];
  const fetcher = async (url, options) => { request = JSON.parse(options.body); return new Response(new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 3) controller.enqueue(bytes.slice(i, i + 3)); controller.close(); } })); };
  const actual = await runAgent({ state: s, message: 'Find a clinic', config, fetcher, emit: e => events.push(e) });
  assert.equal(actual.message, raw.message); assert.equal(events[0].stage, 'searching'); assert.equal(actual.sources.length, 1);
  assert.equal(request.store, false); assert.ok(!JSON.stringify(request).includes(config.key)); assert.equal(s.history.at(-1).type, 'function_call_output');
});
test('upstream auth errors do not disclose the provider body or key', async () => {
  await assert.rejects(runAgent({ state: state(), message: 'hello', config, fetcher: async () => new Response('secret internals', { status: 401 }) }), /key was not accepted/);
});
test('missing credentials fail before any network request', async () => {
  let count = 0;
  await assert.rejects(runAgent({ state: state(), message: 'hi', config: { ...config, key: '' }, fetcher: () => count++ }), /Connect/); assert.equal(count, 0);
});
test('browser voice config has no persistent API key and exposes only the concierge tool', () => {
  const r = realtimeConfig(state(), config); assert.equal(r.tools.length, 1); assert.equal(r.tools[0].name, 'concierge'); assert.ok(!JSON.stringify(r).includes(config.key)); assert.equal(r.audio.input.turn_detection.type, 'semantic_vad');
});
test('calling stays unavailable without provider and explicit enabling', () => {
  assert.equal(callingConfigured({}), false); assert.equal(callingConfigured({ ENABLE_OUTBOUND_CALLS: 'true' }), false);
});
test('ambiguous call creation is never automatically retried', async () => {
  const env = { ENABLE_OUTBOUND_CALLS: 'true', SIP_PROVIDER_URL: 'sips:example.com', SIP_USERNAME: 'test', SIP_PASSWORD: 'test', SIP_CALLER_NUMBER: '+12025550100' };
  const action = { status: 'proposed', createdAt: Date.now(), phone: '+12025550101', purpose: 'Ask opening time', detailsToShare: 'None' }; let count = 0;
  const fail = async () => { count++; throw new Error('timeout'); };
  await assert.rejects(startCall(action, config, env, fail), /may have started/); assert.equal(action.status, 'unknown');
  await assert.rejects(startCall(action, config, env, fail), /already requested/); assert.equal(count, 1);
});
