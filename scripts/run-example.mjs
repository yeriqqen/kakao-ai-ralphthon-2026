import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { FIXTURE, SCRIPT, createSession, beginSession, recordReceptionist, answerRelay, buildReport, finishSession } from '../public/engine.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expectedSummary = 'Клиника открыта. Женщина-врач сегодня не принимает, но доступен другой врач. Принимают без корейской государственной медицинской страховки. Консультация — примерно 20 000 вон. Сейчас ожидание — 15 минут.';
const source = 'synthetic-fixture';
const checks = [];
function compare(id, description, expected, actual, evidence = {}) {
  checks.push({ id, description, status: isDeepStrictEqual(expected, actual) ? 'PASS' : 'FAIL', expected, actual, evidence });
}
function active() { const state = createSession(FIXTURE); beginSession(state); return state; }

const state = active();
const before = buildReport(state);
compare('before-input', 'No clinic answer exists before the receptionist speaks.', Array(6).fill('Unclear'), before.facts.map(f => f.status), { summary: before.summary, transcript: before.transcript });

recordReceptionist(state, SCRIPT[0], source);
const knownAnswer = recordReceptionist(state, '아이는 몇 살인가요?', source);
compare('known-age', 'Previously collected age answers a Korean follow-up without a user relay.', { kind: 'known-answer', containsAge: true, relay: null }, { kind: knownAnswer.kind, containsAge: knownAnswer.korean.includes('아이는 7세입니다.'), relay: state.pendingRelay }, { response: knownAnswer.korean });
recordReceptionist(state, SCRIPT[1], source);
recordReceptionist(state, SCRIPT[2], source);
const relay = recordReceptionist(state, '처음 방문하시나요?', source);
compare('relay-question', 'Unknown prior-visit status is relayed in Russian.', { kind: 'relay', russian: 'Вы впервые в этой клинике?', undisclosed: true }, { kind: relay.kind, russian: relay.relay, undisclosed: state.disclosed.firstVisit === undefined });
const relayAnswer = answerRelay(state, 'Да.');
compare('relay-answer', 'The user’s explicit Russian answer is returned in Korean.', '네, 처음 방문입니다.', relayAnswer.korean, { userInput: 'Да.', pendingRelay: state.pendingRelay });
for (const text of SCRIPT.slice(3)) recordReceptionist(state, text, source);
const report = finishSession(state);
compare('russian-summary', 'The six facts produce the exact requested Russian summary.', expectedSummary, report.summary);
compare('supported-facts', 'Every supported fact has the simulation-only confirmation status and transcript evidence.', Array(6).fill({ status: 'Confirmed in simulation', hasEvidence: true, syntheticOnly: true }), report.facts.map(f => ({ status: f.status, hasEvidence: f.evidence.length > 0, syntheticOnly: f.evidence.every(e => e.source === source) })));
compare('reception-sheet', 'Korean reception sheet contains only supplied fictional age and insurance.', '접수용: 나이: 7세 / 건강보험: 국민건강보험 없음.', report.sheets.reception);
compare('doctor-sheet', 'Korean doctor sheet contains only supplied fictional symptoms and duration.', '진료용: 증상: 기침 / 증상 기간: 2일.', report.sheets.doctor);
compare('sheet-label', 'Both sheets carry the required fictional-data label.', '데모용 가상 정보 — 실제 환자 정보 아님.', report.sheets.label);
compare('evidence-only-readback', 'Korean readback includes received cost and wait facts.', { cost: true, wait: true }, { cost: report.readbackKorean.includes('20000원'), wait: report.readbackKorean.includes('15분') }, { text: report.readbackKorean, audibleVerification: 'Unverified' });

let invalidMessage = null;
try { createSession({ ...FIXTURE, request: ' ' }); } catch (error) { invalidMessage = error.message; }
compare('empty-request', 'An empty request stops with useful guidance.', true, typeof invalidMessage === 'string' && invalidMessage.includes('Введите запрос'), { message: invalidMessage });

const ambiguousState = active();
recordReceptionist(ambiguousState, '아마 대기 시간은 15분일 것 같아요.', source);
const ambiguous = buildReport(ambiguousState);
compare('ambiguous-answer', 'An uncertain wait time is Unclear and excluded from the summary.', { status: 'Unclear', value: null, includedInSummary: false }, { status: ambiguous.facts.find(f => f.key === 'wait').status, value: ambiguous.facts.find(f => f.key === 'wait').value, includedInSummary: ambiguous.summary.includes('15') });

const missingState = active();
recordReceptionist(missingState, '처음 방문하시나요?', source);
const absent = answerRelay(missingState, '');
const missing = finishSession(missingState);
compare('missing-user-answer', 'Without a user answer, the relay remains unresolved and no personal fact is guessed.', { kind: 'paused', status: 'Unclear', complete: false, firstVisitUnknown: true }, { kind: absent.kind, status: missing.pendingRelay?.status, complete: missing.complete, firstVisitUnknown: missingState.disclosed.firstVisit === undefined });

const contradictionState = active();
recordReceptionist(contradictionState, '여자 의사 선생님은 진료 가능합니다. 여자 의사 선생님은 진료 불가능합니다.', source);
const contradiction = buildReport(contradictionState).facts.find(f => f.key === 'femaleDoctor');
compare('same-turn-contradiction', 'Conflicting statements within a single turn do not become confirmed.', { status: 'Unclear', value: null, conflicted: true }, { status: contradiction.status, value: contradiction.value, conflicted: contradiction.conflicted });

const artifact = {
  generatedAt: new Date().toISOString(),
  simulation: true,
  title: 'YOKOBU deterministic fictional example — expected versus actual',
  command: 'npm run verify',
  inputSource: source,
  allPassed: checks.every(check => check.status === 'PASS'),
  totals: { passed: checks.filter(check => check.status === 'PASS').length, failed: checks.filter(check => check.status === 'FAIL').length },
  capabilityVerdict: {
    deterministicConversation: checks.every(check => check.status === 'PASS') ? 'Demonstrated with synthetic text inputs' : 'Failed; see checks',
    actualMicrophoneConversation: 'Unverified — this command does not access a microphone',
    audibleKoreanSpeech: 'Unverified — this command checks generated Korean text only',
    browserIntegration: 'See separate artifacts/browser-results.json; injected speech events are synthetic',
    generalLanguageUnderstanding: 'Mocked by a limited deterministic local phrase matcher',
    realPhoneCall: 'Out of scope — no call placed',
    userValue: 'Unverified — no actual user feedback',
  },
  checks,
  example: { inputs: FIXTURE, receptionistScript: SCRIPT, report },
  safetyCases: { ambiguous, missingUserResponse: missing, sameTurnContradiction: contradiction },
};
await mkdir(resolve(root, 'artifacts'), { recursive: true });
await mkdir(resolve(root, 'docs'), { recursive: true });
await writeFile(resolve(root, 'artifacts/expected-vs-actual.json'), JSON.stringify(artifact, null, 2) + '\n');

const start = '<!-- BEGIN GENERATED DETERMINISTIC VERIFICATION -->';
const end = '<!-- END GENERATED DETERMINISTIC VERIFICATION -->';
const generated = `${start}
## Deterministic example run

Generated: ${artifact.generatedAt}. Command: \`npm run verify\`.

Result: **${artifact.totals.passed} passed; ${artifact.totals.failed} failed**. These are actual runs of the local conversation engine with explicitly **synthetic text inputs**. They do not demonstrate a microphone conversation or audible Korean speech. The source of each received fact is preserved as \`synthetic-fixture\`.

| Check | Expected versus actual |
| --- | --- |
${checks.map(check => `| ${check.description} | ${check.status} |`).join('\n')}

Expected Russian summary:

> ${expectedSummary}

Actual Russian summary:

> ${report.summary}

Actual Korean sample sheets:

- ${report.sheets.reception}
- ${report.sheets.doctor}
- Label for both: ${report.sheets.label}

The exact inputs, outputs, transcript, evidence source, expected values, actual values, and negative-path results are preserved in [expected-vs-actual.json](../artifacts/expected-vs-actual.json).

## Evidence boundaries

| Capability | Status and evidence |
| --- | --- |
| Russian request, missing-information interview data, Korean plan and generated conversation text | Engine demonstration uses the supplied fictional example. UI evidence is separate. |
| First-visit relay and refusal to invent missing answers | Demonstrated by this synthetic run. |
| Six-fact Russian summary and Korean sample sheets | Demonstrated; exact expected summary matched when all six facts were supplied. |
| Actual microphone-based teammate conversation | **Unverified** by this run. Requires an actual teammate and working device permission. |
| Korean speech heard by a person | **Unverified** by this run. Generated Korean text is not audible speech verification. |
| Browser UI and injected browser speech events | See [browser-results.json](../artifacts/browser-results.json) and [audio feasibility](audio-feasibility.md). Mocked events do not verify audio hardware or speech recognition. |
| General-purpose Korean/Russian translation | **Mocked/limited**: deterministic phrase matching; unknown questions pause. |
| Real phone calls and real clinic facts | Out of scope; no real clinic contacted. All confirmations say “Confirmed in simulation.” |
| User value | **Unverified**; no actual user feedback. |

Safety checks cover empty requests, no received clinic answers, unknown personal information, missing user responses, uncertain numeric answers, and contradictory same-turn claims. Unrecognized Korean wording may require a clearer scripted phrase or remain **Unclear**. Korean spelled-out numbers such as “열다섯 분” are not generally parsed; they remain **Unclear**.

The fixture is synthetic. No patient names, identifiers, diagnoses, medications, allergies, or other missing health facts are added. No audio recording is created by this verification script.
${end}`;
const verificationPath = resolve(root, 'docs/verification.md');
let previous = '';
try { previous = await readFile(verificationPath, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
let document;
if (previous.includes(start) && previous.includes(end)) {
  document = previous.slice(0, previous.indexOf(start)) + generated + previous.slice(previous.indexOf(end) + end.length);
} else if (previous) {
  document = previous + '\n\n' + generated + '\n';
} else {
  document = '# YOKOBU verification record\n\nAll clinic information and user details below are fictional simulation data.\n\n' + generated + '\n\n## Human microphone and audible-output evidence\n\nUnverified. Add dated actual-device observations here without replacing the synthetic evidence. Record browser/device, permission outcome, microphone input actually recognized, Korean speech actually heard, live relay result, and remaining failures.\n';
}
await writeFile(verificationPath, document);
console.log(`Deterministic fictional example: ${artifact.totals.passed} passed, ${artifact.totals.failed} failed.`);
console.log('Saved artifacts/expected-vs-actual.json and docs/verification.md. Actual microphone/audio: Unverified.');
if (!artifact.allPassed) process.exitCode = 1;
