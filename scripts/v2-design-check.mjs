import assert from 'node:assert/strict';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { translations, languageNames } from '../public/v2/i18n.js';

// UI-only regression checks. Every request (including static assets) is handled
// locally. Room, Responses, and Realtime behavior is synthetic; no API key,
// microphone, external service, or actual business is used by this script.
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'artifacts/v2-design');
await mkdir(output, { recursive: true });
const require = createRequire(import.meta.url);
let playwright;
for (const candidate of [process.env.PLAYWRIGHT_MODULE, 'playwright', path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)) {
  try { playwright = require(candidate); break; } catch {}
}
if (!playwright) throw new Error('Set PLAYWRIGHT_MODULE to an existing Playwright installation. No dependencies are installed.');
let executablePath = process.env.CHROME_EXECUTABLE;
if (!executablePath && process.platform === 'win32') {
  for (const candidate of [path.join(process.env.PROGRAMFILES || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'), path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe')]) {
    try { await access(candidate); executablePath = candidate; break; } catch {}
  }
}
const browser = await playwright.chromium.launch({ executablePath, headless: true });
const origin = new URL(process.env.DEMO_URL || 'http://localhost:4174').origin;
const report = {
  generatedAt: new Date().toISOString(), mock: true, realAPI: false, realMicrophone: false, audibleKorean: false,
  method: 'Isolated Playwright contexts. Static files served from disk; all API responses are synthetic fixtures. External requests blocked; microphone and WebRTC unavailable.',
  viewports: '320×844, 390×844, 390×480, 768×1000, 1440×1000',
  checks: [], screenshots: [], errors: [], unexpectedNetwork: [], sources: {},
};
for (const file of ['public/v2/customer.js', 'public/v2/index.html', 'public/v2/styles.css', 'public/v2/theme.css', 'public/v2/i18n.js', 'public/v2/business.html', 'public/v2/business.css', 'scripts/v2-design-check.mjs']) {
  report.sources[file] = createHash('sha256').update(await readFile(path.join(root, file))).digest('hex');
}
const contexts = [];
async function check(name, fn) {
  try { await fn(); report.checks.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) { report.checks.push({ name, passed: false, error: error.message }); console.error('FAIL', name, error.message); }
}
async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(output, file), fullPage: false, animations: 'disabled' });
  report.screenshots.push(file);
}
async function noOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    viewport: innerWidth, page: document.documentElement.scrollWidth, body: document.body.scrollWidth,
    controls: [...document.querySelectorAll('button, textarea, select, input, summary, a[class]')].filter(el => el.getClientRects().length && !el.closest('[hidden]')).flatMap(el => {
      const rect = el.getBoundingClientRect();
      if (el.classList.contains('skip-link') && el !== document.activeElement) return [];
      return rect.left < -1 || rect.right > innerWidth + 1 ? [{ id: el.id || el.className, left: rect.left, right: rect.right }] : [];
    }),
  }));
  assert.ok(geometry.page <= geometry.viewport + 1 && geometry.body <= geometry.viewport + 1, `${label}: ${JSON.stringify(geometry)}`);
  assert.deepEqual(geometry.controls, [], `${label}: interactive controls must remain inside viewport`);
}
async function touchTargets(page, selectors) {
  const sizes = await page.evaluate(selectors => selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(el => el.getClientRects().length).map(el => {
    const rect = el.getBoundingClientRect();
    return { selector, label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 50), width: rect.width, height: rect.height };
  })), selectors);
  assert.ok(sizes.length, 'Expected primary touch controls');
  assert.deepEqual(sizes.filter(item => item.width < 43.5 || item.height < 43.5), [], 'Primary touch controls should be at least 44×44 CSS pixels');
}
async function scrollTo(page, selector) {
  await page.locator(selector).first().evaluate(el => window.scrollTo({ top: Math.max(0, scrollY + el.getBoundingClientRect().top - 100), behavior: 'instant' }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
const fixtureCopy = {
  en: { request: 'Find a clinic near Hongdae for tomorrow afternoon.', clarification: 'Would you prefer an afternoon appointment?', answer: 'Yes, after 2 pm.', plan: 'Here is the plan. I will confirm availability and whether English support is available.', institution: 'Hongdae Family Clinic', reason: 'Fictional practice near Hongdae for this demonstration.', question: 'Is an appointment available tomorrow after 2 pm?', relay: 'Is this your first visit?', reply: 'Yes, this is my first visit.', summary: 'The fictional clinic confirmed an afternoon slot and English support.', recommendation: 'Bring your identification and arrive ten minutes early.', reasoning: 'These preparations match the information confirmed during the simulation.' },
  ru: { request: 'Найдите клинику рядом с Хондэ на завтра после обеда.', clarification: 'Вам удобнее приём после обеда?', answer: 'Да, после 14:00.', plan: 'Я уточню свободное время и возможность обслуживания на английском языке.', institution: 'Семейная клиника Хондэ', reason: 'Вымышленная клиника для этой демонстрации.', question: 'Есть ли запись на завтра после 14:00?', relay: 'Это ваш первый визит?', reply: 'Да, я приду впервые.', summary: 'Вымышленная клиника подтвердила время и помощь на английском.', recommendation: 'Возьмите удостоверение личности и приходите на десять минут раньше.', reasoning: 'Эти рекомендации основаны на информации, подтверждённой в симуляции.' },
  zh: { request: '请找一家弘大附近明天下午可以预约的诊所。', clarification: '您希望预约下午的时间吗？', answer: '是的，下午两点以后。', plan: '我会确认预约时间以及是否提供英语服务。', institution: '弘大家庭诊所', reason: '用于本次演示的虚构诊所。', question: '明天下午两点以后可以预约吗？', relay: '这是您的第一次就诊吗？', reply: '是的，这是我第一次就诊。', summary: '虚构诊所确认了下午的时间和英语服务。', recommendation: '请携带身份证件并提前十分钟到达。', reasoning: '这些建议基于模拟中确认的信息。' },
};
async function setup({ language = 'en', width = 390, height = 844, business = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' }); contexts.push(context);
  let room = null, version = 0, chats = 0;
  const requests = [], errors = [];
  await context.addInitScript(() => {
    window.__blockedMediaAttempts = 0;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { async getUserMedia() { window.__blockedMediaAttempts++; throw new Error('Microphone prohibited during synthetic design QA'); } } });
    window.RTCPeerConnection = class { constructor() { throw new Error('WebRTC prohibited during synthetic design QA'); } };
  });
  const touch = fn => { fn(room); room.version = ++version; };
  if (business) room = { id: 'design-room', version: ++version, call: { status: 'pending', connected: false }, requiredQuestions: [{ id: 'availability', text: fixtureCopy.en.question, korean: '내일 오후 두 시 이후에 예약할 수 있나요?', status: 'unresolved', evidence: [] }], messages: [], pendingRelay: null };
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) { report.unexpectedNetwork.push(url.origin + url.pathname); return route.abort(); }
    const json = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname.startsWith('/api/')) {
      requests.push({ path: url.pathname, method: request.method(), body: request.method() === 'POST' ? request.postDataJSON() : null });
      if (url.pathname === '/api/config') return json({ configured: true, publicBaseUrl: null });
      if (url.pathname === '/api/rooms' && request.method() === 'POST') {
        assert.equal(request.postDataJSON().language, language);
        room = { id: 'design-room', language, version: ++version, messages: [], customerInfo: [], institutions: [], requiredQuestions: [], planReady: false, call: { status: 'idle', connected: false }, busy: false };
        return json({ id: room.id, customerToken: 'synthetic-customer-token', businessToken: 'synthetic-business-token', state: room });
      }
      if (url.pathname.startsWith('/api/rooms/design-room')) {
        assert.equal(request.headers().authorization, `Bearer synthetic-${business ? 'business' : 'customer'}-token`);
        const operation = url.pathname.slice('/api/rooms/design-room'.length), copy = fixtureCopy[language];
        if (request.method() === 'POST') {
          if (operation === '/chat') {
            const message = request.postDataJSON().message;
            touch(r => { r.messages.push({ id: `user-${version}`, role: 'user', text: message }); }); chats++;
            if (room.pendingRelay) touch(r => { r.pendingRelay = null; r.call = { status: 'active', connected: true }; r.customerInfo.push({ key: 'first_visit_internal_key', value: copy.reply }); });
            else if (chats === 1) touch(r => { r.messages.push({ id: `assistant-${version}`, role: 'assistant', text: copy.clarification }); });
            else touch(r => {
              r.messages.push({ id: `assistant-${version}`, role: 'assistant', text: copy.plan }); r.planReady = true;
              r.institutions = [{ id: 'fictional-clinic', name: copy.institution, reason: copy.reason }];
              r.requiredQuestions = [{ id: 'availability', text: copy.question, status: 'unresolved' }];
              r.customerInfo = [{ key: 'location_internal_key', value: 'Hongdae, Seoul' }];
            });
          } else if (operation === '/authorize') {
            assert.equal(request.postDataJSON().institutionId, 'fictional-clinic'); touch(r => { r.call = { status: 'pending', connected: false }; });
          } else if (operation === '/decision') {
            assert.equal(request.postDataJSON().action, 'continue'); touch(r => { r.call = { status: 'active', connected: true }; r.decisionPrompt = null; });
          } else if (operation === '/end') touch(r => { r.call = { status: 'interrupted', connected: false }; });
          else throw new Error(`Unexpected synthetic mutation: ${operation}`);
        }
        return json(room);
      }
      report.unexpectedNetwork.push(url.pathname); return route.fulfill({ status: 503, json: { error: { code: 'QA_BLOCKED' } } });
    }
    if (url.pathname === '/favicon.ico') return route.fulfill({ status: 204 });
    const relative = url.pathname === '/' || url.pathname === '/v2/' ? 'v2/index.html' : url.pathname === '/business' ? 'v2/business.html' : url.pathname.slice(1);
    const file = path.resolve(root, 'public', relative);
    assert.ok(file.startsWith(path.resolve(root, 'public') + path.sep));
    try {
      const body = await readFile(file);
      return route.fulfill({ status: 200, body, contentType: file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.woff2') ? 'font/woff2' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html' });
    } catch { report.unexpectedNetwork.push(url.pathname); return route.fulfill({ status: 404, body: 'Missing local fixture asset' }); }
  });
  const page = await context.newPage(); page.setDefaultTimeout(6000); page.on('pageerror', error => { errors.push(error.message); report.errors.push(error.message); });
  await page.goto(business ? `${origin}/business?room=design-room#token=synthetic-business-token` : `${origin}/v2/`);
  await page.evaluate(() => document.fonts.ready);
  if (!business && language !== 'en') await page.getByRole('button', { name: languageNames[language], exact: true }).click();
  const send = async text => { await page.locator('#message-input').fill(text); await page.locator('#send').click(); await page.waitForFunction(() => !document.querySelector('#send').disabled); };
  return { context, page, requests, errors, get room() { return room; }, touch, send, copy: fixtureCopy[language] };
}

try {
  await check('Translation key parity across English, Russian, and Chinese', async () => {
    const keys = Object.keys(translations.en).sort(); for (const lang of ['ru', 'zh']) assert.deepEqual(Object.keys(translations[lang]).sort(), keys);
  });
  const flows = [];
  for (const language of process.env.V2_DESIGN_FOCUS === 'business' ? [] : ['en', 'ru', 'zh']) {
    const f = await setup({ language }); flows.push(f); const { page, copy } = f;
    await check(`${language}: home at 320, 390, 768, and 1440 pixels`, async () => {
      assert.equal(await page.locator('html').getAttribute('lang'), language);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 }); await noOverflow(page, `${language} home ${width}`);
        if (width === 320 || width === 390 || width === 1440) await capture(page, `${language}-home-${width}`);
      }
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await check(`${language}: phone touch targets and readable input`, async () => {
      await touchTargets(page, ['#new-chat', '.starter-button', '#send', '.language-button']);
      assert.ok(await page.locator('#message-input').evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 16), 'Text entry must avoid mobile focus zoom');
    });
    await check(`${language}: shop starter preserves the upstream rehearsal prompt`, async () => {
      assert.equal(await page.locator('#shop-starter').count(), 1);
      await page.locator('#shop-starter').click();
      assert.equal(await page.locator('#message-input').inputValue(), translations[language].shopStarter);
      assert.equal(await page.locator('#message-input').evaluate(el => el === document.activeElement), true);
      assert.equal(f.requests.filter(request => request.method === 'POST').length, 0, 'Starter prepares text without sending it or authorizing a call');
      await page.locator('#message-input').fill('');
    });
    await check(`${language}: clarification and plan preserve the room API`, async () => {
      await f.send(copy.request); await page.getByText(copy.clarification, { exact: true }).waitFor();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const replyGeometry = await page.evaluate(() => {
        const reply = [...document.querySelectorAll('.message.assistant')].at(-1).getBoundingClientRect();
        return { top: reply.top, bottom: reply.bottom, composerTop: document.querySelector('.composer-dock').getBoundingClientRect().top };
      });
      assert.ok(replyGeometry.top >= 0 && replyGeometry.bottom <= replyGeometry.composerTop, `The incoming reply must be readable above the fixed composer: ${JSON.stringify(replyGeometry)}`);
      assert.equal(f.room.planReady, false); await capture(page, `${language}-clarification-390`);
      await f.send(copy.answer); await page.locator('.institution-option').waitFor();
      assert.equal(f.room.planReady, true); assert.equal(f.room.call.status, 'idle');
      assert.equal(f.requests.find(r => r.path === '/api/rooms').body.language, language);
      assert.equal(await page.locator('.institution-option input').isChecked(), true);
      const businessLink = await page.getByRole('link', { name: translations[language].openBusiness, exact: true }).getAttribute('href');
      assert.equal(businessLink, `${origin}/business?room=design-room#token=synthetic-business-token`);
      await scrollTo(page, '.institution-options'); await noOverflow(page, `${language} plan`); await capture(page, `${language}-plan-390`);
    });
    await check(`${language}: narrow plan and explicit authorization`, async () => {
      await page.setViewportSize({ width: 320, height: 844 }); await noOverflow(page, `${language} narrow plan`);
      await touchTargets(page, ['.institution-option', '.primary-button', '.link-button']);
      await capture(page, `${language}-plan-320`);
      await page.getByRole('button', { name: translations[language].yes, exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#call-state') && !document.querySelector('#call-state').hidden);
      assert.equal(f.room.call.status, 'pending'); assert.equal(await page.locator('#call-state.is-active').count(), 0);
      assert.equal(f.requests.filter(r => r.path.endsWith('/authorize')).length, 1);
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await check(`${language}: business clarification reaches customer and returns as chat`, async () => {
      f.touch(r => { r.call = { status: 'waiting_customer', connected: true }; r.pendingRelay = { question: copy.relay }; });
      await page.getByText(copy.relay, { exact: true }).waitFor();
      assert.equal(await page.locator('#call-state.is-active').count(), 1);
      await scrollTo(page, '.relay'); await noOverflow(page, `${language} relay`); await capture(page, `${language}-relay-390`);
      await f.send(copy.reply); await page.locator('.relay').waitFor({ state: 'hidden' });
      assert.equal(f.room.call.status, 'active'); assert.equal(f.requests.filter(r => r.path.endsWith('/chat')).at(-1).body.message, copy.reply);
    });
    await check(`${language}: unresolved decision and grounded completion`, async () => {
      f.touch(r => { r.call.status = 'awaiting_decision'; r.decisionPrompt = copy.question; });
      await page.getByRole('button', { name: translations[language].continueCall, exact: true }).click();
      assert.equal(f.room.decisionPrompt, null);
      f.touch(r => { r.call = { status: 'completed', connected: false }; r.requiredQuestions[0].status = 'resolved'; r.requiredQuestions[0].answer = language === 'zh' ? '下午三点可以。' : language === 'ru' ? 'Есть запись в 15:00.' : 'An appointment is available at 3 pm.'; r.summary = { text: copy.summary, details: { answers: [{ id: 'availability', answer: r.requiredQuestions[0].answer }], unresolved: [] }, recommendation: copy.recommendation, reasoning: copy.reasoning }; });
      await page.locator('.result-answers').waitFor();
      assert.equal(await page.locator('.result-details').getAttribute('open'), null);
      assert.equal(await page.locator('.business-panel').count(), 0);
      await scrollTo(page, '.result-card'); await capture(page, `${language}-result-clean-390`);
      await page.locator('.result-details > summary').click();
      await page.getByText(copy.summary, { exact: true }).waitFor(); assert.equal(await page.locator('#call-state.is-active').count(), 0);
      const text = await page.locator('#context').innerText(); for (const item of [copy.summary, copy.recommendation, copy.reasoning]) assert.ok(text.includes(item));
      assert.doesNotMatch(text, /first_visit_internal_key|location_internal_key/);
      await scrollTo(page, '.summary-text'); await noOverflow(page, `${language} summary`); await capture(page, `${language}-summary-390`);
    });
    await check(`${language}: confirmation dialog focus, keyboard dismissal, and narrow layout`, async () => {
      await page.setViewportSize({ width: 320, height: 844 }); await page.locator('#new-chat').click();
      const dialog = page.locator('#confirm-dialog'); await dialog.waitFor({ state: 'visible' });
      assert.ok(await dialog.evaluate(el => (el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ')).trim()), 'Modal needs an accessible name');
      assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true);
      for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); assert.ok(await dialog.evaluate(el => !document.hasFocus() || el.contains(document.activeElement)), 'Page focus must remain within modal'); }
      await noOverflow(page, `${language} confirmation`); await capture(page, `${language}-confirm-320`);
      await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
      assert.equal(await page.locator('#new-chat').evaluate(el => el === document.activeElement), true);
      assert.equal(f.requests.filter(r => r.path.endsWith('/end')).length, 0, 'Dismissing confirmation must not mutate the room');
    });
  }
  if (flows.length) {
  const { page } = flows[0];
  await page.setViewportSize({ width: 390, height: 844 });
  await check('Polling preserves the draft and its input focus', async () => {
    await page.locator('#message-input').fill('A draft that has not been sent');
    const before = flows[0].requests.filter(request => request.method === 'GET').length;
    flows[0].touch(r => { r.customerInfo.push({ key: 'test_context', value: 'Synthetic context update' }); });
    await page.waitForFunction(() => document.querySelector('#context').textContent.includes('Synthetic context update'));
    assert.ok(flows[0].requests.filter(request => request.method === 'GET').length > before, 'Waited for an actual polling cycle');
    assert.equal(await page.locator('#message-input').inputValue(), 'A draft that has not been sent');
    assert.equal(await page.locator('#message-input').evaluate(el => el === document.activeElement), true);
    await page.locator('#message-input').fill('');
  });
  await check('Incoming text preserves a person’s reading position', async () => {
    flows[0].touch(r => {
      for (let index = 0; index < 8; index++) r.messages.push({ id: `reading-${index}`, role: 'assistant', text: `Synthetic reading item ${index + 1}. This longer history checks that a new update does not pull the reader away from older messages.` });
    });
    await page.getByText(/^Synthetic reading item 8\./).waitFor();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(() => window.scrollY === 0);
    flows[0].touch(r => { r.messages.push({ id: 'reading-new', role: 'assistant', text: 'A new synthetic message arrives while you are reading.' }); });
    await page.getByText('A new synthetic message arrives while you are reading.', { exact: true }).waitFor();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.ok(await page.evaluate(() => window.scrollY <= 2), 'New messages must not force the reader to the bottom');
    await page.locator('#latest-message').waitFor({ state: 'visible' });
    await capture(page, 'en-reading-position-390');
    await page.locator('#latest-message').click();
    await page.waitForFunction(() => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 220);
    assert.equal(await page.locator('#latest-message').isVisible(), false, 'Latest update restores following and dismisses itself');
    const lastContent = await page.evaluate(() => ({ bottom: document.querySelector('#context').lastElementChild.getBoundingClientRect().bottom, composerTop: document.querySelector('.composer-dock').getBoundingClientRect().top }));
    assert.ok(lastContent.bottom <= lastContent.composerTop, `Latest content must remain above the fixed composer: ${JSON.stringify(lastContent)}`);
  });
  await page.setViewportSize({ width: 390, height: 480 });
  await check('Short phone viewport keeps the composer reachable and above its note', async () => {
    await noOverflow(page, 'short viewport');
    const geometry = await page.evaluate(() => { const composer = document.querySelector('.composer').getBoundingClientRect(), input = document.querySelector('#message-input').getBoundingClientRect(); return { composer: { top: composer.top, bottom: composer.bottom }, input: { top: input.top, bottom: input.bottom }, height: innerHeight }; });
    assert.ok(geometry.composer.top >= 0 && geometry.composer.bottom <= geometry.height + 1, JSON.stringify(geometry));
    assert.ok(geometry.input.top >= 0 && geometry.input.bottom <= geometry.height + 1, JSON.stringify(geometry));
    await capture(page, 'en-short-phone-390');
  });
  await page.setViewportSize({ width: 1440, height: 1000 }); await scrollTo(page, '.summary-text'); await capture(page, 'en-summary-1440');
  await check('Reduced-motion preference suppresses decorative animation', async () => {
    const animated = await page.locator('.message, .message-section, .composer, .welcome').evaluateAll(nodes => nodes.filter(el => el.getClientRects().length).map(el => ({ animation: getComputedStyle(el).animationDuration, transition: getComputedStyle(el).transitionDuration })));
    assert.ok(animated.length); assert.ok(animated.every(item => [...item.animation.split(','), ...item.transition.split(',')].every(duration => parseFloat(duration) <= 0.01)), JSON.stringify(animated));
  });
  await check('Self-hosted Inter font is loaded', async () => {
    const faces = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].map(face => ({ family: face.family, status: face.status })); });
    assert.ok(faces.some(face => face.family.replaceAll('"', '') === 'Inter' && face.status === 'loaded'), JSON.stringify(faces));
  });
  }
  const business = await setup({ business: true, width: 1440, height: 1000 });
  await check('Business desk desktop and mobile layouts with explicit acceptance', async () => {
    await business.page.locator('#accept-call').waitFor({ state: 'visible' });
    for (const width of [1440, 390, 320]) {
      await business.page.setViewportSize({ width, height: width < 768 ? 844 : 1000 }); await noOverflow(business.page, `business ${width}`);
      await touchTargets(business.page, ['#accept-call']); await capture(business.page, `business-pending-${width}`);
    }
    assert.equal(await business.page.evaluate(() => window.__blockedMediaAttempts), 0);
    assert.equal(business.requests.some(request => request.path.endsWith('/accept') || request.path.endsWith('/realtime')), false);
    assert.equal(await business.page.locator('#heard-korean').isDisabled(), true);
  });
  await check('No page errors, unexpected network, or microphone attempts', async () => {
    assert.deepEqual(report.errors, []); assert.deepEqual(report.unexpectedNetwork, []);
    for (const f of [...flows, business]) assert.equal(await f.page.evaluate(() => window.__blockedMediaAttempts), 0);
  });
} catch (error) { report.checks.push({ name: 'Design QA flow', passed: false, error: error.stack }); console.error(error); }
finally {
  for (const context of contexts) await context.close(); await browser.close();
  report.passed = report.checks.every(item => item.passed); report.passedChecks = report.checks.filter(item => item.passed).length;
  await writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, checks: report.passedChecks, total: report.checks.length, report: 'artifacts/v2-design/results.json' }));
  if (!report.passed) process.exitCode = 1;
}
