import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXTURE, SCRIPT, createSession, beginSession, recordReceptionist,
  answerRelay, buildReport, finishSession,
} from '../public/engine.js';

const expected = 'Клиника открыта. Женщина-врач сегодня не принимает, но доступен другой врач. Принимают без корейской государственной медицинской страховки. Консультация — примерно 20 000 вон. Сейчас ожидание — 15 минут.';
function active() { const state = createSession(FIXTURE); beginSession(state); return state; }

test('fictional six facts, live relay and Korean sheets follow actual evidence', () => {
  const state = active();
  for (const text of SCRIPT.slice(0, 2)) recordReceptionist(state, text, 'microphone');
  const checkpoint = recordReceptionist(state, '처음 방문하시나요?', 'microphone');
  assert.equal(checkpoint.kind, 'relay');
  assert.equal(checkpoint.relay, 'Вы впервые в этой клинике?');
  assert.equal(answerRelay(state, 'Да.').korean, '네, 처음 방문입니다.');
  for (const text of SCRIPT.slice(2)) recordReceptionist(state, text, 'microphone');
  const report = finishSession(state);
  assert.equal(report.summary, expected);
  assert.equal(report.complete, true);
  assert.ok(report.facts.every(f => f.status === 'Confirmed in simulation' && f.evidence.length));
  assert.ok(report.facts.every(f => f.evidence.every(e => e.source === 'microphone')));
  assert.equal(report.sheets.reception, '접수용: 나이: 7세 / 건강보험: 국민건강보험 없음.');
  assert.equal(report.sheets.doctor, '진료용: 증상: 기침 / 증상 기간: 2일.');
  assert.equal(report.sheets.label, '데모용 가상 정보 — 실제 환자 정보 아님.');
  assert.match(report.readbackKorean, /20000원/);
  assert.match(report.readbackKorean, /15분/);
});

test('empty or incomplete transcript never produces the successful fixture summary', () => {
  const ready = createSession(FIXTURE);
  assert.equal(ready.transcript.length, 0);
  const report = buildReport(ready);
  assert.equal(report.complete, false);
  assert.notEqual(report.summary, expected);
  assert.ok(report.facts.every(f => f.status === 'Unclear' && f.evidence.length === 0));
  const state = active();
  assert.equal(recordReceptionist(state, '  ').kind, 'error');
  recordReceptionist(state, SCRIPT[0]);
  assert.equal(buildReport(state).summary, 'Клиника открыта.');
  assert.equal(buildReport(state).facts.filter(f => f.status === 'Confirmed in simulation').length, 1);
});

test('changed receptionist answers produce changed results rather than fixture success', () => {
  const state = active();
  recordReceptionist(state, '오늘은 휴진입니다.');
  recordReceptionist(state, '오늘 여자 의사 선생님 진료 가능합니다.');
  recordReceptionist(state, '다른 의사 선생님은 없습니다.');
  recordReceptionist(state, '국민건강보험이 없으면 진료할 수 없습니다.');
  recordReceptionist(state, '진찰료는 3만 원입니다.');
  recordReceptionist(state, '대기 시간은 30분입니다.');
  const report = finishSession(state);
  assert.equal(report.complete, true);
  assert.match(report.summary, /^Клиника закрыта\./);
  assert.match(report.summary, /Женщина-врач сегодня принимает\./);
  assert.match(report.summary, /не принимают/);
  assert.match(report.summary, /30 000 вон/);
  assert.match(report.summary, /30 минут/);
  assert.notEqual(report.summary, expected);
});

test('covered personal questions use collected details without opening a relay or confirming clinic facts', () => {
  const state = active();
  for (const [question, fragment] of [
    ['아이는 몇 살인가요?', '7세'], ['증상이 어떻게 되나요?', '기침'],
    ['언제부터 증상이 있었나요?', '2일'], ['국민건강보험이 있나요?', '국민건강보험이 없습니다.'],
  ]) {
    const result = recordReceptionist(state, question);
    assert.equal(result.kind, 'known-answer');
    assert.ok(result.korean.includes(fragment));
    assert.equal(state.pendingRelay, null);
  }
  assert.ok(buildReport(state).facts.every(f => f.status === 'Unclear'));
  assert.equal(state.currentQuestion, 'open');
});

test('first visit is unknown until the user answers; no response stays paused', () => {
  const state = active();
  recordReceptionist(state, '처음 방문하시나요?');
  assert.equal(state.disclosed.firstVisit, undefined);
  assert.equal(answerRelay(state, '').kind, 'paused');
  assert.equal(answerRelay(state, 'возможно').kind, 'paused');
  assert.equal(recordReceptionist(state, SCRIPT[0]).kind, 'paused');
  assert.equal(state.disclosed.firstVisit, undefined);
  const report = finishSession(state);
  assert.equal(report.pendingRelay.status, 'Unclear');
  assert.equal(report.complete, false);
  assert.ok(report.facts.every(f => f.status === 'Unclear'));
});

test('unknown receptionist question and arbitrary Russian answer cannot fabricate a translation', () => {
  const state = active();
  const relay = recordReceptionist(state, '알레르기가 있나요?');
  assert.equal(relay.kind, 'relay');
  assert.match(relay.relay, /Перевод этого вопроса недоступен/);
  assert.equal(answerRelay(state, 'Нет').kind, 'paused');
  assert.ok(state.pendingRelay);
  assert.equal(state.disclosed.allergies, undefined);
});

test('contradictory facts become Unclear and are excluded from readback and summary', () => {
  const state = active();
  recordReceptionist(state, '대기 시간은 15분입니다.');
  recordReceptionist(state, '대기 시간은 30분입니다.');
  const report = finishSession(state);
  const wait = report.facts.find(f => f.key === 'wait');
  assert.equal(wait.status, 'Unclear');
  assert.equal(wait.value, null);
  assert.equal(wait.conflicted, true);
  assert.equal(wait.evidence.length, 2);
  assert.doesNotMatch(report.summary, /15|30/);
  assert.doesNotMatch(report.readbackKorean, /15분|30분/);
});

test('conflicting boolean claims within one turn remain Unclear', () => {
  for (const [text, key] of [
    ['여자 의사 선생님은 진료 가능합니다. 여자 의사 선생님은 진료 불가능합니다.', 'femaleDoctor'],
    ['국민건강보험이 없으면 진료 가능합니다. 국민건강보험이 없으면 진료 불가능합니다.', 'uninsured'],
    ['여자 의사 선생님은 진료 가능하지만 여자 의사 선생님은 진료 불가능합니다.', 'femaleDoctor'],
  ]) {
    const state = active();
    recordReceptionist(state, text);
    assert.equal(state.facts[key].status, 'Unclear', text);
    assert.equal(state.facts[key].value, null, text);
    assert.equal(state.facts[key].conflicted, true, text);
  }
});

test('uncertain numeric claims never become confirmed', () => {
  const state = active();
  const event = recordReceptionist(state, '아마 대기 시간은 15분일 것 같아요.');
  assert.equal(event.kind, 'unclear');
  assert.equal(state.facts.wait.status, 'Unclear');
  assert.equal(state.facts.wait.value, null);
  assert.doesNotMatch(buildReport(state).summary, /15/);
});

test('numeric corrections, ranges, alternatives and negations require clarification', () => {
  for (const text of ['대기 시간은 15~30분입니다.', '대기 시간은 15분 아니 30분입니다.', '대기 시간은 15분이 아닙니다.', '대기 시간은 15분 또는 30분입니다.']) {
    const state = active();
    recordReceptionist(state, text);
    assert.equal(state.facts.wait.status, 'Unclear', text);
    assert.equal(state.facts.wait.value, null, text);
  }
  const state = active();
  recordReceptionist(state, '진찰료는 2만 원이 아닙니다.');
  assert.equal(state.facts.cost.status, 'Unclear');
});

test('spoken declarative honorifics are accepted without treating them as personal questions', () => {
  const state = active();
  recordReceptionist(state, '네 열려 있어요');
  const female = recordReceptionist(state, '오늘 여자 의사 선생님은 안 계세요');
  assert.equal(female.kind, 'fact');
  assert.equal(state.facts.open.value, true);
  assert.equal(state.facts.femaleDoctor.value, false);
  assert.equal(state.pendingRelay, null);
  recordReceptionist(state, '국민건강보험이 없어도 돼요');
  assert.equal(state.facts.uninsured.value, true);
});

test('yes and no are bound to the actual current question', () => {
  const state = active();
  recordReceptionist(state, '네.');
  recordReceptionist(state, '아니요.');
  assert.equal(state.facts.open.value, true);
  assert.equal(state.facts.femaleDoctor.value, false);
  assert.equal(state.facts.otherDoctor.status, 'Unclear');
});

test('invalid request and missing interview details stop before the simulation', () => {
  assert.throws(() => createSession({ ...FIXTURE, request: ' ' }), /Введите запрос/);
  for (const key of ['age', 'symptoms', 'duration', 'insurance']) {
    const details = { ...FIXTURE }; delete details[key];
    assert.throws(() => createSession(details));
  }
  assert.throws(() => createSession({ ...FIXTURE, age: 'unknown' }));
});

test('fixture and typed sources stay distinct from microphone provenance', () => {
  const state = active();
  recordReceptionist(state, SCRIPT[0], 'scripted-fixture');
  recordReceptionist(state, SCRIPT[1]);
  const report = buildReport(state);
  assert.equal(report.facts[0].evidence[0].source, 'scripted-fixture');
  assert.equal(report.facts[1].evidence[0].source, 'typed');
  assert.equal(report.transcript.some(entry => entry.source === 'microphone'), false);
});

test('finished session rejects later input and does not manufacture a fresh successful run', () => {
  const state = active();
  finishSession(state);
  assert.equal(recordReceptionist(state, SCRIPT[0]).kind, 'error');
  assert.ok(buildReport(state).facts.every(f => f.status === 'Unclear'));
});
