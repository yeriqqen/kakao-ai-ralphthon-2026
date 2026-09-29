import assert from 'node:assert/strict';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';

// All API traffic is intercepted. These fixtures do not contact OpenAI,
// request microphone permission, or create a phone call.
const require = createRequire(import.meta.url);
const modulePath = process.env.PLAYWRIGHT_MODULE || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const loaded = await import(pathToFileURL(require.resolve(modulePath)).href);
const { chromium } = loaded.chromium ? loaded : loaded.default;
const out = new URL('../artifacts/ui-polish/', import.meta.url);
await mkdir(out, { recursive: true });
let executablePath = process.env.CHROME_EXECUTABLE;
if (!executablePath && process.platform === 'win32') {
  for (const candidate of [path.join(process.env.PROGRAMFILES || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'), path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe')]) {
    try { await access(candidate); executablePath = candidate; break; } catch {}
  }
}
const browser = await chromium.launch({ executablePath, headless: true });
const origin = new URL(process.env.DEMO_URL || 'http://localhost:4173').origin;
const checks = [], errors = [], screenshots = [], apiRequests = [], touchTargets = [];
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const page = await context.newPage();
page.setDefaultTimeout(6000);
page.on('pageerror', error => errors.push(error.message));

const clarification = {
  message: 'I can look for a nearby clinic with English-speaking staff.',
  question: 'Would you like me to start around Hongdae?',
  choices: ['Yes, Hongdae', 'Another neighborhood'],
  places: [], actions: [], sources: [], suggestions: [], summary: null,
};
const result = {
  message: 'Here are two options to explore near Hongdae. I can help check availability and prepare what to say.',
  question: null, choices: [],
  places: [
    { name: 'Hongdae International Clinic', detail: 'Synthetic QA example · English-language support', address: '123 World Cup Buk-ro, Mapo-gu, Seoul', url: 'https://example.com/clinic', phone: '+82 2 1234 5678' },
    { name: 'Mapo Family Care', detail: 'Synthetic QA example · General care', address: '456 Yanghwa-ro, Mapo-gu, Seoul', url: 'https://example.com/care', phone: '+82 2 2345 6789' },
  ],
  actions: [{ id: 'ui-polish-call', title: 'Check appointment availability', business: 'Hongdae International Clinic', phone: '+82 2 1234 5678', purpose: 'Ask about an English-speaking appointment tomorrow after 2 pm. Do not make a booking yet.', detailsToShare: 'Alex is an English-speaking visitor in Hongdae. Preferred time: tomorrow after 2 pm.', sourceUrl: 'https://example.com/clinic' }],
  summary: { title: 'Your visit, made simpler', facts: ['Two nearby options to consider.', 'Hours and appointment availability still need confirmation.'], nextSteps: ['Ask about tomorrow afternoon.', 'Bring your passport or residence card.'], korean: '안녕하세요. 내일 오후 2시 이후에 영어 진료 예약이 가능한가요?' },
  sources: [{ title: 'Clinic information', url: 'https://example.com/clinic' }, { title: 'Location and directions', url: 'https://example.com/map' }],
  suggestions: ['Prepare my Korean request', 'Help me get there'],
};
let nextResult = clarification;
let onChatHeld, releaseChat;
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url());
  if (url.origin !== origin) return route.abort('blockedbyclient');
  if (!url.pathname.startsWith('/api/')) return route.continue();
  apiRequests.push({ path: url.pathname, method: request.method(), body: request.postDataJSON() });
  if (url.pathname === '/api/status') return route.fulfill({ json: { connected: true, calling: false } });
  if (url.pathname === '/api/chat') {
    if (onChatHeld) {
      const ready = onChatHeld; onChatHeld = null;
      await new Promise(resolve => { releaseChat = resolve; ready(); });
    }
    return route.fulfill({ contentType: 'application/x-ndjson', body: [
      { type: 'status', stage: 'thinking' }, { type: 'status', stage: 'searching' }, { type: 'result', result: nextResult },
    ].map(item => JSON.stringify(item)).join('\n') + '\n' });
  }
  if (['/api/profile', '/api/reset', '/api/voice-context'].includes(url.pathname)) return route.fulfill({ json: { ok: true } });
  return route.fulfill({ status: 503, json: { error: 'This endpoint is intentionally disabled during UI QA.' } });
});

const check = async (name, fn) => {
  try { await fn(); checks.push({ name, status: 'passed' }); console.log('PASS', name); }
  catch (error) { checks.push({ name, status: 'failed', error: error.message }); console.error('FAIL', name, error.message); }
};
const capture = async (name, fullPage = true) => {
  await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, out)), fullPage, animations: 'disabled' });
  screenshots.push(`${name}.png`);
};
const captureConversation = async (name, selector) => {
  // Viewport captures preserve the real relationship of scrolling content and
  // the fixed composer. Full-page captures misplace offscreen fixed elements.
  await page.locator(selector).first().evaluate(element => window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 24, behavior: 'instant' }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await capture(name, false);
};
const noOverflow = async (label) => {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth, page: document.documentElement.scrollWidth, body: document.body.scrollWidth,
    dialogs: [...document.querySelectorAll('dialog[open]')].map(d => ({ id: d.id, width: d.clientWidth, scroll: d.scrollWidth })),
    clippedControls: [...document.querySelectorAll('button, select, textarea, input')].filter(el => el.getClientRects().length).flatMap(el => {
      const rect = el.getBoundingClientRect();
      return rect.left < -1 || rect.right > innerWidth + 1 ? [{ id: el.id || el.className, left: rect.left, right: rect.right }] : [];
    }),
  }));
  assert.ok(dimensions.page <= dimensions.viewport + 1 && dimensions.body <= dimensions.viewport + 1, `${label}: ${JSON.stringify(dimensions)}`);
  for (const dialog of dimensions.dialogs) assert.ok(dialog.scroll <= dialog.width + 1, `${label}: ${dialog.id} has horizontal overflow`);
  assert.deepEqual(dimensions.clippedControls, [], `${label}: controls should not be clipped horizontally`);
};
const targets = async (label, selectors) => {
  const sizes = await page.evaluate(selectors => selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(el => el.getClientRects().length).map(el => {
    const rect = el.getBoundingClientRect();
    return { selector, label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 60), width: Math.round(rect.width), height: Math.round(rect.height) };
  })), selectors);
  touchTargets.push({ label, targets: sizes });
  const undersized = sizes.filter(item => item.width < 44 || item.height < 44);
  assert.deepEqual(undersized, [], `${label}: important touch controls should be at least 44×44 CSS pixels`);
};
const dismissSettings = async () => { if (await page.locator('#settings').isVisible()) { await page.keyboard.press('Escape'); await page.locator('#settings').waitFor({ state: 'hidden' }); } };
const checkDialog = async (id, launcher) => {
  const name = await page.locator(`#${id}`).evaluate(dialog => (dialog.getAttribute('aria-label') || (dialog.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ')).trim());
  assert.equal(await page.evaluate(id => document.getElementById(id).contains(document.activeElement), id), true, `${id} should receive focus when opened`);
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Tab');
    // Chrome allows Tab to visit browser chrome from a native modal. While the
    // document owns focus, no background application control may receive it.
    const focus = await page.evaluate(id => ({ inDialog: document.getElementById(id).contains(document.activeElement), inDocument: document.hasFocus(), id: document.activeElement.id }), id);
    assert.ok(!focus.inDocument || focus.inDialog, `${id} should keep page focus inside: ${JSON.stringify(focus)}`);
  }
  await page.keyboard.press('Escape');
  await page.locator(`#${id}`).waitFor({ state: 'hidden' });
  assert.equal(await page.locator(launcher).evaluate(el => el === document.activeElement), true, `${id} should restore focus to its launcher`);
  assert.ok(name, `${id} should have an accessible dialog name`);
};

try {
  await page.goto(origin);
  await page.waitForFunction(() => document.querySelector('#composer')?.parentElement.id === 'home-composer-slot' && document.querySelector('#connection-dot')?.classList.contains('connected'));
  await check('self-hosted Inter font loads', async () => {
    const font = await page.evaluate(async () => {
      await document.fonts.ready;
      return { available: document.fonts.check('16px Inter'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) };
    });
    assert.equal(font.available, true, 'Inter must be available to render');
    assert.ok(font.faces.some(face => face.family.replaceAll('"', '') === 'Inter' && face.status === 'loaded'), `Expected loaded Inter font face: ${JSON.stringify(font.faces)}`);
  });
  await check('390px mobile home, empty-send state and screenshot', async () => { await noOverflow('mobile home'); assert.equal(await page.locator('#send-button').isDisabled(), true); await capture('mobile-home'); });
  await check('mobile primary touch targets', async () => targets('mobile home', ['#new-task', '#location-chip', '#context-button', '#voice-button', '#send-button', '.nav-button', '.starter']));
  await check('profile sheet screenshot and input usability', async () => {
    await page.locator('#nav-you').click();
    await page.locator('#profile-name').fill('Alex'); await page.locator('#profile-location').fill('Hongdae, Seoul'); await page.locator('#profile-preferences').fill('English. Vegetarian. Prefer afternoons.');
    await noOverflow('profile sheet'); await capture('mobile-profile', false);
    const fontSizes = await page.locator('#profile-name, #profile-location, #profile-preferences').evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)));
    assert.ok(fontSizes.every(size => size >= 16), 'Mobile form inputs should avoid iOS focus zoom');
    const sheet = await page.locator('#settings').boundingBox();
    assert.ok(Math.abs(sheet.x) <= 1 && Math.abs(sheet.width - 390) <= 1, 'Mobile bottom sheet should span the viewport without a side gap');
  });
  await check('settings tabs expose selection and follow keyboard navigation', async () => {
    assert.equal(await page.locator('.sheet-tabs').getAttribute('role'), 'tablist');
    const activeTab = async (id, inactiveId, panelId) => {
      const tab = page.locator(`#${id}`), other = page.locator(`#${inactiveId}`), panel = page.locator(`#${panelId}`);
      assert.equal(await tab.getAttribute('role'), 'tab'); assert.equal(await tab.getAttribute('aria-selected'), 'true');
      assert.equal(await tab.getAttribute('aria-controls'), panelId); assert.equal(await tab.evaluate(el => el.tabIndex), 0);
      assert.equal(await other.getAttribute('aria-selected'), 'false'); assert.equal(await other.evaluate(el => el.tabIndex), -1);
      assert.equal(await panel.getAttribute('role'), 'tabpanel'); assert.equal(await panel.getAttribute('aria-labelledby'), id); assert.equal(await panel.isVisible(), true);
      assert.equal(await tab.evaluate(el => el === document.activeElement), true, `${id} should be focused after keyboard selection`);
    };
    await page.locator('#profile-tab').focus(); await page.keyboard.press('ArrowRight'); await activeTab('connection-tab', 'profile-tab', 'connection-panel');
    await page.keyboard.press('ArrowLeft'); await activeTab('profile-tab', 'connection-tab', 'profile-form');
    await page.keyboard.press('End'); await activeTab('connection-tab', 'profile-tab', 'connection-panel');
    await page.keyboard.press('Home'); await activeTab('profile-tab', 'connection-tab', 'profile-form');
  });
  await check('profile sheet keyboard focus and dismissal', async () => checkDialog('settings', '#nav-you'));
  await dismissSettings();
  await page.locator('#nav-you').click();
  await page.locator('#profile-name').fill('Alex'); await page.locator('#profile-location').fill('Hongdae, Seoul'); await page.locator('#profile-preferences').fill('English. Vegetarian. Prefer afternoons.');
  await page.locator('#profile-form button[type=submit]').click(); await page.locator('#settings').waitFor({ state: 'hidden' });
  await page.locator('#toast').waitFor({ state: 'hidden' });
  await check('320px, 390px and desktop in English, Russian and Korean', async () => {
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      for (const language of ['en', 'ru', 'ko']) {
        await page.locator('#language').selectOption(language); await noOverflow(`${width}px ${language} home`);
        assert.equal(await page.locator('html').getAttribute('lang'), language);
        if (width === 320) await capture(`small-home-${language}`);
        await page.locator('#nav-you').click(); await noOverflow(`${width}px ${language} profile`);
        if (width === 320) await capture(`small-profile-${language}`, false);
        await dismissSettings();
      }
    }
    await page.locator('#language').selectOption('en'); await capture('desktop-home');
  });
  await check('desktop profile screenshot', async () => { await page.locator('#nav-you').click(); await capture('desktop-profile', false); await dismissSettings(); });
  await page.setViewportSize({ width: 390, height: 844 });
  await check('empty activity screenshot and navigation', async () => { await page.locator('#nav-activity').click(); await page.locator('#activity-view').waitFor(); await noOverflow('empty activity'); await capture('mobile-empty-activity'); await page.locator('#nav-home').click(); });
  await check('clarification preserves profile context', async () => {
    await page.locator('#request').fill('Find an English-speaking clinic near me for tomorrow afternoon.'); await page.locator('#send-button').click();
    await page.locator('.question').waitFor(); await noOverflow('clarification'); await capture('mobile-clarification', false);
    const request = apiRequests.find(item => item.path === '/api/chat'); assert.equal(request.body.profile.location, 'Hongdae, Seoul');
    await targets('clarification', ['.choice', '#voice-button', '#send-button']);
  });
  nextResult = result;
  await check('research results, summary and suggestions', async () => {
    await page.getByRole('button', { name: 'Yes, Hongdae', exact: true }).click(); await page.locator('.summary-card').waitFor();
    await noOverflow('conversation'); assert.equal(await page.locator('.place').count(), 2); assert.ok(await page.locator('.suggestion').count() >= 2);
    await captureConversation('mobile-research', '.places');
    await captureConversation('mobile-conversation', '.summary-card');
    await page.setViewportSize({ width: 1440, height: 1000 }); await captureConversation('desktop-conversation', '.action-card');
    await page.setViewportSize({ width: 390, height: 844 });
    await targets('conversation', ['.action-card button', '.suggestion']);
  });
  await check('call review screenshot without initiating any call', async () => {
    await page.locator('.action-card button').click(); await page.locator('#call-sheet').waitFor(); await noOverflow('call review'); await capture('mobile-call-review', false);
    assert.match(await page.locator('#call-review').textContent(), /Hongdae International Clinic/); await targets('call review', ['#approve-call', '[data-close="call-sheet"]']);
  });
  await check('call review keyboard focus and dismissal', async () => checkDialog('call-sheet', '.action-card button'));
  if (await page.locator('#call-sheet').isVisible()) await page.keyboard.press('Escape');
  await check('conversation at 320px with long Russian controls', async () => { await page.setViewportSize({ width: 320, height: 844 }); await page.locator('#language').selectOption('ru'); await noOverflow('Russian conversation'); await captureConversation('small-conversation-ru', '.summary-card'); });
  await check('short viewport keeps composer and navigation apart', async () => {
    await page.setViewportSize({ width: 390, height: 480 }); await page.locator('#language').selectOption('en'); await noOverflow('short conversation');
    const composer = await page.locator('#composer').boundingBox(), nav = await page.locator('.bottom-nav').boundingBox();
    assert.ok(composer.y >= 0 && composer.y + composer.height <= nav.y + 1, 'Composer should fit above navigation in short viewports');
    await capture('mobile-short-viewport', false);
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await check('populated activity screen and return to conversation', async () => {
    await page.locator('#nav-activity').click(); await page.locator('.activity-item').first().waitFor(); await noOverflow('activity'); await capture('mobile-activity');
    await page.locator('.activity-item').first().click(); await page.locator('#conversation-view').waitFor({ state: 'visible' });
  });
  await check('incoming response preserves reading position and Latest message restores follow', async () => {
    nextResult = { ...clarification, message: 'Your prepared request is ready. This is a delayed synthetic UI response.', question: null, choices: [] };
    const held = new Promise(resolve => { onChatHeld = resolve; });
    await page.locator('#request').fill('Prepare that request for me.'); await page.locator('#send-button').click(); await held;
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(() => window.scrollY === 0);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const position = await page.evaluate(() => window.scrollY);
    releaseChat(); releaseChat = null;
    await page.waitForFunction(() => document.querySelector('#messages').textContent.includes('delayed synthetic UI response'));
    await page.locator('#progress').waitFor({ state: 'hidden' });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - position) <= 2, 'New content must not move someone who is reading older messages');
    await page.locator('#latest-message').waitFor({ state: 'visible' }); await capture('mobile-reading-position', false);
    await page.locator('#latest-message').click();
    await page.waitForFunction(() => window.scrollY + innerHeight >= document.documentElement.scrollHeight - 180);
    assert.equal(await page.locator('#latest-message').isVisible(), false);
  });
  await check('reduced motion disables decorative animation', async () => {
    const animations = await page.locator('.message, .home, .bottom-nav').evaluateAll(nodes => nodes.filter(el => el.getClientRects().length).map(el => ({ animation: getComputedStyle(el).animationDuration, transition: getComputedStyle(el).transitionDuration })));
    assert.ok(animations.every(item => [...item.animation.split(','), ...item.transition.split(',')].every(value => parseFloat(value) <= 0.01)), 'Reduced-motion preference should disable long motion');
  });
  await check('no page errors and no paid or calling API requests', async () => { assert.deepEqual(errors, []); assert.equal(apiRequests.some(request => ['/api/realtime', '/api/calls', '/api/connect'].includes(request.path)), false); });
} catch (error) {
  checks.push({ name: 'QA flow', status: 'failed', error: error.stack }); console.error(error);
} finally {
  releaseChat?.();
  const report = { checkedAt: new Date().toISOString(), origin, viewport: '320–1440px; mobile 390×844; short viewport 390×480', checks, errors, screenshots, touchTargets, syntheticProviderResponses: true, liveOpenAI: false, realAudio: false, realCalls: false };
  await writeFile(new URL('results.json', out), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(`${checks.filter(item => item.status === 'passed').length}/${checks.length} UI checks passed. Report: ${fileURLToPath(new URL('results.json', out))}`);
  if (checks.some(item => item.status === 'failed')) process.exitCode = 1;
}
