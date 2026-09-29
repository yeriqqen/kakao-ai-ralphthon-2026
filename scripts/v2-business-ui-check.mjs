// Isolated, synthetic UI checks. ALL network, microphone, and Realtime events are mocked.
// This script never calls OpenAI and cannot establish actual audio acceptance.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, sep, relative } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, process.env.V2_ARTIFACT_DIR || 'artifacts/v2');
const require = createRequire(import.meta.url);
let playwright;
for (const candidate of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/Users/yeriqqen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'].filter(Boolean)) {
  try { playwright = require(candidate); break; } catch {}
}
if (!playwright) throw new Error('Set PLAYWRIGHT_MODULE to an existing Playwright installation. No package is installed by this script.');
const browser = await playwright.chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const report = { mock: true, realAPI: false, realMicrophone: false, audibleKorean: false, provenance: 'Synthetic browser events and mocked HTTP. Does not prove microphone capture, OpenAI connectivity, speech quality, or audible Korean.', generatedAt: new Date().toISOString(), checks: [], sources: {} };
for (const file of ['public/v2/business.js', 'public/v2/business.html', 'public/v2/business.css', 'scripts/v2-business-ui-check.mjs']) report.sources[file] = createHash('sha256').update(await readFile(resolve(root, file))).digest('hex');
const contexts = [];
const check = (name, detail) => report.checks.push({ name, passed: true, mock: true, detail });
const wait = ms => new Promise(done => setTimeout(done, ms));
function fixture(status = 'idle') {
  return { id: 'mock-room', revision: 1, version: 1, call: { id: 'mock-call', status, connected: false }, requiredQuestions: [{ id: 'availability', korean: '오늘 진료하나요?', text: 'Are consultations available today?', status: 'unresolved', evidence: [] }], messages: [], pendingRelay: null, decisionPrompt: null, voiceMessage: null };
}
async function setup({ status = 'idle', deny = false, sessionCreated = true, remoteTrack = true, playPending = false, playBlocked = false, fastOpeningTimeout = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }); contexts.push(context);
  const room = fixture(status), requests = [], unexpected = [], errors = [];
  const control = { onTranscript: null, toolResult: { ok: true, pending: false, allowComplete: false } };
  const mutate = fn => { fn(room); room.revision++; room.version = room.revision; };
  await context.addInitScript(({ deny, sessionCreated, remoteTrack, playPending, playBlocked, fastOpeningTimeout }) => {
    const mock = { sent: [], tracks: [], peers: [], getUserMediaCalls: 0, deny, sessionCreated, remoteTrack, playPending, playBlocked };
    if (fastOpeningTimeout) { const originalTimeout = window.setTimeout.bind(window); window.setTimeout = (callback, delay, ...args) => originalTimeout(callback, delay === 12000 ? 250 : delay, ...args); }
    window.__mockRealtime = mock;
    const mediaDevices = { async getUserMedia() {
      mock.getUserMediaCalls++;
      if (mock.deny) throw new DOMException('Synthetic denial', 'NotAllowedError');
      const track = { enabled: true, stopped: false, stop() { this.stopped = true; this.enabled = false; } };
      mock.tracks.push(track);
      return { getTracks: () => [track], getAudioTracks: () => [track] };
    } };
    Object.defineProperty(navigator, 'mediaDevices', { value: mediaDevices, configurable: true });
    class MockDataChannel extends EventTarget {
      readyState = 'connecting';
      send(value) { mock.sent.push(JSON.parse(value)); }
      close() { if (this.readyState !== 'closed') { this.readyState = 'closed'; this.dispatchEvent(new Event('close')); } }
      open() { this.readyState = 'open'; this.dispatchEvent(new Event('open')); }
    }
    class MockPeer extends EventTarget {
      connectionState = 'new';
      constructor() { super(); mock.peers.push(this); }
      addTrack() {}
      createDataChannel(label) { mock.dataChannelLabel = label; this.channel = new MockDataChannel(); mock.channel = this.channel; return this.channel; }
      async createOffer() { return { type: 'offer', sdp: 'v=0\r\ns=SYNTHETIC_NO_NETWORK_NO_AUDIO\r\n' }; }
      async setLocalDescription(value) { this.localDescription = value; }
      async setRemoteDescription(value) { this.remoteDescription = value; this.connectionState = 'connected'; this.dispatchEvent(new Event('connectionstatechange')); if (mock.remoteTrack) mock.attachRemoteTrack(); this.channel.open(); if (mock.sessionCreated) mock.emitSession(); }
      close() { this.connectionState = 'closed'; this.dispatchEvent(new Event('connectionstatechange')); }
    }
    window.RTCPeerConnection = MockPeer;
    HTMLMediaElement.prototype.play = function () { return mock.playBlocked ? Promise.reject(new DOMException('Synthetic autoplay denial', 'NotAllowedError')) : mock.playPending ? new Promise(() => {}) : Promise.resolve(); };
    HTMLMediaElement.prototype.pause = function () {};
    mock.emit = event => mock.channel.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(event) }));
    mock.emitSession = () => mock.emit({ type: 'session.created', session: { id: 'mock-session', type: 'realtime' } });
    mock.attachRemoteTrack = () => { const event = new Event('track'); event.streams = [new MediaStream()]; event.track = { kind: 'audio', readyState: 'live' }; mock.peers.at(-1).dispatchEvent(event); };
    mock.fail = () => { const peer = mock.peers.at(-1); peer.connectionState = 'failed'; peer.dispatchEvent(new Event('connectionstatechange')); };
  }, { deny, sessionCreated, remoteTrack, playPending, playBlocked, fastOpeningTimeout });
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin !== 'http://localhost:4173') { unexpected.push(url.origin + url.pathname); return route.abort(); }
    if (url.pathname === '/business' || url.pathname.startsWith('/v2/') || url.pathname.startsWith('/fonts/')) {
      const relative = url.pathname === '/business' ? 'v2/business.html' : url.pathname.slice(1);
      const file = resolve(root, 'public', relative);
      assert.ok(file.startsWith(resolve(root, 'public') + sep), 'Static fixture must stay inside public/');
      return route.fulfill({ status: 200, contentType: file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.woff2') ? 'font/woff2' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/css', body: await readFile(file) });
    }
    if (url.pathname === '/favicon.ico') return route.fulfill({ status: 204 });
    if (!url.pathname.startsWith('/api/rooms/mock-room')) { unexpected.push(url.pathname); return route.abort(); }
    const operation = url.pathname.slice('/api/rooms/mock-room'.length);
    const input = req.method() === 'POST' && operation !== '/realtime' ? req.postDataJSON() : null;
    requests.push({ operation, method: req.method(), input });
    if (req.headers().authorization !== 'Bearer mock-business-token') throw new Error('Missing room authorization header');
    if (req.method() === 'POST') {
      if (operation === '/accept') mutate(r => { r.call.status = 'connecting'; });
      else if (operation === '/realtime') return route.fulfill({ status: 200, contentType: 'application/sdp', body: 'v=0\r\ns=SYNTHETIC_ANSWER_NO_NETWORK_NO_AUDIO\r\n' });
      else if (operation === '/connection') mutate(r => { r.call.connected = input.connected; if (input.connected) r.call.status = 'active'; else if (r.call.status !== 'completed') r.call.status = 'interrupted'; });
      else if (operation === '/transcript') { if (control.onTranscript) await control.onTranscript(input); }
      else if (operation === '/tool') {
        if (control.toolResult.allowComplete) mutate(r => { r.call.status = 'completed'; r.call.connected = false; });
        return route.fulfill({ status: 200, json: control.toolResult });
      } else if (!['/observation', '/diagnostics'].includes(operation)) throw new Error(`Unexpected mock API operation ${operation}`);
    }
    return route.fulfill({ status: 200, json: structuredClone(room) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:4173/business?room=mock-room#token=mock-business-token');
  await page.waitForFunction(() => window.__mockRealtime);
  const emit = event => page.evaluate(event => window.__mockRealtime.emit(event), event);
  const snapshot = () => page.evaluate(() => ({ sent: window.__mockRealtime.sent, tracks: window.__mockRealtime.tracks.map(t => ({ enabled: t.enabled, stopped: t.stopped })), peers: window.__mockRealtime.peers.map(p => ({ state: p.connectionState })), getUserMediaCalls: window.__mockRealtime.getUserMediaCalls }));
  const responseCount = async () => (await snapshot()).sent.filter(e => e.type === 'response.create').length;
  const responses = count => page.waitForFunction(count => window.__mockRealtime.sent.filter(e => e.type === 'response.create').length === count, count);
  const accept = async () => { await page.locator('#accept-call').waitFor({ state: 'visible' }); await page.locator('#accept-call').click(); await responses(1); };
  return { context, page, room, requests, errors, unexpected, control, mutate, emit, snapshot, responseCount, responses, accept };
}
try {
  const f = await setup();
  assert.equal(await f.page.locator('#accept-call').isVisible(), false);
  assert.equal((await f.snapshot()).getUserMediaCalls, 0);
  f.mutate(r => { r.call.status = 'pending'; });
  await f.page.locator('#accept-call').waitFor({ state: 'visible' });
  assert.equal((await f.snapshot()).getUserMediaCalls, 0);
  await f.accept();
  assert.equal((await f.snapshot()).getUserMediaCalls, 1);
  assert.equal(f.requests.filter(r => r.operation === '/accept').length, 1);
  assert.equal(f.requests.filter(r => r.operation === '/connection' && r.input?.connected).length, 1);
  assert.match(await f.page.locator('#required-questions').innerText(), /Are consultations available today/);
  assert.equal(await f.page.locator('#heard-korean').isDisabled(), true);
  const openingRequest = (await f.snapshot()).sent.find(event => event.type === 'response.create');
  assert.equal(openingRequest.response.tool_choice, 'none');
  assert.deepEqual(openingRequest.response.output_modalities, ['audio']);
  assert.equal((await f.snapshot()).tracks[0].enabled, false);
  check('Authorization and explicit acceptance gate microphone', 'No microphone request before authorized Accept; one mocked connection acknowledgement after data channel opens; translated generated question visible; audible status remains unverified.');

  await f.emit({ type: 'response.created', response: { id: 'r-intro' } });
  await f.emit({ type: 'output_audio_buffer.started', response_id: 'r-intro' });
  assert.equal((await f.snapshot()).tracks[0].enabled, false);
  await f.emit({ type: 'output_audio_buffer.stopped', response_id: 'older-audio' });
  assert.equal((await f.snapshot()).tracks[0].enabled, false);
  await f.emit({ type: 'response.done', response: { id: 'r-intro', status: 'completed', output: [] } });
  assert.equal((await f.snapshot()).tracks[0].enabled, false);
  await f.emit({ type: 'output_audio_buffer.stopped', response_id: 'r-intro' });
  assert.equal((await f.snapshot()).tracks[0].enabled, true);
  check('Laptop turn taking follows actual playback', 'Mic pauses during output audio and remains paused when generation finishes before playback; reopens after playback stops. Synthetic events only.');
  await f.emit({ type: 'input_audio_buffer.committed', item_id: 'empty-noise' });
  assert.equal((await f.snapshot()).tracks[0].enabled, false);
  await f.emit({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'empty-noise', transcript: '   ' });
  assert.equal((await f.snapshot()).tracks[0].enabled, true);
  assert.equal(f.requests.filter(r => r.operation === '/transcript' && r.input?.id === 'empty-noise').length, 0);
  assert.equal(await f.responseCount(), 1);
  check('Empty completed audio is not a lost transcript', 'Silence supplies no business fact and triggers no response, releases the pending evidence wait, and leaves the call active. Synthetic events only.');
  let releaseReview;
  const held = new Promise(done => { releaseReview = done; });
  f.control.onTranscript = async input => { if (input.id === 'business-active') await held; };
  await f.emit({ type: 'input_audio_buffer.committed', item_id: 'business-active' });
  await f.emit({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'business-active', transcript: 'Yes, consultations are available today.' });
  await wait(100);
  assert.equal(await f.responseCount(), 1);
  assert.equal((await f.snapshot()).tracks[0].enabled, false);
  releaseReview(); await f.responses(2);
  await f.emit({ type: 'response.created', response: { id: 'r-question' } });
  check('Business reply waits for authoritative transcript review', 'Mic pauses during mocked semantic review; response.create occurs only after saved review returns active. No browser speech recognition or actual audio used.');

  f.control.onTranscript = async input => { if (input.id === 'business-unavailable') f.mutate(r => { r.call.status = 'awaiting_decision'; r.decisionPrompt = 'This detail is unavailable. Continue or end?'; }); };
  await f.emit({ type: 'input_audio_buffer.committed', item_id: 'business-unavailable' });
  await f.emit({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'business-unavailable', transcript: 'I do not know and cannot check that.' });
  await f.page.waitForFunction(() => window.__mockRealtime.sent.some(e => e.type === 'response.cancel'));
  assert.equal(await f.responseCount(), 2);
  assert.equal((await f.snapshot()).tracks[0].enabled, false);
  assert((await f.snapshot()).sent.some(e => e.type === 'output_audio_buffer.clear'));
  await f.emit({ type: 'response.done', response: { id: 'r-question', status: 'cancelled', output: [] } });
  await f.responses(3);
  assert.equal((await f.snapshot()).sent.filter(e => e.type === 'response.create').at(-1).response.tool_choice, 'none');
  await f.emit({ type: 'response.created', response: { id: 'r-wait' } });
  await f.emit({ type: 'response.done', response: { id: 'r-question', status: 'cancelled', output: [] } });
  assert.equal(await f.responseCount(), 3);
  await f.emit({ type: 'response.done', response: { id: 'r-wait', status: 'completed', output: [] } });
  await wait(1150);
  assert.equal(await f.responseCount(), 3);
  check('Pending customer decision cancels questions and voices one wait', 'Cancellation flushes old output; one tool-disabled wait response; microphone stays paused; repeated state polling and stale response.done do not create a follow-up question.');

  f.mutate(r => { r.call.status = 'active'; r.decisionPrompt = null; r.voiceMessage = { id: 'voice-customer-1', text: '고객이 계속 확인하기를 요청했습니다.' }; });
  await f.responses(4);
  await f.emit({ type: 'response.created', response: { id: 'r-resume' } });
  await f.emit({ type: 'response.done', response: { id: 'r-resume', status: 'completed', output: [] } });
  await wait(1150); assert.equal(await f.responseCount(), 4);
  assert.equal((await f.snapshot()).sent.filter(e => e.type === 'conversation.item.create' && e.item.content?.[0]?.text.includes('고객이 계속 확인하기를 요청했습니다.')).length, 1);
  check('Customer update resumes once without replacing session instructions', 'Application context is injected once by voiceMessage.id; response.create has no instructions override.');
  assert((await f.snapshot()).sent.filter(e => e.type === 'response.create').every(e => !e.response?.instructions));

  f.control.onTranscript = null;
  await f.emit({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'business-answer', transcript: 'That is correct.' });
  await f.responses(5); await f.emit({ type: 'response.created', response: { id: 'r-tool' } });
  const tool = { type: 'function_call', name: 'complete_call', call_id: 'tool-1', arguments: '{}' };
  await f.emit({ type: 'response.function_call_arguments.done', ...tool, type: 'response.function_call_arguments.done', response_id: 'r-tool' });
  await f.emit({ type: 'response.output_item.done', response_id: 'r-tool', item: tool });
  await f.page.waitForFunction(() => window.__mockRealtime.sent.some(e => e.item?.call_id === 'tool-1'));
  assert.equal(await f.responseCount(), 5);
  await f.emit({ type: 'response.done', response: { id: 'r-tool', status: 'completed', output: [tool] } });
  await f.responses(6);
  assert.equal(f.requests.filter(r => r.operation === '/tool' && r.input.callId === 'tool-1').length, 1);
  assert.equal(f.room.call.status, 'active');
  check('Tool deduplication and response completion ordering', 'Three event representations call mocked server once; continuation waits for originating response.done. Denied completion leaves call active.');

  await f.emit({ type: 'response.created', response: { id: 'r-finish-request' } });
  f.control.toolResult = { ok: true, pending: false, allowComplete: true };
  const finishTool = { type: 'function_call', name: 'complete_call', call_id: 'tool-2', arguments: '{}' };
  await f.emit({ ...finishTool, type: 'response.function_call_arguments.done', response_id: 'r-finish-request' });
  await f.page.waitForFunction(() => window.__mockRealtime.sent.some(e => e.item?.call_id === 'tool-2'));
  assert.equal(await f.responseCount(), 6);
  await f.emit({ type: 'response.done', response: { id: 'r-finish-request', status: 'completed', output: [finishTool] } });
  await f.responses(7); await f.emit({ type: 'response.created', response: { id: 'r-goodbye' } });
  await f.emit({ type: 'response.output_audio_transcript.done', item_id: 'assistant-goodbye', transcript: '확인해 주셔서 감사합니다. 안녕히 계세요.' });
  await f.emit({ type: 'response.done', response: { id: 'r-goodbye', status: 'completed', output: [] } });
  assert.equal((await f.snapshot()).tracks[0].stopped, false);
  await f.emit({ type: 'output_audio_buffer.stopped', response_id: 'r-finish-request' });
  assert.equal((await f.snapshot()).tracks[0].stopped, false);
  await f.emit({ type: 'output_audio_buffer.stopped', response_id: 'r-goodbye' });
  await f.page.waitForFunction(() => window.__mockRealtime.tracks.every(t => t.stopped));
  assert(f.requests.some(r => r.operation === '/transcript' && r.input.id === 'assistant-goodbye'));
  check('Authoritative completion waits for final audio playback event', 'Only server allowComplete starts goodbye; response.done and an old playback-stop do not close tracks; matching goodbye playback-stop releases tracks and preserves farewell text. Audio event itself is synthetic.');

  await f.page.setViewportSize({ width: 390, height: 844 });
  const geometry = await f.page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert(geometry.scrollWidth <= geometry.width);
  check('Mobile layout at 390 pixels', geometry);

  const fragments = await setup({ status: 'pending' }); await fragments.accept();
  await fragments.emit({ type: 'response.created', response: { id: 'fragment-intro' } });
  await fragments.emit({ type: 'output_audio_buffer.started', response_id: 'fragment-intro' });
  await fragments.emit({ type: 'response.done', response: { id: 'fragment-intro', status: 'completed', output: [] } });
  await fragments.emit({ type: 'output_audio_buffer.stopped', response_id: 'fragment-intro' });
  let releaseFragments;
  const fragmentHold = new Promise(done => { releaseFragments = done; });
  fragments.control.onTranscript = async input => { if (input.id === 'fragment-one') await fragmentHold; };
  await fragments.emit({ type: 'input_audio_buffer.committed', item_id: 'fragment-one' });
  await fragments.emit({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'fragment-one', transcript: '네, 안녕하세요.' });
  await fragments.emit({ type: 'input_audio_buffer.speech_started', item_id: 'fragment-two' });
  assert.equal((await fragments.snapshot()).tracks[0].enabled, true);
  releaseFragments(); await wait(150);
  assert.equal(await fragments.responseCount(), 1);
  assert.equal((await fragments.snapshot()).tracks[0].enabled, true);
  await fragments.emit({ type: 'input_audio_buffer.speech_stopped', item_id: 'fragment-two' });
  await fragments.emit({ type: 'input_audio_buffer.committed', item_id: 'fragment-two' });
  await fragments.emit({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'fragment-two', transcript: '네, 죄송합니다.' });
  await fragments.responses(2);
  await wait(100); assert.equal(await fragments.responseCount(), 2);
  await fragments.emit({ type: 'response.created', response: { id: 'fragment-reply' } });
  await fragments.emit({ type: 'response.done', response: { id: 'fragment-reply', status: 'completed', output: [{ type: 'message', content: [{ type: 'audio', transcript: '확인해 주세요.' }] }] } });
  assert.equal((await fragments.snapshot()).tracks[0].enabled, false);
  // A customer update arriving between generation and playback must queue.
  fragments.mutate(r => { r.voiceMessage = { id: 'fragment-update', text: '고객의 새 정보입니다.' }; });
  await wait(1150); assert.equal(await fragments.responseCount(), 2);
  await fragments.emit({ type: 'output_audio_buffer.started', response_id: 'fragment-reply' });
  await fragments.emit({ type: 'output_audio_buffer.stopped', response_id: 'stale-fragment' });
  assert.equal(await fragments.responseCount(), 2);
  await fragments.emit({ type: 'output_audio_buffer.stopped', response_id: 'fragment-reply' });
  await fragments.responses(3);
  await fragments.emit({ type: 'response.created', response: { id: 'fragment-next' } });
  await fragments.emit({ type: 'output_audio_buffer.started', response_id: 'fragment-next' });
  await fragments.emit({ type: 'response.done', response: { id: 'fragment-next', status: 'completed', output: [] } });
  await fragments.emit({ type: 'output_audio_buffer.stopped', response_id: 'fragment-reply' });
  assert.equal((await fragments.snapshot()).tracks[0].enabled, false);
  await fragments.emit({ type: 'output_audio_buffer.stopped', response_id: 'fragment-next' });
  assert.equal((await fragments.snapshot()).tracks[0].enabled, true);
  check('Consecutive fragments coalesce and audio drains before the next response', 'Review returning during a second utterance preserves microphone capture and waits for both transcripts before one continuation; response.done audio reserves playback before started; queued update waits for matching drain, stale stop cannot unlock newer playback, and microphone reopens after final drain. Synthetic regression of the real shop stall.');
  fragments.control.onTranscript = async input => {
    if (input.id === 'known-detail-question') fragments.mutate(r => { r.voiceMessage = { id: 'known-detail-answer', sourceTranscriptId: input.id, text: '고객은 방수 기능을 원합니다.' }; });
  };
  await fragments.emit({ type: 'input_audio_buffer.committed', item_id: 'known-detail-question' });
  await fragments.emit({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'known-detail-question', transcript: '방수 기능이 필요하세요?' });
  await fragments.responses(4);
  await fragments.emit({ type: 'response.created', response: { id: 'known-detail-reply' } });
  await fragments.emit({ type: 'output_audio_buffer.started', response_id: 'known-detail-reply' });
  await fragments.emit({ type: 'response.done', response: { id: 'known-detail-reply', status: 'completed', output: [] } });
  await fragments.emit({ type: 'output_audio_buffer.stopped', response_id: 'known-detail-reply' });
  await wait(150); assert.equal(await fragments.responseCount(), 4);
  assert.equal((await fragments.snapshot()).tracks[0].enabled, true);
  check('Server-detected known detail produces one Korean continuation', 'A synthetic transcript review supplies an existing customer fact through voiceMessage; the client relays it once without scheduling a duplicate generic follow-up.');

  const delayed = await setup({ status: 'pending', sessionCreated: false, remoteTrack: false, playPending: true });
  await delayed.page.locator('#accept-call').click();
  await delayed.page.waitForFunction(() => window.__mockRealtime.channel?.readyState === 'open');
  await wait(150);
  assert.equal(await delayed.responseCount(), 0);
  assert.equal((await delayed.snapshot()).tracks[0].enabled, false);
  await delayed.page.evaluate(() => window.__mockRealtime.emitSession());
  await wait(100);
  assert.equal(await delayed.responseCount(), 0);
  await delayed.page.evaluate(() => window.__mockRealtime.attachRemoteTrack());
  await delayed.responses(1);
  await delayed.page.evaluate(() => { window.__mockRealtime.emitSession(); window.__mockRealtime.attachRemoteTrack(); });
  await wait(100);
  assert.equal(await delayed.responseCount(), 1);
  assert.equal((await delayed.snapshot()).tracks[0].enabled, false);
  check('Opening waits for session readiness and remote track exactly once', 'Mock data-channel open is insufficient; no opening before both session.created and remote track. A pending media play promise does not cause circular startup waiting; duplicate readiness events do not duplicate opening.');
  await delayed.page.locator('#end-call').click();
  await delayed.page.waitForFunction(() => window.__mockRealtime.tracks.every(t => t.stopped));

  const silent = await setup({ status: 'pending', fastOpeningTimeout: true });
  await silent.accept();
  await silent.emit({ type: 'response.created', response: { id: 'silent-opening' } });
  await silent.emit({ type: 'response.done', response: { id: 'silent-opening', status: 'completed', output: [] } });
  assert.equal((await silent.snapshot()).tracks[0].enabled, false);
  await silent.page.locator('#error').filter({ hasText: 'opening audio did not start' }).waitFor();
  assert.equal((await silent.snapshot()).tracks[0].stopped, true);
  assert.equal(await silent.responseCount(), 1);
  check('Silent opening times out explicitly without overlap or claimed success', 'Synthetic clock accelerates the 12-second watchdog. A completed response with no output audio never unlocks the mic, stops the peer, and reports missing opening audio; no automatic overlapping retry.');

  const blocked = await setup({ status: 'pending', playBlocked: true });
  await blocked.accept();
  await blocked.emit({ type: 'response.created', response: { id: 'blocked-opening' } });
  await blocked.emit({ type: 'output_audio_buffer.started', response_id: 'blocked-opening' });
  await blocked.emit({ type: 'response.done', response: { id: 'blocked-opening', status: 'completed', output: [] } });
  await blocked.emit({ type: 'output_audio_buffer.stopped', response_id: 'blocked-opening' });
  assert.equal((await blocked.snapshot()).tracks[0].enabled, false);
  await blocked.page.locator('#play-audio').waitFor({ state: 'visible' });
  await blocked.page.evaluate(() => { window.__mockRealtime.playBlocked = false; });
  await blocked.page.locator('#play-audio').click();
  await blocked.page.waitForFunction(() => window.__mockRealtime.tracks[0].enabled);
  check('Autoplay refusal requires explicit playback before microphone can open', 'Synthetic playback rejection keeps the mic paused even after provider audio-stop; mocked successful Play incoming audio releases the opening gate. This is not proof of audible sound.');
  await blocked.page.locator('#end-call').click();

  const denied = await setup({ status: 'pending', deny: true });
  await denied.page.locator('#accept-call').click();
  await denied.page.locator('#error').filter({ hasText: 'Microphone permission was denied' }).waitFor();
  assert.equal((await denied.snapshot()).peers.length, 0);
  assert.equal(denied.requests.filter(r => r.operation === '/realtime').length, 0);
  assert.equal(denied.requests.filter(r => r.operation === '/connection' && r.input.connected).length, 0);
  check('Denied microphone fails without voice connection', 'Synthetic NotAllowedError displays explicit error; no peer/SDP/connected:true request.');

  const failed = await setup({ status: 'pending' }); await failed.accept();
  await failed.page.evaluate(() => window.__mockRealtime.fail());
  await failed.page.waitForFunction(() => window.__mockRealtime.tracks.every(t => t.stopped));
  await failed.page.locator('#error').filter({ hasText: 'WebRTC failed' }).waitFor();
  assert.equal((await failed.snapshot()).peers[0].state, 'closed');
  check('Connection failure closes peer and releases microphone', 'Synthetic failed state stops all tracks and displays interrupted failure rather than successful completion.');
  for (const flow of [f, delayed, silent, blocked, denied, failed]) { assert.deepEqual(flow.errors, []); assert.deepEqual(flow.unexpected, []); }
  report.requestEvidence = f.requests.filter(r => r.method === 'POST');
  report.eventEvidence = (await f.snapshot()).sent;
  report.unexpectedNetwork = [];
  report.passed = true;
} catch (error) { report.passed = false; report.failure = { message: error.message, stack: error.stack }; process.exitCode = 1; }
finally {
  for (const context of contexts) await context.close();
  await browser.close();
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'business-ui-check.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, mock: true, realAPI: false, realMicrophone: false, artifact: relative(root, resolve(output, 'business-ui-check.json')), failure: report.failure?.message }, null, 2));
}
