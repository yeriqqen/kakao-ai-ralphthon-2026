// Real local HTTP checks. Two synthetic AI responses only establish a setup
// plan; all upstream network is blocked. No OpenAI or microphone/audio calls.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const port = Number(process.env.TEST_PORT || 4217);
const base = `http://localhost:${port}`;
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(root, process.env.V2_ARTIFACT_DIR || 'artifacts/v2');
// A child-only dummy key keeps checks independent of local configuration.
// Synthetic plan responses enable the diagnostic gates; fetch is replaced
// completely so no HTTP test can contact an upstream service.
const setupBootstrap = `
globalThis.fetch = async (url, options) => {
  if (String(url) !== 'https://api.openai.com/v1/responses') throw new Error('Upstream network is blocked in this HTTP test.');
  const body = JSON.parse(options.body);
  const purpose = body.text.format.name;
  let output;
  if (purpose === 'customer_interview') output = {
    reply: 'A fictional test plan is ready; stock is unknown. Shall we simulate the call?',
    customerInfo: [], institutions: [{ id: 'mock-shop', name: 'Fictional HTTP Test Shop', reason: 'To ask whether the requested notebook is in stock.' }],
    requiredQuestions: [{ id: 'stock', text: 'Is the blue notebook in stock?', korean: '파란색 공책 재고가 있나요?' }], readyToCall: true
  };
  else if (purpose === 'call_plan_validation') {
    const message = JSON.parse(body.input).customerMessages.at(-1);
    output = { approved: true, violations: [], customerFactEvidence: [], constraintCoverage: [{ constraint: 'blue notebook stock', sourceMessageId: message.id, questionIds: ['stock'] }], questionMeaningChecks: [{ questionId: 'stock', faithful: true, explanation: 'Synthetic setup fixture only.' }] };
  } else if (purpose === 'business_evidence_review') {
    const input = JSON.parse(body.input), quote = input.newestBusinessTranscript.text;
    output = { utteranceKind: 'unclear', answers: [], confirmedKeyDetails: false, confirmationQuote: '', readbackEvidence: [], unavailable: false, explanation: '', customerQuestion: { asked: true, key: 'alternative_color', questionKorean: '다른 색상도 괜찮으세요?', evidenceQuote: quote === '인사만 합니다.' ? 'fabricated quotation' : quote } };
  } else if (purpose === 'customer_relay') output = { known: false, key: 'alternative_color', question: 'Would another color be okay?', answerKorean: '' };
  else if (purpose === 'relay_answer') output = { answerKorean: '검은색도 괜찮습니다.', acknowledgement: 'I will relay that black is okay.' };
  else throw new Error('Unexpected AI purpose in HTTP-only test: ' + purpose);
  return new Response(JSON.stringify({ id: 'synthetic-http-setup-' + purpose, model: 'mock-no-openai', status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
await import(${JSON.stringify(new URL('../server-v2.mjs', import.meta.url).href)});
`;
const child = spawn(process.execPath, ['--input-type=module', '--eval', setupBootstrap], { cwd: root, env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', OPENAI_API_KEY: 'synthetic-http-test-key-not-a-credential' }, stdio: ['ignore', 'pipe', 'pipe'] });
const checks = [];
let fixtureRoomId = null;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server did not start')), 5000);
    child.stdout.once('data', () => { clearTimeout(timer); resolve(); });
    child.once('exit', () => { clearTimeout(timer); reject(new Error('Server exited before startup')); });
  });
  const check = async (name, action) => { await action(); checks.push({ name, passed: true }); };
  for (const route of ['/', '/v2/', '/business', '/v2/customer.js', '/v2/business.js']) await check(`${route} is served`, async () => { assert.equal((await fetch(base + route)).status, 200); });
  const config = await fetch(base + '/api/config').then(response => response.json());
  await check('configuration exposes only public fields', () => { assert.deepEqual(Object.keys(config).sort(), ['chatModel', 'configured', 'publicBaseUrl', 'realtimeModel', 'simulation'].sort()); });
  const create = (data, headers = {}) => fetch(base + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) });
  await check('unsupported language is rejected', async () => assert.equal((await create({ language: 'xx' })).status, 400));
  await check('cross-origin mutation is rejected', async () => assert.equal((await create({ language: 'en' }, { Origin: 'https://example.com' })).status, 403));
  const created = await create({ language: 'en' }).then(response => response.json());
  fixtureRoomId = created.id;
  const request = (suffix, token, payload) => fetch(base + '/api/rooms/' + created.id + suffix, { method: payload === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: payload === undefined ? undefined : JSON.stringify(payload) });
  await check('unauthorized room read is rejected', async () => assert.equal((await request('', 'wrong')).status, 403));
  await check('public state excludes both access tokens', async () => { const value = await request('', created.customerToken).then(response => response.json()); const serialized = JSON.stringify(value); assert.ok(!serialized.includes(created.customerToken) && !serialized.includes(created.businessToken)); assert.equal(value.call.status, 'idle'); });
  await check('empty customer request gives useful code', async () => { const response = await request('/chat', created.customerToken, { message: '  ' }); assert.equal(response.status, 400); assert.equal((await response.json()).error.code, 'INVALID_INPUT'); });
  await check('business cannot send customer messages', async () => assert.equal((await request('/chat', created.businessToken, { message: 'test' })).status, 403));
  await check('no authorization without a generated plan', async () => assert.equal((await request('/authorize', created.customerToken, { institutionId: 'invented' })).status, 409));
  await check('business cannot accept before authorization', async () => assert.equal((await request('/accept', created.businessToken, {})).status, 409));
  await check('business cannot claim a premature connection', async () => assert.equal((await request('/connection', created.businessToken, { connected: true })).status, 409));
  await check('no transcript accepted before authorized acceptance', async () => assert.equal((await request('/transcript', created.businessToken, { id: 'fake', role: 'business', text: 'yes' })).status, 409));
  await check('evidence export contains no credentials', async () => { const exported = await request('/export', created.customerToken).then(response => response.json()); assert.equal(exported.simulation, true); assert.ok(!JSON.stringify(exported).includes(created.customerToken)); assert.equal(exported.apiEvidence.length, 0); });
  await check('diagnostics setup uses an explicit mocked plan with real HTTP authorization', async () => {
    const response = await request('/chat', created.customerToken, { message: 'Please check whether the blue notebook is in stock.' });
    assert.equal(response.status, 200); assert.equal((await response.json()).planReady, true);
    assert.equal((await request('/authorize', created.customerToken, { institutionId: 'mock-shop' })).status, 200);
  });
  const current = await request('', created.customerToken).then(response => response.json());
  const callId = current.call.id;
  const exportedDiagnostics = async () => (await request('/export', created.customerToken).then(response => response.json())).voiceDiagnostics;
  await check('customer role cannot submit voice diagnostics', async () => assert.equal((await request('/diagnostics', created.customerToken, { callId, events: [{ type: 'opening.requested' }] })).status, 403));
  await check('diagnostics reject a different call ID', async () => assert.equal((await request('/diagnostics', created.businessToken, { callId: 'wrong-call-id', events: [{ type: 'opening.requested' }] })).status, 400));
  await check('only whitelisted diagnostic events and sanitized fields survive export', async () => {
    const marker = 'SYNTHETIC_PRIVATE_PAYLOAD_MUST_NOT_BE_EXPORTED';
    const response = await request('/diagnostics', created.businessToken, { callId, events: [
      { type: 'opening.requested', at: '2026-09-29T07:00:00.000Z', responseId: 'resp-safe', status: 'completed', code: 'OK', callId: 'forged-event-call', text: marker, audio: marker, token: marker },
      { type: 'unapproved.event', text: marker }, null,
      { type: 'error', at: marker, responseId: 'contains spaces', status: 'failed\nprivate', code: 'SAFE_CODE', payload: marker },
    ] });
    assert.equal(response.status, 200);
    const events = await exportedDiagnostics(); assert.equal(events.length, 2);
    assert.deepEqual(Object.keys(events[0]).sort(), ['callId', 'type', 'receivedAt', 'at', 'responseId', 'status', 'code'].sort());
    assert.equal(events[0].callId, callId); assert.equal(events[0].responseId, 'resp-safe'); assert.equal(events[0].at, '2026-09-29T07:00:00.000Z');
    assert.deepEqual(Object.keys(events[1]).sort(), ['callId', 'type', 'receivedAt', 'code'].sort());
    assert.equal(events[1].code, 'SAFE_CODE'); assert.ok(!JSON.stringify(events).includes(marker));
  });
  await check('diagnostic batches above 30 events are rejected without partial writes', async () => {
    const before = await exportedDiagnostics();
    assert.equal((await request('/diagnostics', created.businessToken, { callId, events: Array.from({ length: 31 }, () => ({ type: 'opening.requested' })) })).status, 400);
    assert.deepEqual(await exportedDiagnostics(), before);
  });
  await check('30-event batches are accepted and only the newest 200 diagnostics are retained', async () => {
    for (let batch = 0; batch < 7; batch++) {
      const events = Array.from({ length: 30 }, (_, index) => ({ type: 'response.created', responseId: `diag-${batch * 30 + index}` }));
      assert.equal((await request('/diagnostics', created.businessToken, { callId, events })).status, 200);
    }
    const events = await exportedDiagnostics(); assert.equal(events.length, 200);
    assert.equal(events[0].responseId, 'diag-10'); assert.equal(events.at(-1).responseId, 'diag-209');
    assert.deepEqual(events.map(event => event.responseId), Array.from({ length: 200 }, (_, index) => `diag-${index + 10}`));
  });
  await check('reviewed business question opens the relay without a Realtime tool call', async () => {
    assert.equal((await request('/accept', created.businessToken, {})).status, 200);
    assert.equal((await request('/connection', created.businessToken, { connected: true })).status, 200);
    const response = await request('/transcript', created.businessToken, { id: 'synthetic-color-question', role: 'business', text: '다른 색상도 괜찮으세요?' });
    assert.equal(response.status, 200);
    const room = await response.json();
    assert.equal(room.call.status, 'waiting_customer');
    assert.equal(room.pendingRelay.question, 'Would another color be okay?');
    assert.equal(room.messages.filter(m => m.kind === 'relay').length, 1);
    assert.equal(room.requiredQuestions[0].status, 'unresolved');
  });
  await check('a later voice tool reuses the pending relay without another question', async () => {
    const result = await request('/tool', created.businessToken, { callId: 'synthetic-duplicate-question', name: 'request_customer_detail', arguments: { key: 'alternative_color', questionKorean: '다른 색상도 괜찮으세요?' } }).then(r => r.json());
    assert.equal(result.pending, true);
    const room = await request('', created.customerToken).then(r => r.json());
    assert.equal(room.messages.filter(m => m.kind === 'relay').length, 1);
  });
  await check('customer text resolves the detected relay and returns a Korean voice message', async () => {
    const response = await request('/chat', created.customerToken, { message: 'Black is okay.' });
    assert.equal(response.status, 200);
    const room = await response.json();
    assert.equal(room.call.status, 'active'); assert.equal(room.pendingRelay, null);
    assert.match(room.voiceMessage.text, /검은색도 괜찮습니다/);
  });
  await check('an invented question quote cannot trigger a relay', async () => {
    const response = await request('/transcript', created.businessToken, { id: 'synthetic-invalid-question', role: 'business', text: '인사만 합니다.' });
    assert.equal(response.status, 200);
    const room = await response.json(); assert.equal(room.pendingRelay, null); assert.equal(room.call.status, 'active');
  });
  const result = { checkedAt: new Date().toISOString(), type: 'real_local_http_with_mocked_plan_setup', realHTTP: true, realOpenAI: false, realMicrophone: false, syntheticHttpTest: true, childConfiguration: 'Dummy key; child fetch replaced with synthetic setup responses and upstream network blocked', provenance: 'Real isolated localhost HTTP routes. Plan generation and validation are synthetic setup fixtures; all upstream network is blocked. No actual business or audio evidence.', fixtureRoomId, passed: checks.length, total: checks.length, checks };
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'http-check.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(`V2 real local HTTP: ${checks.length}/${checks.length} passed; no OpenAI or audio used.`);
} finally {
  child.kill('SIGTERM');
  if (fixtureRoomId) {
    const path = new URL(`../artifacts/v2/local-runs/${fixtureRoomId}.json`, import.meta.url);
    try { const saved = JSON.parse(await readFile(path, 'utf8')); await writeFile(path, JSON.stringify({ ...saved, syntheticHttpTest: true, realAPI: false, realMicrophone: false, testProvenance: 'HTTP authorization and diagnostics fixture; AI setup responses and diagnostic events are synthetic. No live call or audio acceptance.' }, null, 2) + '\n'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
