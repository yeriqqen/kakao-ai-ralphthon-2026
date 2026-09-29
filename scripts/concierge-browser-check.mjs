import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
const require = createRequire(import.meta.url);
const modulePath = process.env.PLAYWRIGHT_MODULE || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const loaded = await import(pathToFileURL(require.resolve(modulePath)).href);
const { chromium } = loaded.chromium ? loaded : loaded.default;
const out = new URL('../artifacts/concierge/', import.meta.url); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE, headless: true });
const checks = []; const errors = [];
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
const origin = process.env.DEMO_URL || 'http://localhost:4173';
const check = async (name, fn) => { await fn(); checks.push(name); console.log('PASS', name); };
const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
try {
  await page.goto(origin); await page.waitForFunction(() => document.querySelector('#composer').parentElement.id === 'home-composer-slot');
  await check('mobile home and empty-send state', async () => { await noOverflow(); assert.equal(await page.locator('#send-button').isDisabled(), true); await page.screenshot({ path: fileURLToPath(new URL('mobile-home.png', out)), fullPage: true }); });
  await check('profile is optional, reusable and opt-in persistent', async () => {
    await page.locator('#nav-you').click(); await page.locator('#profile-name').fill('Alex'); await page.locator('#profile-location').fill('Hongdae, Seoul'); await page.locator('#profile-preferences').fill('Vegetarian. English.');
    await page.locator('#profile-form button[type=submit]').click(); await page.locator('#settings').waitFor({ state: 'hidden' }); assert.match(await page.locator('#location-label').textContent(), /Hongdae/); assert.equal(await page.evaluate(() => localStorage.getItem('yokobu-profile')), null);
    await page.locator('#nav-you').click(); await page.locator('#remember-profile').check(); await page.locator('#profile-form button[type=submit]').click(); await page.locator('#settings').waitFor({ state: 'hidden' }); assert.match(await page.evaluate(() => localStorage.getItem('yokobu-profile')), /Alex/);
  });
  await check('language switching and settings at narrow widths', async () => { for (const lang of ['ru', 'ko', 'en']) { await page.locator('#language').selectOption(lang); await noOverflow(); assert.equal(await page.locator('html').getAttribute('lang'), lang); } });
  await check('missing-key requests explain connection, not fake success', async () => { await page.locator('#request').fill('Find a clinic nearby'); await page.locator('#send-button').click(); await page.locator('#connection-panel').waitFor({ state: 'visible' }); assert.equal(await page.locator('.message.assistant').count(), 0); await page.locator('[data-close=settings]').click(); });
  // The following UI tests use explicit mocked provider responses; no paid API requests or calls.
  await page.route('**/api/status', route => route.fulfill({ json: { connected: true, calling: false } }));
  await page.reload(); await page.waitForFunction(() => document.querySelector('#connection-dot').classList.contains('connected'));
  const answer = { message: 'I can help. Which part of Seoul works for you?', question: 'Is Hongdae a good starting point?', choices: ['Yes, Hongdae', 'Somewhere else'], places: [], actions: [], sources: [], suggestions: [], summary: null };
  await page.route('**/api/chat', route => route.fulfill({ contentType: 'application/x-ndjson', body: JSON.stringify({ type: 'status', stage: 'thinking' }) + '\n' + JSON.stringify({ type: 'result', result: answer }) + '\n' }));
  await check('conversational clarification and context in request', async () => {
    const sent = page.waitForRequest(r => r.url().endsWith('/api/chat')); await page.locator('#request').fill('Find a clinic'); await page.locator('#send-button').click(); assert.equal((await sent).postDataJSON().profile.location, 'Hongdae, Seoul'); await page.locator('.question').waitFor(); await noOverflow();
  });
  answer.message = 'Here is a fictional test result. The place details in this test are synthetic.'; answer.question = null; answer.choices = [];
  answer.places = [{ name: 'Test clinic', detail: 'Synthetic browser-test fixture', address: 'Test address', url: 'https://example.com', phone: '+82212345678' }];
  answer.actions = [{ id: 'test-action', title: 'Ask about an appointment', business: 'Test clinic', phone: '+82212345678', purpose: 'Ask about availability only', detailsToShare: 'English-speaking visitor', sourceUrl: 'https://example.com' }];
  answer.summary = { title: 'Your next steps', facts: ['Availability is not confirmed.'], nextSteps: ['Ask about appointment times.'], korean: '진료 예약이 가능한가요?' }; answer.sources = [{ title: 'Test source', url: 'https://example.com' }];
  answer.suggestions = ['Prepare my Korean request'];
  await check('research cards, summary and call connection boundary', async () => { await page.getByRole('button', { name: 'Yes, Hongdae', exact: true }).click(); await page.locator('.summary-card').waitFor(); await noOverflow(); await page.locator('.action-card button').click(); await page.locator('#call-sheet').waitFor({ state: 'visible' }); assert.match(await page.locator('#approve-call').textContent(), /Connect calling/); await page.locator('#approve-call').click(); assert.equal(await page.locator('#connection-panel').isVisible(), true); await page.locator('[data-close=settings]').click(); });
  await check('safe model text and links', async () => { answer.message = '<img src=x onerror=alert(1)> [bad](javascript:alert(1))'; answer.places = []; answer.actions = []; answer.summary = null; answer.suggestions = []; await page.locator('#request').fill('check safety'); await page.locator('#send-button').click(); await page.waitForFunction(() => document.querySelector('#messages').textContent.includes('<img')); assert.equal(await page.locator('#messages img').count(), 0); assert.equal(await page.locator('#messages a[href^="javascript:"]').count(), 0); });
  await check('real microphone denial is recoverable', async () => { await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('denied', 'NotAllowedError'); }; }); await page.locator('#voice-button').click(); await page.waitForFunction(() => !document.querySelector('#voice-sheet').open); assert.equal(await page.locator('#voice-sheet').isVisible(), false); });
  await check('canceling while microphone permission is pending stops late tracks', async () => {
    await page.evaluate(() => { window.__stopped = false; navigator.mediaDevices.getUserMedia = () => new Promise(resolve => window.__resolveMic = () => resolve({ getTracks: () => [{ stop: () => window.__stopped = true }] })); });
    await page.locator('#voice-button').click(); await page.locator('#close-voice').click(); await page.evaluate(() => window.__resolveMic()); await page.waitForFunction(() => window.__stopped === true);
  });
  await check('Realtime tool handoff and successful-session cleanup with synthetic transport', async () => {
    await page.route('**/api/realtime', route => route.fulfill({ json: { sdp: 'synthetic-answer' } }));
    await page.evaluate(() => {
      window.__voiceEvents = []; window.__voiceStopped = false; window.__peerClosed = false;
      navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [{ stop: () => window.__voiceStopped = true }] });
      window.RTCPeerConnection = class {
        addTrack() {}
        createDataChannel() { this.channel = { readyState: 'open', send: data => window.__voiceEvents.push(JSON.parse(data)), close() {} }; window.__channel = this.channel; return this.channel; }
        async createOffer() { return { type: 'offer', sdp: 'v=0 synthetic' }; }
        async setLocalDescription() {}
        async setRemoteDescription() { setTimeout(() => this.channel.onopen(), 0); }
        close() { window.__peerClosed = true; }
      };
    });
    await page.locator('#voice-button').click(); await page.waitForFunction(() => document.querySelector('#voice-sheet').classList.contains('connected'));
    await page.evaluate(() => {
      window.__channel.onmessage({ data: JSON.stringify({ type: 'conversation.item.input_audio_transcription.completed', transcript: 'Find a nearby clinic please.' }) });
      window.__channel.onmessage({ data: JSON.stringify({ type: 'response.function_call_arguments.done', name: 'concierge', call_id: 'voice-tool-1', arguments: JSON.stringify({ request: 'Find a nearby clinic.' }) }) });
    });
    await page.waitForFunction(() => window.__voiceEvents.some(e => e.item?.call_id === 'voice-tool-1'));
    assert.equal(await page.evaluate(() => window.__voiceEvents.filter(e => e.item?.call_id === 'voice-tool-1').length), 1);
    await page.locator('#end-voice').click(); assert.equal(await page.evaluate(() => window.__voiceStopped && window.__peerClosed), true);
  });
  await check('activity and reset', async () => { await page.locator('#nav-activity').click(); assert.ok(await page.locator('.activity-item').count() > 0); await page.locator('#new-task').click(); await page.locator('#home').waitFor({ state: 'visible' }); assert.equal(await page.locator('.message').count(), 0); });
  await check('desktop and small-phone layout', async () => { for (const width of [320, 375, 430, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await noOverflow(); } await page.screenshot({ path: fileURLToPath(new URL('desktop-home.png', out)), fullPage: true }); });
  assert.deepEqual(errors, []); await writeFile(new URL('browser-results.json', out), JSON.stringify({ checks, errors, syntheticProviderResponses: true, liveOpenAI: false, realAudio: false, realCalls: false }, null, 2));
} finally { await browser.close(); }
