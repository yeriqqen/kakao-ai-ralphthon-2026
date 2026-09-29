import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { installSyntheticSpeech, RUSSIAN_REQUEST, EXPECTED_SUMMARY, RECEPTIONIST_FIXTURE } from '../tests/browser-fixtures.mjs';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'artifacts');
const baseURL = process.env.DEMO_URL || 'http://localhost:4173';
const report = {
  title: 'YOKOBU isolated browser logic and layout checks',
  timestamp: new Date().toISOString(), baseURL,
  simulation: true,
  method: 'Typed fictional input and controlled synthetic recognition success/error events with synthetic speech output in an isolated browser profile. No hardware audio capture or playback.',
  realMicrophoneVerified: false, audibleKoreanVerified: false, twoPhonesVerified: false,
  checks: [], screenshots: [], errors: [],
};
await mkdir(output, { recursive: true });

async function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, 'playwright', path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const loaded = await import(pathToFileURL(require.resolve(candidate)).href);
      const playwright = loaded.chromium ? loaded : loaded.default;
      if (playwright?.chromium) return playwright;
    } catch {}
  }
  throw new Error('Existing Playwright not found. Set PLAYWRIGHT_MODULE to an installed package path. This script does not install packages.');
}

async function executablePath() {
  if (process.env.CHROME_EXECUTABLE) return process.env.CHROME_EXECUTABLE;
  const installed = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  try { await access(installed, constants.X_OK); return installed; } catch { return undefined; }
}

async function snapshot(page) {
  return page.evaluate(() => {
    const text = id => document.getElementById(id)?.textContent?.trim() || '';
    return {
      visibleStages: [...document.querySelectorAll('.stage')].filter(element => !element.hidden).map(element => element.id),
      requestError: text('request-error'), detailsError: text('details-error'),
      koreanPrompt: text('korean-prompt'), micStatus: text('mic-status'),
      speechStatus: text('speech-status'), relayQuestion: text('relay-question'),
      summary: text('summary'), facts: text('fact-list'),
      unresolvedRelay: text('unresolved-relay'),
      factValues: [...document.querySelectorAll('#fact-list .fact-value')].map(element => element.textContent),
      conversation: text('conversation'),
      receptionSheet: text('reception-sheet'), doctorSheet: text('doctor-sheet'),
      verificationNote: text('verification-note'),
      syntheticSpeech: window.__browserTestEvidence,
    };
  });
}

async function screenshot(page, name) {
  const filename = `browser-${name}.png`;
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: path.join(output, filename), fullPage: true, animations: 'disabled' });
  report.screenshots.push(filename);
}

async function begin(page) {
  await page.goto(baseURL);
  await page.locator('#request').fill(RUSSIAN_REQUEST);
  await page.locator('#request-form button[type="submit"]').click();
  await page.locator('#details-stage').waitFor({ state: 'visible' });
  await page.locator('#age').fill('7');
  await page.locator('#insurance').selectOption('none');
  await page.locator('#symptoms').selectOption('кашель');
  await page.locator('#duration').fill('2');
  await page.locator('#details-form button[type="submit"]').click();
  await page.locator('#plan-stage').waitFor({ state: 'visible' });
  assert.ok((await page.locator('#call-plan').textContent()).trim(), 'Korean call plan must appear before start');
  assert.equal(await page.locator('#call-stage').isVisible(), false, 'Call must not start without user action');
  await page.locator('#start-simulation').click();
  await page.locator('#call-stage').waitFor({ state: 'visible' });
}

async function receptionist(page, text) {
  await page.locator('#receptionist-text').fill(text);
  await page.locator('#send-receptionist').click();
}

async function finish(page) {
  if (!(await page.locator('#result-stage').isVisible())) await page.locator('#finish-simulation').click();
  await page.locator('#result-stage').waitFor({ state: 'visible' });
}

async function noOverflow(page) {
  const measurement = await page.evaluate(() => ({
    viewport: innerWidth, width: document.documentElement.scrollWidth,
    overflowing: [...document.querySelectorAll('body *')].filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.right > innerWidth + 1;
    }).slice(0, 8).map(element => ({ tag: element.tagName, id: element.id, className: String(element.className) })),
  }));
  assert.ok(measurement.width <= measurement.viewport + 1, `Horizontal overflow: ${JSON.stringify(measurement)}`);
  return measurement;
}

let browser;
try {
  const { chromium } = await loadPlaywright();
  browser = await chromium.launch({ headless: true, executablePath: await executablePath() });
  report.browser = browser.version();
  async function check(name, work, { mobile = false, denied = false, controlledRecognition = false, deferPermission = false } = {}) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(installSyntheticSpeech, { denied, controlledRecognition, deferPermission });
    const networkBlocked = [];
    await context.route('**/*', route => {
      const url = route.request().url();
      if (new URL(url).origin === new URL(baseURL).origin) {
        if (new URL(url).pathname === '/api/evidence' && route.request().method() === 'POST') {
          const payload = route.request().postDataJSON();
          payload.syntheticBrowserTest = true;
          payload.testProvenance = { synthetic: true, realMicrophoneVerified: false, audibleKoreanVerified: false, note: 'Browser harness with synthetic audio APIs; never use as hardware microphone evidence.' };
          payload.evidenceWarning = 'SYNTHETIC BROWSER TEST — no actual microphone or audible speech. ' + payload.evidenceWarning;
          if (payload.audioEvidence) payload.audioEvidence.note = payload.testProvenance.note;
          return route.continue({ postData: JSON.stringify(payload) });
        }
        return route.continue();
      }
      networkBlocked.push(url); return route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const entry = { name, status: 'running', speech: 'SYNTHETIC — not actual microphone or audible speech', networkBlocked };
    report.checks.push(entry);
    try {
      entry.details = await work(page);
      assert.deepEqual(pageErrors, [], 'No uncaught browser JavaScript errors');
      entry.status = 'passed';
    } catch (error) {
      entry.status = 'failed'; entry.error = error.stack || String(error);
      await screenshot(page, `${name}-failure`).catch(() => {});
    } finally {
      entry.actual = await snapshot(page).catch(error => ({ snapshotError: error.message }));
      entry.pageErrors = pageErrors;
      await context.close();
    }
    console.log(`${entry.status.toUpperCase()}: ${name}`);
  }

  await check('empty-request', async page => {
    await page.goto(baseURL);
    await page.locator('#request-form button[type="submit"]').click();
    assert.equal(await page.locator('#request-stage').isVisible(), true);
    assert.ok((await page.locator('#request-error').textContent()).trim(), 'Empty request needs useful guidance');
    assert.equal(await page.locator('#result-stage').isVisible(), false);
    assert.equal((await page.locator('#summary').textContent()).trim(), '');
    await screenshot(page, 'desktop-request');
    return { expected: 'Stay at request with guidance; no fabricated result' };
  });

  await check('fixture-relay-summary-sheets', async page => {
    await begin(page);
    assert.equal(await page.getByText('Simulated call', { exact: true }).count() >= 3, true);
    await receptionist(page, RECEPTIONIST_FIXTURE[0]);
    await receptionist(page, '아이는 몇 살인가요?');
    assert.equal(await page.locator('#relay-box').isVisible(), false, 'Previously collected age must not be asked again');
    assert.match(await page.locator('#korean-prompt').textContent(), /7세/);
    await receptionist(page, '처음 방문하시나요?');
    await page.locator('#relay-box').waitFor({ state: 'visible' });
    assert.equal((await page.locator('#relay-question').textContent()).trim(), 'Вы впервые в этой клинике?');
    assert.equal(await page.locator('#result-stage').isVisible(), false);
    assert.ok(!(await page.locator('#conversation').textContent()).includes('네, 처음 방문입니다.'), 'First visit must not be fabricated before user answer');
    await page.locator('#relay-form button[type="submit"]').click();
    assert.equal(await page.locator('#relay-box').isVisible(), true, 'Empty user answer must remain paused');
    assert.ok((await page.locator('#relay-error').textContent()).trim(), 'Missing answer needs guidance');
    await screenshot(page, 'desktop-live-relay');
    await page.locator('#relay-answer').fill('Да.');
    await page.locator('#relay-form button[type="submit"]').click();
    await page.locator('#relay-box').waitFor({ state: 'hidden' });
    assert.ok((await page.locator('#conversation').textContent()).includes('네, 처음 방문입니다.'), 'Russian reply must relay in Korean');
    for (const sentence of RECEPTIONIST_FIXTURE.slice(1)) await receptionist(page, sentence);
    await finish(page);
    const actual = await snapshot(page);
    assert.equal(actual.summary, EXPECTED_SUMMARY);
    assert.ok(!actual.facts.includes('Unclear'), 'All six scripted clinic facts should be supported');
    assert.ok(!actual.factValues.some(value => ['true', 'false', '[object Object]'].includes(value)), 'Fact cards must show readable values');
    assert.equal(await page.locator('#fact-list .fact-status').filter({ hasText: 'Confirmed in simulation' }).count(), 6);
    assert.match(actual.receptionSheet, /나이:\s*7세/);
    assert.match(actual.receptionSheet, /건강보험:\s*국민건강보험 없음/);
    assert.match(actual.doctorSheet, /증상:\s*기침/);
    assert.match(actual.doctorSheet, /증상 기간:\s*2일/);
    assert.equal(await page.getByText('데모용 가상 정보 — 실제 환자 정보 아님.', { exact: true }).count(), 2);
    assert.ok(actual.syntheticSpeech.spokenTexts.some(text => text.includes('네, 처음 방문입니다.')), 'Synthetic TTS adapter receives Korean relay');
    await screenshot(page, 'desktop-results');
    return { expectedSummary: EXPECTED_SUMMARY, actualSummary: actual.summary, input: 'Typed fictional text; synthesis callbacks mocked' };
  });

  await check('ambiguous-input-no-fabrication', async page => {
    await begin(page);
    await receptionist(page, '잘 모르겠어요. 확인이 필요합니다.');
    await finish(page);
    assert.equal(await page.locator('#fact-list .fact-status').filter({ hasText: 'Confirmed in simulation' }).count(), 0);
    assert.equal(await page.locator('#fact-list .fact-status').filter({ hasText: 'Unclear' }).count(), 6);
    const summary = await page.locator('#summary').textContent();
    assert.ok(!summary.includes('20 000') && !summary.includes('15 минут'), 'No default fee or wait should appear');
    return { expected: 'All clinic facts Unclear; no fixture defaults' };
  });

  await check('changed-wait', async page => {
    await begin(page);
    await receptionist(page, '대기 시간은 45분입니다.');
    await finish(page);
    const summary = await page.locator('#summary').textContent();
    assert.match(summary, /45/);
    assert.ok(!summary.includes('15 минут'), 'Changed answer must replace scripted wait');
    return { expected: 'Actual 45-minute wait, other facts unresolved', actualSummary: summary };
  });

  await check('synthetic-microphone-denied', async page => {
    await begin(page);
    await page.locator('#microphone').click();
    await page.waitForFunction(() => {
      const text = document.querySelector('#mic-status').textContent;
      return /거부|denied|отказ/i.test(text);
    });
    await finish(page);
    assert.equal(await page.locator('#fact-list .fact-status').filter({ hasText: 'Confirmed in simulation' }).count(), 0);
    return { expected: 'Visible permission guidance, no fabricated facts', actualDeniedMechanism: 'Synthetic recognition not-allowed / getUserMedia NotAllowedError; no OS/browser permissions changed' };
  }, { denied: true });

  await check('synthetic-recognition-success-and-save', async page => {
    await begin(page);
    async function recognized(text, { interim = false, edited = false } = {}) {
      await page.locator('#microphone').click();
      await page.waitForFunction(() => document.querySelector('#microphone').classList.contains('listening'));
      if (interim || edited) {
        await page.evaluate(text => window.__syntheticSpeechControl.emitResult(text, { final: false }), text);
        const before = await page.locator('#conversation .receptionist').count();
        await page.locator('#send-receptionist').click();
        assert.equal(await page.locator('#conversation .receptionist').count(), before, 'Unedited interim result must not be submitted');
        assert.match(await page.locator('#mic-status').textContent(), /확정|수정/);
      }
      if (edited) {
        await page.locator('#receptionist-text').fill(text);
        assert.match(await page.locator('#input-provenance').textContent(), /수정/);
        await page.evaluate(() => window.__syntheticSpeechControl.emitResult('이전 인식이 수정한 내용을 덮어쓰면 안 됩니다.', { late: true }));
        assert.equal(await page.locator('#receptionist-text').inputValue(), text, 'Manual corrections must survive late speech events');
        assert.ok(await page.evaluate(() => window.__browserTestEvidence.tracks.every(track => track.readyState === 'ended')), 'Manual editing must stop microphone capture');
      } else {
        await page.evaluate(text => window.__syntheticSpeechControl.emitResult(text), text);
        assert.equal(await page.locator('#receptionist-text').inputValue(), text);
        await page.evaluate(() => window.__syntheticSpeechControl.end());
        await page.waitForFunction(() => !document.querySelector('#microphone').classList.contains('listening'));
      }
      await page.locator('#send-receptionist').click();
      assert.equal(await page.locator('#receptionist-text').inputValue(), '');
      assert.ok(await page.evaluate(() => window.__browserTestEvidence.tracks.every(track => track.readyState === 'ended')), 'All synthetic stream tracks must be stopped after submit/end');
    }
    await recognized(RECEPTIONIST_FIXTURE[0], { interim: true });
    await recognized(RECEPTIONIST_FIXTURE[1], { edited: true });
    await recognized(RECEPTIONIST_FIXTURE[2]);
    await recognized('처음 방문하시나요?');
    await page.locator('#relay-box').waitFor({ state: 'visible' });
    await page.locator('#relay-answer').fill('Да.');
    await page.locator('#relay-form button[type="submit"]').click();
    for (const text of RECEPTIONIST_FIXTURE.slice(3)) await recognized(text);
    await finish(page);
    assert.equal((await page.locator('#summary').textContent()).trim(), EXPECTED_SUMMARY);
    assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname), 'Save test only writes to a loopback server');
    const [download, response] = await Promise.all([
      page.waitForEvent('download'),
      page.waitForResponse(response => new URL(response.url()).pathname === '/api/evidence' && response.request().method() === 'POST'),
      page.locator('#download-report').click(),
    ]);
    assert.equal(download.suggestedFilename(), 'yokobu-simulated-result.json');
    const chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    const originalDownload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.equal(originalDownload.simulation, true);
    assert.equal(originalDownload.summary, EXPECTED_SUMMARY);
    assert.equal(originalDownload.transcript.filter(entry => entry.source === 'microphone').length, 6);
    assert.equal(originalDownload.transcript.filter(entry => entry.source === 'microphone-edited').length, 1);
    assert.equal(originalDownload.audioEvidence.userConfirmedAudible, false);
    assert.ok(originalDownload.audioEvidence.recognitionResults.length >= 6);
    await writeFile(path.join(output, 'browser-synthetic-download.json'), JSON.stringify({
      syntheticBrowserTest: true, realMicrophoneVerified: false, audibleKoreanVerified: false,
      note: 'The original app download below was generated through synthetic recognition callbacks. Its microphone source entries are not real hardware observations.',
      originalDownload,
    }, null, 2) + '\n');
    assert.equal(response.status(), 200, 'Local evidence endpoint must save the result');
    const saved = await response.json();
    assert.match(saved.path, /^artifacts\/local-runs\/simulation-[^/]+\.json$/);
    const savedEvidence = JSON.parse(await readFile(path.join(root, saved.path), 'utf8'));
    assert.equal(savedEvidence.testProvenance.synthetic, true);
    assert.equal(savedEvidence.syntheticBrowserTest, true);
    assert.equal(savedEvidence.summary, EXPECTED_SUMMARY);
    await page.waitForFunction(() => document.querySelector('#global-status').textContent.includes('сохранён локально'));
    return {
      expected: 'Synthetic final recognition callbacks produce fixture results; unedited interim input is blocked; corrections are labeled; tracks release; download and local save contain valid JSON',
      downloadWrapper: 'artifacts/browser-synthetic-download.json', localSavedEvidence: saved.path,
      provenance: 'Synthetic transport marker was added by test request interception before POST; app facts and transcript were unchanged.',
    };
  }, { controlledRecognition: true });

  await check('synthetic-stale-events-and-draft-reset', async page => {
    await begin(page);
    await page.locator('#microphone').click();
    await page.waitForFunction(() => window.__browserTestEvidence.recognitionStarts === 1);
    await page.evaluate(text => window.__syntheticSpeechControl.emitResult(text), RECEPTIONIST_FIXTURE[0]);
    await page.evaluate(() => window.__syntheticSpeechControl.end());
    await page.waitForFunction(() => !document.querySelector('#microphone').classList.contains('listening'));
    assert.equal(await page.locator('#receptionist-text').inputValue(), RECEPTIONIST_FIXTURE[0]);
    await page.locator('#microphone').click();
    await page.waitForFunction(() => window.__browserTestEvidence.recognitionStarts === 2);
    assert.equal(await page.locator('#receptionist-text').inputValue(), '', 'New recognition must clear old draft');
    await page.evaluate(() => window.__syntheticSpeechControl.emitResult('대기 시간은 999분입니다.', { index: 0, late: true }));
    assert.equal(await page.locator('#receptionist-text').inputValue(), '', 'Late old result must not overwrite new draft');
    await page.evaluate(() => window.__syntheticSpeechControl.emitError('network', 0));
    assert.ok(await page.locator('#microphone').evaluate(element => element.classList.contains('listening')), 'Old error must not stop current listening');
    await page.evaluate(() => window.__syntheticSpeechControl.emitError('no-speech', 1));
    await page.waitForFunction(() => !document.querySelector('#microphone').classList.contains('listening'));
    assert.equal(await page.locator('#receptionist-text').inputValue(), '', 'No-speech must not reuse previous answer');
    assert.ok(await page.evaluate(() => window.__browserTestEvidence.tracks.every(track => track.readyState === 'ended')));
    await finish(page);
    assert.equal(await page.locator('#fact-list .fact-status').filter({ hasText: 'Confirmed in simulation' }).count(), 0);
    return { expected: 'Old result/error ignored; new draft starts empty; no-speech releases tracks and fabricates no answer' };
  }, { controlledRecognition: true });

  await check('synthetic-permission-cancel-race', async page => {
    await begin(page);
    await page.locator('#microphone').click();
    await page.locator('#microphone').click();
    assert.equal(await page.evaluate(() => window.__browserTestEvidence.getUserMediaCalls), 1, 'Second click while pending must cancel, not acquire again');
    await page.evaluate(() => window.__syntheticSpeechControl.allowPending());
    await page.waitForFunction(() => window.__browserTestEvidence.tracks.length === 1);
    assert.equal(await page.evaluate(() => window.__browserTestEvidence.recognitionStarts), 0, 'Canceled permission resolution must not start recognition');
    assert.ok(await page.evaluate(() => window.__browserTestEvidence.tracks.every(track => track.readyState === 'ended')));
    await finish(page);
    return { expected: 'One permission request, no recognition after cancel, eventual synthetic stream released' };
  }, { controlledRecognition: true, deferPermission: true });

  await check('synthetic-finish-during-permission', async page => {
    await begin(page);
    await page.locator('#microphone').click();
    await finish(page);
    await page.evaluate(() => window.__syntheticSpeechControl.allowPending());
    await page.waitForFunction(() => window.__browserTestEvidence.tracks.length === 1);
    assert.equal(await page.evaluate(() => window.__browserTestEvidence.recognitionStarts), 0, 'Finishing during permission wait must not start hidden capture');
    assert.ok(await page.evaluate(() => window.__browserTestEvidence.tracks.every(track => track.readyState === 'ended')));
    assert.equal(await page.locator('#fact-list .fact-status').filter({ hasText: 'Confirmed in simulation' }).count(), 0);
    return { expected: 'Result remains Unclear; late permission resolution releases stream without hidden recognition' };
  }, { controlledRecognition: true, deferPermission: true });

  await check('unanswered-relay-remains-unclear', async page => {
    await begin(page);
    await receptionist(page, '처음 방문하시나요?');
    await page.locator('#relay-box').waitFor({ state: 'visible' });
    await finish(page);
    assert.equal(await page.locator('#unresolved-relay').isVisible(), true);
    const unresolved = await page.locator('#unresolved-relay').textContent();
    assert.match(unresolved, /Unclear/);
    assert.ok(unresolved.includes('Вы впервые в этой клинике?'));
    assert.ok(!(await page.locator('#conversation').textContent()).includes('네, 처음 방문입니다.'), 'Missing user answer must not turn into a positive relay');
    return { expected: 'Unanswered first-visit question remains visibly Unclear in the result', actual: unresolved };
  });

  await check('mobile-layout-390px', async page => {
    await page.goto(baseURL);
    const request = await noOverflow(page);
    await screenshot(page, 'mobile-request');
    await begin(page);
    const call = await noOverflow(page);
    await receptionist(page, '처음 방문하시나요?');
    await page.locator('#relay-box').waitFor({ state: 'visible' });
    const relay = await noOverflow(page);
    await screenshot(page, 'mobile-live-relay');
    await page.locator('#relay-answer').fill('Да.');
    await page.locator('#relay-form button[type="submit"]').click();
    for (const sentence of RECEPTIONIST_FIXTURE) await receptionist(page, sentence);
    await finish(page);
    const result = await noOverflow(page);
    await screenshot(page, 'mobile-results');
    return { request, call, relay, result };
  }, { mobile: true });
} catch (error) {
  report.errors.push(error.stack || String(error));
} finally {
  await browser?.close();
  report.status = report.errors.length || report.checks.some(check => check.status !== 'passed') ? 'failed' : 'passed';
  await writeFile(path.join(output, 'browser-results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Evidence: ${path.join(output, 'browser-results.json')}`);
  console.log('These checks do NOT verify real microphone input, audible Korean output, or user value.');
  if (report.status !== 'passed') process.exitCode = 1;
}
