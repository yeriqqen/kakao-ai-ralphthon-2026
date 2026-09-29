// Real local HTTP checks. No OpenAI calls or microphone/audio simulation.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const port = Number(process.env.TEST_PORT || 4217);
const base = `http://localhost:${port}`;
const child = spawn(process.execPath, ['server-v2.mjs'], { cwd: new URL('../', import.meta.url), env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] });
const checks = [];
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
  const result = { checkedAt: new Date().toISOString(), type: 'real_local_http_without_upstream_or_audio', passed: checks.length, total: checks.length, checks };
  await mkdir(new URL('../artifacts/v2/', import.meta.url), { recursive: true });
  await writeFile(new URL('../artifacts/v2/http-check.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
  console.log(`V2 real local HTTP: ${checks.length}/${checks.length} passed; no OpenAI or audio used.`);
} finally { child.kill('SIGTERM'); }
