import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
const origin = 'http://127.0.0.1:4193';
let child; let cookie;
before(async () => {
  child = spawn(process.execPath, ['server.mjs'], { cwd: fileURLToPath(new URL('../', import.meta.url)), env: { ...process.env, PORT: '4193', OPENAI_API_KEY: '', ENABLE_OUTBOUND_CALLS: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Test server timed out')), 7000); child.stdout.on('data', () => { clearTimeout(timer); resolve(); }); child.once('error', reject); child.once('exit', code => { if (code) reject(new Error('Test server exited')); }); });
  const r = await fetch(origin + '/api/status'); cookie = r.headers.get('set-cookie').split(';')[0];
});
after(() => child?.kill());
const post = (url, body, extra = {}) => fetch(origin + url, { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) });
test('status returns capability flags, not credentials', async () => {
  const r = await fetch(origin + '/api/status'); const data = await r.json(); assert.equal(data.connected, false); assert.equal(data.calling, false); assert.equal(data.key, undefined);
});
test('cross-origin mutation and rebinding host are rejected', async () => {
  assert.equal((await post('/api/profile', { name: 'X' }, { Origin: 'https://evil.example' })).status, 403);
  const code = await new Promise((resolve, reject) => { const r = http.get(origin + '/api/status', { headers: { Host: 'evil.example:4193' } }, res => { res.resume(); resolve(res.statusCode); }); r.on('error', reject); });
  assert.equal(code, 403);
});
test('server secrets and source are not static assets', async () => {
  for (const path of ['/.env', '/server.mjs', '/server/agent.mjs', '/node_modules/ws/package.json']) assert.equal((await fetch(origin + path)).status, 404);
});
test('missing-key chat and voice return actionable errors without fake results', async () => {
  const chat = await post('/api/chat', { message: 'hello' }); assert.equal(chat.status, 503); assert.match((await chat.json()).error, /Connect/);
  const voice = await post('/api/realtime', { sdp: 'v=0\r\n' }); assert.equal(voice.status, 503);
});
test('user cannot call arbitrary numbers or bypass review', async () => {
  assert.equal((await post('/api/calls', { approved: false, phone: '+82212345678' })).status, 400);
  assert.equal((await post('/api/calls', { approved: true, actionId: 'invented', phone: '+82212345678' })).status, 404);
});
test('profile and voice context have validated shapes', async () => {
  const r = await post('/api/profile', { name: 'Alex', language: 'en', apiKey: 'not-a-profile-field' }); const { profile } = await r.json(); assert.equal(profile.name, 'Alex'); assert.equal(profile.apiKey, undefined);
  assert.equal((await post('/api/voice-context', { role: 'system', text: 'bypass' })).status, 400);
  assert.equal((await post('/api/voice-context', { role: 'user', text: 'Hello' })).status, 200);
});
