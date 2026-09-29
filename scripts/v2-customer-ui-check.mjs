import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { translations } from '../public/v2/i18n.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'artifacts/v2');
const require = createRequire(import.meta.url);
const report = { title: 'V2 customer UI checks with synthetic API routes', timestamp: new Date().toISOString(), mock: true, simulation: true,
  method: 'Isolated browser. All API responses are synthetic fixtures. External requests are blocked. No OpenAI request, microphone capture or audio playback.',
  realApiVerified: false, realMicrophoneVerified: false, audibleKoreanVerified: false, valueHypothesis: 'Unverified', checks: [], screenshots: [], errors: [] };
await fs.mkdir(output, { recursive: true });
let playwright;
for (const candidate of [process.env.PLAYWRIGHT_MODULE, 'playwright', path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)) {
  try { const value = await import(pathToFileURL(require.resolve(candidate)).href); playwright = value.chromium ? value : value.default; break; } catch {}
}
if (!playwright?.chromium) throw new Error('Use an existing Playwright installation through PLAYWRIGHT_MODULE. No package is installed by this check.');
const browser = await playwright.chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
let configured = false, failure = false, current = null, createdLanguage = null, revision = 0, quota = false;
const pageErrors = [];
async function check(name, run) { await run(); report.checks.push({ name, status: 'passed', mock: true }); }
async function screenshot(page, name) { const filename = `customer-ui-${name}.png`; await page.screenshot({ path: path.join(output, filename), fullPage: true, animations: 'disabled' }); report.screenshots.push(filename); }
await context.route('**/*', async route => {
  const request = route.request(); const url = new URL(request.url());
  if (url.hostname !== 'localhost') return route.abort();
  const json = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  if (url.pathname === '/api/config') return json({ configured, publicBaseUrl: null });
  if (url.pathname === '/api/rooms' && request.method() === 'POST') {
    createdLanguage = request.postDataJSON().language;
    current = { id: 'test-room', language: createdLanguage, version: ++revision, messages: [], customerInfo: [], institutions: [], requiredQuestions: [], planReady: false, call: { status: 'idle', connected: false }, busy: false };
    return json({ id: current.id, customerToken: 'synthetic-customer-token', businessToken: 'synthetic-business-token', state: current });
  }
  if (url.pathname.startsWith('/api/rooms/test-room')) {
    assert.equal(request.headers().authorization, 'Bearer synthetic-customer-token');
    if (failure) return route.abort();
    if (url.pathname.endsWith('/chat')) {
      if (quota) return route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: { code: 'API_QUOTA', message: 'Do not display this untranslated provider message.' } }) });
      const text = request.postDataJSON().message; current.version = ++revision; current.messages.push({ id: String(revision), role: 'user', text });
      current.messages.push({ id: `a${revision}`, role: 'assistant', text: 'Синтетический вопрос для проверки интерфейса.' });
      current.planReady = true; current.institutions = [{ id: 'fictional', name: 'Вымышленная клиника', reason: 'Синтетические данные теста' }];
      current.requiredQuestions = [{ id: 'q1', text: 'Есть ли запись сегодня?', status: 'unresolved' }];
      current.customerInfo = [{ key: 'private_prior_visit_status', value: 'Синтетическое значение' }];
    }
    if (url.pathname.endsWith('/authorize')) { assert.equal(request.postDataJSON().institutionId, 'fictional'); current.version = ++revision; current.call = { status: 'pending', connected: false }; }
    return json(current);
  }
  if (url.pathname.startsWith('/v2')) {
    const file = url.pathname === '/v2/' ? 'index.html' : url.pathname.split('/').at(-1);
    const bytes = await fs.readFile(path.join(root, 'public/v2', file));
    return route.fulfill({ body: bytes, contentType: file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html' });
  }
  return route.fulfill({ status: 404, body: 'not found' });
});
try {
  await check('translation-key-parity', () => { const keys = Object.keys(translations.en).sort(); for (const lang of ['ru', 'zh']) assert.deepEqual(Object.keys(translations[lang]).sort(), keys); });
  const page = await context.newPage(); page.on('pageerror', error => pageErrors.push(error.message)); await page.goto('http://localhost:4199/v2/');
  await check('English-is-default', async () => assert.equal(await page.locator('html').getAttribute('lang'), 'en')); await screenshot(page, 'en');
  await check('Russian-selection', async () => { await page.getByRole('button', { name: 'Русский', exact: true }).click(); assert.equal(await page.locator('html').getAttribute('lang'), 'ru'); });
  await check('Russian-empty-input-guidance', async () => { await page.locator('#send').click(); assert.match(await page.locator('#error').innerText(), /Введите сообщение/); });
  await check('missing-configuration-safe-stop', async () => { await page.locator('#starter').click(); await page.locator('#send').click(); assert.match(await page.locator('#error').innerText(), /не настроен/); assert.equal(current, null); });
  configured = true; await page.getByRole('button', { name: 'Проверить снова', exact: true }).click(); await page.locator('#send').click(); await page.getByRole('button', { name: 'Да', exact: true }).waitFor();
  await check('selected-language-room-creation', () => assert.equal(createdLanguage, 'ru'));
  await check('server-content-displayed', async () => assert.match(await page.locator('#messages').innerText(), /Синтетический вопрос/));
  await check('no-internal-customer-key-in-UI', async () => assert.doesNotMatch(await page.locator('#context').innerText(), /private_prior_visit_status/));
  await check('business-tab-before-authorization-with-fragment-token', async () => { const link = await page.getByRole('link', { name: 'Открыть вкладку организации', exact: true }).getAttribute('href'); assert.equal(link, 'http://localhost:4199/business?room=test-room#token=synthetic-business-token'); assert.equal(current.call.status, 'idle'); });
  await check('explicit-authorization-pending-not-green', async () => { await page.getByRole('button', { name: 'Да', exact: true }).click(); await page.waitForTimeout(100); assert.equal(current.call.status, 'pending'); assert.equal(await page.locator('#call-state.is-active').count(), 0); });
  current.call = { status: 'active', connected: false }; current.version = ++revision; await page.waitForTimeout(1200);
  await check('unconnected-active-not-green', async () => assert.equal(await page.locator('#call-state.is-active').count(), 0));
  current.call = { status: 'active', connected: true }; current.version = ++revision; await page.waitForTimeout(1200);
  await check('connected-active-is-green', async () => assert.equal(await page.locator('#call-state.is-active').count(), 1));
  current.call = { status: 'waiting_customer', connected: true }; current.pendingRelay = { question: 'Это ваш первый визит?' }; current.version = ++revision; await page.waitForTimeout(1200);
  await check('unknown-detail-relay-in-Russian', async () => assert.match(await page.locator('.relay').innerText(), /Это ваш первый визит/));
  await page.setViewportSize({ width: 390, height: 844 });
  await check('390px-layout-without-horizontal-overflow', async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)); await screenshot(page, 'ru');
  failure = true; await page.waitForTimeout(1200);
  await check('poll-failure-removes-green', async () => { assert.equal(await page.locator('#call-state.is-active').count(), 0); assert.match(await page.locator('#call-state').innerText(), /Соединение потеряно/); });
  failure = false; current.call = { status: 'completed', connected: false }; current.pendingRelay = null; current.summary = { text: 'Синтетический итог', recommendation: 'Синтетическая рекомендация', reasoning: 'Синтетическое объяснение' }; current.version = ++revision; await page.waitForTimeout(1200);
  await check('incomplete-completion-stays-unresolved', async () => { assert.match(await page.locator('#call-state').innerText(), /нельзя считать полностью завершённым/); assert.equal(await page.locator('#call-state.is-active').count(), 0); });
  await check('summary-recommendation-reasoning', async () => { const content = await page.locator('#context').innerText(); for (const value of Object.values(current.summary)) assert.ok(content.includes(value)); });
  quota = true; await page.locator('#message-input').fill('Синтетическая проверка ошибки'); await page.locator('#send').click(); await page.waitForTimeout(200);
  await check('API-credit-error-localized-without-provider-message', async () => { const content = await page.locator('#error').innerText(); assert.match(content, /доступных средств/); assert.doesNotMatch(content, /untranslated provider/); });
  const chinese = await context.newPage(); chinese.on('pageerror', error => pageErrors.push(error.message)); await chinese.goto('http://localhost:4199/v2/'); await chinese.getByRole('button', { name: '中文', exact: true }).click();
  await check('Chinese-selection-and-empty-input', async () => { assert.equal(await chinese.locator('html').getAttribute('lang'), 'zh'); await chinese.locator('#send').click(); assert.match(await chinese.locator('#error').innerText(), /请先输入消息/); }); await screenshot(chinese, 'zh');
  await check('no-page-JavaScript-errors', () => assert.deepEqual(pageErrors, []));
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.errors.push(error.message); process.exitCode = 1; }
finally { await browser.close(); await fs.writeFile(path.join(output, 'customer-ui-check.json'), JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify({ status: report.status, mock: true, passed: report.checks.length, report: 'artifacts/v2/customer-ui-check.json', errors: report.errors }));
