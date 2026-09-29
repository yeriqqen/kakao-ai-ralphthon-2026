// Local, deliberately limited simulation. No network, phone calls, or clinical inference.
export const FIXTURE = Object.freeze({
  request: 'Узнайте в этой детской клинике, принимает ли сегодня женщина-врач, принимают ли пациентов без корейской государственной медицинской страховки и сколько сейчас ждать.',
  age: 7,
  symptoms: 'кашель',
  duration: 2,
  insurance: 'none',
});

export const FACTS = Object.freeze([
  { key: 'open', label: 'Клиника открыта', question: '오늘 진료하시나요?' },
  { key: 'femaleDoctor', label: 'Женщина-врач сегодня', question: '오늘 여자 의사 선생님께 진료를 받을 수 있나요?' },
  { key: 'otherDoctor', label: 'Другой врач', question: '다른 의사 선생님께 진료를 받을 수 있나요?' },
  { key: 'uninsured', label: 'Приём без государственной страховки', question: '국민건강보험이 없는 환자도 진료를 받을 수 있나요?' },
  { key: 'cost', label: 'Стоимость консультации', question: '국민건강보험이 없으면 진찰료가 대략 얼마인가요?' },
  { key: 'wait', label: 'Время ожидания', question: '지금 대기 시간은 몇 분인가요?' },
]);

export const SCRIPT = Object.freeze([
  '네, 오늘 진료합니다.',
  '오늘 여자 의사 선생님은 진료하지 않습니다.',
  '다른 의사 선생님은 진료 가능합니다.',
  '국민건강보험이 없어도 진료받을 수 있습니다.',
  '진찰료는 약 2만 원입니다.',
  '지금 대기 시간은 15분입니다.',
]);

export const CALL_PLAN = Object.freeze(FACTS.map(({ question }) => question));
const CONFIRMED = 'Confirmed in simulation';
const UNCLEAR = 'Unclear';
const SHEET_LABEL = '데모용 가상 정보 — 실제 환자 정보 아님.';
const INTRO = '안녕하세요. 저는 외국인 주민을 대신해 문의드리는 AI 도우미입니다. 실제 전화가 아닌 시뮬레이션입니다.';
const UNCERTAIN = /아마|모르|몰라|확실하지|불확실|정확하지|것\s*같|수도|확인.{0,8}(?:필요|해야)|글쎄|아직\s*미정/;
const YES = /^(?:네|예|맞습니다|맞아요|그렇습니다|그럼요)(?:[.!。\s]+)?$/;
const NO = /^(?:아니요|아니오|아닙니다|아니에요)(?:[.!。\s]+)?$/;

function append(state, role, text, language, source) {
  const entry = { id: state.transcript.length + 1, role, text, language, source };
  state.transcript.push(entry);
  return entry;
}

function assistantEvent(state, kind, korean = '', extra = {}) {
  state.nextKorean = korean;
  if (korean) append(state, 'assistant', korean, 'ko', 'local-script');
  return { kind, korean, relay: state.pendingRelay?.russian || null, changedFacts: [], ...extra };
}

function validateDetails(details) {
  if (!details || typeof details.request !== 'string' || !details.request.trim()) {
    throw new Error('Введите запрос перед началом симуляции.');
  }
  if (!Number.isInteger(Number(details.age)) || String(details.age).trim() === '' || details.age == null || Number(details.age) < 0 || Number(details.age) > 17) {
    throw new Error('Укажите возраст ребёнка от 0 до 17 лет.');
  }
  if (typeof details.symptoms !== 'string' || !details.symptoms.trim()) {
    throw new Error('Укажите симптомы из вымышленного примера.');
  }
  if (!Number.isInteger(Number(details.duration)) || String(details.duration).trim() === '' || details.duration == null || Number(details.duration) < 1 || Number(details.duration) > 365) {
    throw new Error('Укажите длительность симптомов в днях.');
  }
  if (!['none', 'national'].includes(details.insurance)) {
    throw new Error('Укажите наличие корейской государственной медицинской страховки.');
  }
  return {
    request: details.request.trim(), age: Number(details.age), symptoms: details.symptoms.trim(),
    duration: Number(details.duration), insurance: details.insurance,
  };
}

export function createSession(details = FIXTURE) {
  return {
    simulation: true,
    details: validateDetails(details),
    phase: 'ready',
    transcript: [],
    facts: Object.fromEntries(FACTS.map(({ key, label }) => [key, {
      key, label, status: UNCLEAR, value: null, evidence: [], conflicted: false,
    }])),
    pendingRelay: null,
    disclosed: {},
    currentQuestion: 'open',
    nextKorean: `${INTRO} ${FACTS[0].question}`,
    readbackKorean: '',
  };
}

export function beginSession(state) {
  if (state.phase !== 'ready') return { kind: 'error', korean: '', message: 'Симуляция уже начата.' };
  state.phase = 'conversation';
  return assistantEvent(state, 'agent', `${INTRO} ${FACTS[0].question}`);
}

function currentPrompt(state) {
  return FACTS.find(({ key }) => key === state.currentQuestion)?.question || '';
}

function nextPrompt(state) {
  const next = FACTS.find(({ key }) => state.facts[key].status !== CONFIRMED && !state.facts[key].conflicted);
  state.currentQuestion = next?.key || null;
  return next?.question || '감사합니다. 확인된 내용을 정리하겠습니다.';
}

function available(segment) {
  if (/(?:없|불가|불가능|휴진|휴무|닫|마감|못|안\s*(?:계|되|돼|받|하|해|열|진료|오|나오)|않|아닙)/.test(segment)) return false;
  if (/(?:가능|계십|계세|있습니다|있어요|진료합니다|진료해요|진료하세요|진료\s*중|받을\s*수\s*있|열려|열었|열어요|엽니다|운영합니다|영업합니다)/.test(segment)) return true;
  return null;
}

function topicSegment(text, match, stops) {
  const rest = text.slice(match.index);
  const afterTopic = rest.slice(match[0].length);
  const stop = afterTopic.search(stops);
  return stop < 0 ? rest : rest.slice(0, match[0].length + stop);
}

function numberBefore(text, unit) {
  // Ranges, alternatives, corrections, and explicit negation need clarification.
  // Picking the first number would turn an ambiguous utterance into a false fact.
  if (/\d\s*(?:~|〜|–|-|부터|에서)|아니|아닙|않|또는|혹은/.test(text)) return null;
  const count = [...text.matchAll(new RegExp(`(\\d[\\d,]*(?:\\.\\d+)?)\\s*(만|천)?\\s*${unit}`, 'g'))].length;
  if (count > 1) return null;
  const match = text.match(new RegExp(`(\\d[\\d,]*(?:\\.\\d+)?)\\s*(만|천)?\\s*${unit}`));
  if (!match) return null;
  const value = Number(match[1].replaceAll(',', '')) * (match[2] === '만' ? 10000 : match[2] === '천' ? 1000 : 1);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function parseFacts(state, text) {
  const values = {};
  const mentioned = new Set();
  const female = text.match(/(?:여자|여성|여의사)/);
  const other = text.match(/다른\s*(?:의사|선생님)/);
  const insurance = /보험|무보험|비보험/.test(text);
  const cost = /진찰료|진료비|상담료|상담비|비용|얼마|원/.test(text);
  const wait = /대기|기다|\d\s*분/.test(text);
  if (female) {
    mentioned.add('femaleDoctor');
    values.femaleDoctor = available(topicSegment(text, female, /다른\s*(?:의사|선생님)|국민|보험|진찰료|진료비|대기/));
  }
  if (other) {
    mentioned.add('otherDoctor');
    values.otherDoctor = available(topicSegment(text, other, /국민|보험|진찰료|진료비|대기/));
  }
  if (insurance && /없|미가입|무보험|비보험|있어야/.test(text) && !cost) {
    mentioned.add('uninsured');
    if (/있어야|(?:진료|접수).{0,15}(?:불가|불가능|할\s*수\s*없|받을\s*수\s*없)|(?:안|못)\s*(?:받|되|돼|하)|않|거절/.test(text)) values.uninsured = false;
    else if (/가능|받을\s*수\s*있|받아|받습니다|해드|괜찮|진료합니다|상관없|돼요|됩니다/.test(text)) values.uninsured = true;
  }
  if (cost) {
    mentioned.add('cost');
    const amount = numberBefore(text, '원');
    if (amount !== null && amount <= 10000000) values.cost = { amount, approximate: /약|정도|대략|쯤/.test(text) };
  }
  if (wait) {
    mentioned.add('wait');
    const minutes = numberBefore(text, '분');
    if (minutes !== null && minutes <= 1440) values.wait = { minutes, approximate: /약|정도|대략|쯤/.test(text) };
  }
  if (!female && !other && !insurance && !cost && !wait && /오늘|지금|병원|클리닉|문|진료|영업|운영|휴진|휴무|열려|열었|열어요|닫/.test(text)) {
    mentioned.add('open');
    values.open = available(text);
  }
  if (state.currentQuestion && (YES.test(text) || NO.test(text)) && !['cost', 'wait'].includes(state.currentQuestion)) {
    mentioned.add(state.currentQuestion);
    values[state.currentQuestion] = YES.test(text);
  }
  // Numerical replies such as "2만 원입니다" and "15분입니다" are accepted only as those facts.
  // Uncertainty taints the entire utterance rather than selecting its convenient fragments.
  if (UNCERTAIN.test(text)) {
    if (!mentioned.size && state.currentQuestion) mentioned.add(state.currentQuestion);
    for (const key of mentioned) values[key] = null;
  }
  return { values, mentioned };
}

function collectFacts(state, text, entry) {
  const clauses = text.split(/[.!。](?:\s+|(?=[가-힣]))|하지만|그런데/).map(part => part.trim()).filter(Boolean);
  const values = {};
  const mentioned = new Set();
  const conflicting = new Set();
  for (const clause of clauses) {
    const parsed = parseFacts(state, clause);
    for (const key of parsed.mentioned) {
      if (mentioned.has(key) && JSON.stringify(values[key]) !== JSON.stringify(parsed.values[key])) conflicting.add(key);
      else values[key] = parsed.values[key];
      mentioned.add(key);
    }
  }
  if (UNCERTAIN.test(text)) for (const key of mentioned) values[key] = null;
  for (const key of conflicting) values[key] = null;
  const changed = [];
  for (const key of mentioned) {
    const fact = state.facts[key];
    const value = values[key];
    fact.evidence.push({ transcriptId: entry.id, text: entry.text, source: entry.source });
    if (value == null) {
      if (fact.status === CONFIRMED || conflicting.has(key)) fact.conflicted = true;
      fact.status = UNCLEAR;
      fact.value = null;
    } else if (fact.conflicted || (fact.status === CONFIRMED && JSON.stringify(fact.value) !== JSON.stringify(value))) {
      fact.conflicted = true;
      fact.status = UNCLEAR;
      fact.value = null;
    } else {
      fact.status = CONFIRMED;
      fact.value = value;
    }
    changed.push(key);
  }
  return changed;
}

function isQuestion(text) {
  // "안 계세요" is a common declarative receptionist answer; 세요 alone is not a question.
  return /[?？]|(?:나요|니까|까요|시죠|인가요|얼마예요|몇\s*살이에요)[.!。\s]*$/.test(text)
    || /(?:처음\s*(?:방문|내원)|초진|몇\s*살|나이|언제부터|증상|보험).*(?:이세요|있으세요|없으세요|어떻게\s*되세요)[.!。\s]*$/.test(text);
}

function symptomKorean(symptoms) {
  return /^(?:кашель|기침|cough)$/i.test(symptoms.trim()) ? '기침' : null;
}

function coveredAnswer(state, text) {
  if (/몇\s*살|나이|연령/.test(text)) return `아이는 ${state.details.age}세입니다.`;
  if (/언제부터|며칠|증상\s*기간|얼마나\s*오래/.test(text)) return `증상은 ${state.details.duration}일 전부터 있었습니다.`;
  if (/증상|어디.{0,6}아프|어떻게.{0,6}아프/.test(text)) {
    const symptom = symptomKorean(state.details.symptoms);
    return symptom ? `증상은 ${symptom}이며, ${state.details.duration}일 동안 지속되었습니다.` : null;
  }
  if (/보험/.test(text) && /가입|있|없|여부|되|적용/.test(text)) {
    return state.details.insurance === 'none' ? '아이는 국민건강보험이 없습니다.' : '아이는 국민건강보험이 있습니다.';
  }
  return null;
}

export function recordReceptionist(state, input, source = 'typed') {
  const text = typeof input === 'string' ? input.trim() : '';
  if (!text) return { kind: 'error', korean: '', message: 'Ответ не получен. Введите текст или повторите ввод с микрофона.' };
  if (state.phase !== 'conversation') return { kind: 'error', korean: '', message: 'Сначала начните новую симуляцию.' };
  if (state.pendingRelay) return { kind: 'paused', korean: '', relay: state.pendingRelay.russian, message: 'Ожидается ответ пользователя; личные сведения не угадываются.' };
  const entry = append(state, 'receptionist', text, 'ko', source);
  if (isQuestion(text)) {
    const answer = coveredAnswer(state, text);
    if (answer) return assistantEvent(state, 'known-answer', `${answer} ${currentPrompt(state)}`);
    const firstVisit = /처음\s*(?:방문|오|내원)|초진/.test(text);
    state.pendingRelay = {
      kind: firstVisit ? 'firstVisit' : 'unknown', question: text,
      russian: firstVisit ? 'Вы впервые в этой клинике?' : `В регистратуре задали вопрос: «${text}». Перевод этого вопроса недоступен в демо. Нужен ответ на корейском или помощь переводчика.`,
      transcriptId: entry.id,
    };
    return assistantEvent(state, 'relay', '잠시만 기다려 주세요. 사용자에게 확인하겠습니다.');
  }
  const changedFacts = collectFacts(state, text, entry);
  if (!changedFacts.length || changedFacts.some(key => state.facts[key].status === UNCLEAR)) {
    const korean = `죄송하지만 답변을 명확하게 확인하지 못했습니다. ${currentPrompt(state) || '확실한 정보만 다시 말씀해 주세요.'}`;
    return assistantEvent(state, 'unclear', korean, { changedFacts, message: 'Ответ неоднозначен или не распознан локальным сценарием. Данные не подтверждены.' });
  }
  return assistantEvent(state, 'fact', nextPrompt(state), { changedFacts });
}

export function answerRelay(state, input) {
  if (!state.pendingRelay || state.phase !== 'conversation') return { kind: 'error', korean: '', message: 'Сейчас нет вопроса для пользователя.' };
  const text = typeof input === 'string' ? input.trim() : '';
  if (!text) return { kind: 'paused', korean: '', relay: state.pendingRelay.russian, message: 'Ответ не получен. Симуляция приостановлена.' };
  let korean = '';
  if (state.pendingRelay.kind === 'firstVisit') {
    if (/^да[.!\s]*$/i.test(text)) {
      korean = '네, 처음 방문입니다.';
      state.disclosed.firstVisit = true;
    } else if (/^нет[.!\s]*$/i.test(text)) {
      korean = '아니요, 이전에 방문한 적이 있습니다.';
      state.disclosed.firstVisit = false;
    } else {
      return { kind: 'paused', korean: '', relay: state.pendingRelay.russian, message: 'Для этого демонстрационного вопроса введите «Да» или «Нет». Ответ не угадывается.' };
    }
  } else if (/[가-힣]/.test(text)) {
    korean = text;
  } else {
    return { kind: 'paused', korean: '', relay: state.pendingRelay.russian, message: 'Произвольный перевод недоступен в локальном демо. Введите подтверждённый ответ на корейском или завершите с Unclear.' };
  }
  append(state, 'user', text, state.pendingRelay.kind === 'firstVisit' ? 'ru' : 'ko', 'typed-relay');
  state.pendingRelay = null;
  // The exact relay is separate from the next question so the user can audit the translation.
  return assistantEvent(state, 'relay-answer', korean, { resumeKorean: currentPrompt(state) });
}

function money(amount) {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function minutesWord(n) {
  return n % 10 === 1 && n % 100 !== 11 ? 'минута' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'минуты' : 'минут';
}

function displayFact(fact) {
  if (fact.status !== CONFIRMED || fact.value == null) return 'Неясно';
  if (fact.key === 'cost') return `${fact.value.approximate ? 'Примерно ' : ''}${money(fact.value.amount)} вон`;
  if (fact.key === 'wait') return `${fact.value.approximate ? 'Примерно ' : ''}${fact.value.minutes} ${minutesWord(fact.value.minutes)}`;
  if (fact.key === 'open') return fact.value ? 'Открыта' : 'Закрыта';
  if (fact.key === 'uninsured') return fact.value ? 'Принимают' : 'Не принимают';
  return fact.value ? 'Принимает' : 'Не принимает';
}

function russianSummary(state) {
  const f = state.facts;
  const confirmed = key => f[key].status === CONFIRMED;
  const parts = [];
  if (confirmed('open')) parts.push(f.open.value ? 'Клиника открыта.' : 'Клиника закрыта.');
  if (confirmed('femaleDoctor') && !f.femaleDoctor.value && confirmed('otherDoctor') && f.otherDoctor.value) {
    parts.push('Женщина-врач сегодня не принимает, но доступен другой врач.');
  } else {
    if (confirmed('femaleDoctor')) parts.push(f.femaleDoctor.value ? 'Женщина-врач сегодня принимает.' : 'Женщина-врач сегодня не принимает.');
    if (confirmed('otherDoctor')) parts.push(f.otherDoctor.value ? 'Доступен другой врач.' : 'Другой врач недоступен.');
  }
  if (confirmed('uninsured')) parts.push(f.uninsured.value ? 'Принимают без корейской государственной медицинской страховки.' : 'Без корейской государственной медицинской страховки не принимают.');
  if (confirmed('cost')) parts.push(`Консультация — ${f.cost.value.approximate ? 'примерно ' : ''}${money(f.cost.value.amount)} вон.`);
  if (confirmed('wait')) parts.push(`Сейчас ожидание — ${f.wait.value.approximate ? 'примерно ' : ''}${f.wait.value.minutes} ${minutesWord(f.wait.value.minutes)}.`);
  return parts.join(' ') || 'Подтверждённых сведений о клинике пока нет. Все неуточнённые данные — Unclear.';
}

function koreanReadback(state) {
  const f = state.facts;
  const parts = [];
  if (f.open.status === CONFIRMED) parts.push(f.open.value ? '오늘 진료합니다.' : '오늘 진료하지 않습니다.');
  if (f.femaleDoctor.status === CONFIRMED) parts.push(f.femaleDoctor.value ? '오늘 여자 의사 선생님 진료가 가능합니다.' : '오늘 여자 의사 선생님 진료는 불가능합니다.');
  if (f.otherDoctor.status === CONFIRMED) parts.push(f.otherDoctor.value ? '다른 의사 선생님 진료가 가능합니다.' : '다른 의사 선생님 진료도 불가능합니다.');
  if (f.uninsured.status === CONFIRMED) parts.push(f.uninsured.value ? '국민건강보험이 없어도 진료받을 수 있습니다.' : '국민건강보험이 없으면 진료받을 수 없습니다.');
  if (f.cost.status === CONFIRMED) parts.push(`진찰료는 ${f.cost.value.approximate ? '약 ' : ''}${f.cost.value.amount}원입니다.`);
  if (f.wait.status === CONFIRMED) parts.push(`대기 시간은 ${f.wait.value.approximate ? '약 ' : ''}${f.wait.value.minutes}분입니다.`);
  return parts.length ? `시뮬레이션에서 확인된 내용을 말씀드리겠습니다. ${parts.join(' ')} 감사합니다.` : '시뮬레이션에서 확인된 정보가 없습니다. 확인되지 않은 사항은 미확인으로 남기겠습니다.';
}

export function buildReport(state) {
  const symptom = symptomKorean(state.details.symptoms);
  return {
    simulation: true,
    label: 'Simulated call — fictional example; no real clinic contacted.',
    complete: FACTS.every(({ key }) => state.facts[key].status === CONFIRMED) && !state.pendingRelay,
    summary: russianSummary(state),
    facts: FACTS.map(({ key }) => ({ ...state.facts[key], display: displayFact(state.facts[key]), evidence: state.facts[key].evidence.map(item => ({ ...item })) })),
    pendingRelay: state.pendingRelay ? { ...state.pendingRelay, status: UNCLEAR } : null,
    sheets: {
      label: SHEET_LABEL,
      reception: `접수용: 나이: ${state.details.age}세 / 건강보험: ${state.details.insurance === 'none' ? '국민건강보험 없음' : '국민건강보험 있음'}.`,
      doctor: `진료용: 증상: ${symptom || `${state.details.symptoms} (사용자 입력 원문; 번역 미확인)`} / 증상 기간: ${state.details.duration}일.`,
    },
    readbackKorean: koreanReadback(state),
    transcript: state.transcript.map(entry => ({ ...entry })),
    limitations: [
      'Deterministic local Korean phrase matching; no general AI translation or real clinic verification.',
      'Typed and scripted input do not verify live microphone recognition.',
      'Value hypothesis: Unverified; no actual user feedback.',
    ],
  };
}

export function finishSession(state) {
  if (state.phase !== 'finished') {
    state.readbackKorean = koreanReadback(state);
    append(state, 'assistant', state.readbackKorean, 'ko', 'local-script');
    state.phase = 'finished';
    state.nextKorean = state.readbackKorean;
  }
  return buildReport(state);
}
