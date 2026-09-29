import { FIXTURE, SCRIPT, CALL_PLAN, createSession, beginSession, recordReceptionist, answerRelay, finishSession, buildReport } from './engine.js';

const $ = (id) => document.getElementById(id);
let session = null;
let report = null;
let request = '';
let recognition = null;
let micStream = null;
let listening = false;
let micPending = false;
let micAttempt = 0;
let inputSource = 'typed';
let lastRecognized = '';
let fixtureIndex = 0;
let activeKorean = '';
let speechEpoch = 0;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const audioEvidence = { recognitionSupported: !!SpeechRecognition, synthesisSupported: !!window.speechSynthesis, microphoneAttempts: 0, microphoneStreamsGranted: 0, recognitionResults: [], recognitionErrors: [], speechEvents: [], userConfirmedAudible: false, note: 'API events do not establish audible quality. Actual microphone and human feedback must be assessed separately.' };

function showStage(name) {
  document.querySelectorAll('.stage').forEach(el => { el.hidden = el.id !== name + '-stage'; });
  document.querySelectorAll('#steps li').forEach(el => el.classList.toggle('active', el.dataset.step === (name === 'result' ? 'call' : name)));
  $('global-status').textContent = '';
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function bubble(title, text, type = '') {
  if (!text) return;
  const el = document.createElement('div'); el.className = 'bubble ' + type;
  const label = document.createElement('span'); label.className = 'bubble-title'; label.textContent = title;
  const p = document.createElement('p'); p.textContent = text;
  el.append(label, p); $('conversation').append(el); $('conversation').scrollTop = $('conversation').scrollHeight;
}
function koreanVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  return voices.find(v => /^ko[-_]/i.test(v.lang) && v.localService) || voices.find(v => /^ko[-_]/i.test(v.lang));
}
function stopMic() {
  ++micAttempt; micPending = false;
  const previousRecognition = recognition; recognition = null;
  const previousStream = micStream; micStream = null;
  listening = false;
  if (previousRecognition) { try { previousRecognition.abort(); } catch { try { previousRecognition.stop(); } catch {} } }
  previousStream?.getTracks().forEach(track => track.stop());
  $('microphone').classList.remove('listening'); $('microphone').innerHTML = '<span aria-hidden="true">◉</span> 마이크로 답하기';
}
function speak(text) {
  activeKorean = text; $('korean-prompt').textContent = text;
  if (!text) return;
  stopMic();
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { $('speech-status').textContent = '한국어 음성 출력 미지원 · 텍스트만 표시됩니다. 음성 검증은 Unverified.'; return; }
  const voice = koreanVoice();
  if (!voice) { $('speech-status').textContent = '한국어 음성이 아직 준비되지 않았습니다. 잠시 후 다시 듣기를 눌러 주세요. 음성 검증은 Unverified.'; return; }
  const epoch = ++speechEpoch;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'ko-KR'; utterance.voice = voice; utterance.rate = .94;
  const item = { text, voice: voice.name, localService: voice.localService, requestedAt: new Date().toISOString(), started: false, ended: false };
  audioEvidence.speechEvents.push(item);
  utterance.onstart = () => { if (epoch !== speechEpoch) return; item.started = true; $('audio-indicator').textContent = '말하는 중'; $('speech-status').textContent = `한국어 음성 출력 중 · ${voice.name}`; };
  utterance.onend = () => { item.ended = true; if (epoch !== speechEpoch) return; $('audio-indicator').textContent = '응답 대기'; $('speech-status').textContent = '한국어 음성 재생 완료. 실제로 들렸는지는 팀원이 확인해 주세요.'; };
  utterance.onerror = (event) => { item.error = event.error; if (epoch !== speechEpoch) return; $('audio-indicator').textContent = '텍스트 모드'; $('speech-status').textContent = `음성 출력 실패 (${event.error}). 텍스트는 계속 확인할 수 있습니다.`; };
  window.speechSynthesis.speak(utterance);
}
function applyEvent(event) {
  if (event?.message) bubble('YOKOBU', event.message);
  const pending = session?.pendingRelay;
  $('relay-box').hidden = !pending;
  $('microphone').disabled = !!pending;
  $('send-receptionist').disabled = !!pending;
  $('receptionist-text').disabled = !!pending;
  if (pending) {
    const question = typeof pending === 'string' ? pending : pending.russian || pending.questionRu || pending.question || 'Новый вопрос клиники. Ответ пока неизвестен.';
    $('relay-question').textContent = question;
    $('user-call-status').textContent = 'Разговор приостановлен. Ответ не будет придуман.';
    $('relay-answer').focus();
  } else {
    $('user-call-status').textContent = 'Вы можете следить за разговором здесь — слушать и говорить не нужно.';
  }
  if (event?.korean) { bubble('YOKOBU · 한국어', event.korean, 'korean'); speak(event.korean + (event.resumeKorean ? ' ' + event.resumeKorean : '')); }
  updateFactProgress();
}
function updateFactProgress() {
  if (!session) return;
  const facts = buildReport(session).facts;
  const count = facts.filter(f => f.status === 'Confirmed in simulation').length;
  if (!session.pendingRelay) $('user-call-status').textContent = `Подтверждено в симуляции: ${count} из ${facts.length}. Вы можете читать весь разговор.`;
}
function renderList(target, values) {
  $(target).replaceChildren();
  values.forEach(value => { const li = document.createElement('li'); li.textContent = typeof value === 'string' ? value : value.korean || value.ko || JSON.stringify(value); $(target).append(li); });
}
renderList('call-plan', CALL_PLAN);
renderList('script-lines', [SCRIPT[0], SCRIPT[1], SCRIPT[2], '처음 방문하시나요? → 사용자의 러시아어 답변을 기다립니다.', ...SCRIPT.slice(3)]);
$('load-example').onclick = () => { $('request').value = FIXTURE.request; $('request-error').textContent = ''; $('request').focus(); };
$('request-form').onsubmit = event => {
  event.preventDefault(); request = $('request').value.trim();
  if (!request) { $('request-error').textContent = 'Напишите запрос или нажмите «Вставить пример».'; $('request').focus(); return; }
  if (!/врач|клиник|страхов|ждать|ожидани/i.test(request)) { $('request-error').textContent = 'Этот демо-сценарий поддерживает запрос о враче, страховке и ожидании в детской клинике. Нажмите «Вставить пример».'; return; }
  $('request-preview').textContent = request; showStage('details'); $('age').focus();
};
$('fill-details').onclick = () => { $('age').value = '7'; $('insurance').value = 'none'; $('symptoms').value = 'кашель'; $('duration').value = '2'; $('details-error').textContent = ''; };
$('details-form').onsubmit = event => {
  event.preventDefault();
  try {
    if (!$('age').value || !$('duration').value || !$('symptoms').value || !$('insurance').value) throw new Error('Укажите возраст, симптомы, длительность и наличие страховки. Можно заполнить вымышленным примером.');
    session = createSession({ request, age: Number($('age').value), symptoms: $('symptoms').value, duration: Number($('duration').value), insurance: $('insurance').value });
    showStage('plan'); $('start-simulation').focus();
  } catch (error) { $('details-error').textContent = error.message; }
};
$('start-simulation').onclick = () => {
  showStage('call'); bubble('ВЫ · ВЫМЫШЛЕННЫЙ ЗАПРОС', request, 'user');
  bubble('YOKOBU', 'Начинаем симуляцию. Если клиника спросит о том, чего мы ещё не знаем, я передам вопрос вам.');
  applyEvent(beginSession(session));
  if (!SpeechRecognition) $('mic-status').textContent = '음성 인식 미지원. Chrome에서 열거나 명시적 텍스트 대체 입력을 사용하세요. 마이크 검증: Unverified.';
};
$('repeat-speech').onclick = () => speak(activeKorean);
$('receptionist-text').addEventListener('input', () => { if (listening || micPending) stopMic(); inputSource = lastRecognized ? 'microphone-edited' : 'typed'; $('input-provenance').textContent = lastRecognized ? '음성 인식 결과를 수정했습니다. 수정된 입력으로 기록됩니다.' : '직접 입력 · 텍스트 대체 입력으로 기록됩니다.'; });
$('microphone').onclick = async () => {
  if (listening || micPending) { stopMic(); $('mic-status').textContent = '마이크 입력을 멈췄습니다. 임시 결과는 직접 수정하거나 다시 인식해 주세요.'; return; }
  if (!SpeechRecognition || !navigator.mediaDevices?.getUserMedia) { $('mic-status').textContent = '마이크 음성 인식을 지원하지 않는 환경입니다. Chrome의 localhost에서 열어 주세요. 텍스트 대체는 마이크 검증이 아닙니다.'; return; }
  const attempt = ++micAttempt;
  const activeSession = session;
  const isCurrentAttempt = () => attempt === micAttempt && session === activeSession && session?.phase === 'conversation' && !session.pendingRelay;
  micPending = true;
  ++audioEvidence.microphoneAttempts;
  $('receptionist-text').value = ''; lastRecognized = ''; inputSource = 'typed';
  $('input-provenance').textContent = '새 마이크 입력 대기 중 · 이전 인식 결과는 사용하지 않습니다.';
  window.speechSynthesis?.cancel(); ++speechEpoch; $('audio-indicator').textContent = '듣기 준비';
  $('mic-status').textContent = '마이크 접근 권한을 확인하는 중… 다시 누르면 취소됩니다.';
  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    ++audioEvidence.microphoneStreamsGranted;
    if (!isCurrentAttempt()) { stream.getTracks().forEach(track => track.stop()); return; }
    micStream = stream;
    const currentRecognition = new SpeechRecognition(); recognition = currentRecognition;
    currentRecognition.lang = 'ko-KR'; currentRecognition.continuous = false; currentRecognition.interimResults = true;
    const isCurrent = () => isCurrentAttempt() && recognition === currentRecognition;
    let finalText = '';
    const recordedFinalIndices = new Set();
    currentRecognition.onstart = () => {
      if (!isCurrent()) return;
      micPending = false; listening = true;
      $('microphone').classList.add('listening'); $('microphone').innerHTML = '<span aria-hidden="true">■</span> 듣기 중 · 중지'; $('mic-status').textContent = '한국어로 말씀해 주세요. 완료 후 문장을 확인하고 전달하세요.';
    };
    currentRecognition.onresult = event => {
      if (!isCurrent()) return;
      const finals = []; const interims = [];
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finals.push(result[0].transcript);
          if (!recordedFinalIndices.has(i)) {
            recordedFinalIndices.add(i);
            audioEvidence.recognitionResults.push({ text: result[0].transcript, confidence: result[0].confidence, at: new Date().toISOString() });
          }
        } else interims.push(result[0].transcript);
      }
      finalText = finals.join(' ').trim();
      const interim = interims.join(' ').trim();
      const displayed = [finalText, interim].filter(Boolean).join(' ');
      $('receptionist-text').value = displayed;
      lastRecognized = displayed; inputSource = interim ? 'microphone-interim' : finalText ? 'microphone' : 'typed';
      $('input-provenance').textContent = interim ? '인식 중인 임시 결과 · 아직 확정되지 않았습니다.' : '마이크 음성 인식 결과 · 내용을 확인한 후 전달하세요.';
    };
    currentRecognition.onerror = event => {
      if (!isCurrent()) return;
      audioEvidence.recognitionErrors.push({ error: event.error, at: new Date().toISOString() });
      const hints = { 'not-allowed': '마이크 권한이 거부되었습니다. 주소창의 사이트 설정에서 직접 허용한 뒤 다시 시도하세요.', 'service-not-allowed': '브라우저 음성 서비스 사용이 허용되지 않았습니다.', network: '음성 인식 서비스에 연결할 수 없습니다. 인터넷 연결과 브라우저 음성 서비스를 확인해 주세요.', 'no-speech': '말소리가 인식되지 않았습니다. 다시 시도해 주세요.', 'audio-capture': '마이크를 사용할 수 없습니다. 연결된 입력 장치를 확인해 주세요.' };
      stopMic();
      $('mic-status').textContent = (hints[event.error] || `음성 인식 실패: ${event.error}.`) + ' 답변은 생성되지 않았습니다. 명시적 텍스트 대체 입력을 사용할 수 있습니다.';
    };
    currentRecognition.onend = () => {
      if (!isCurrent()) return;
      recognition = null; stopMic();
      if (inputSource === 'microphone-interim') $('mic-status').textContent = '임시 결과만 남았습니다. 직접 수정하거나 다시 인식해 주세요. 답변은 전달되지 않았습니다.';
      else if (finalText) $('mic-status').textContent = '인식 완료. 텍스트를 확인하고 «이 답변 전달하기»를 눌러 주세요.';
      else $('mic-status').textContent = '인식된 문장이 없습니다. 다시 시도하거나 직접 입력해 주세요.';
    };
    currentRecognition.start();
  } catch (error) {
    if (!isCurrentAttempt()) { stream?.getTracks().forEach(track => track.stop()); return; }
    audioEvidence.recognitionErrors.push({ error: error.name, at: new Date().toISOString() }); stopMic();
    $('mic-status').textContent = error.name === 'NotAllowedError' ? '마이크 권한이 거부되었습니다. 사이트 설정에서 직접 허용한 뒤 재시도하세요. 답변은 생성되지 않았습니다.' : `마이크를 시작할 수 없습니다 (${error.name}). 답변은 생성되지 않았습니다.`;
  }
};
$('receptionist-form').onsubmit = event => {
  event.preventDefault(); const text = $('receptionist-text').value.trim();
  if (!text) { $('mic-status').textContent = '먼저 말하거나 가상 답변을 입력해 주세요. 빈 답변은 전달되지 않습니다.'; return; }
  if (inputSource === 'microphone-interim') { $('mic-status').textContent = '음성 인식이 확정될 때까지 기다리거나 문장을 직접 수정해 주세요.'; return; }
  stopMic();
  try {
    const result = recordReceptionist(session, text, inputSource);
    bubble(inputSource === 'microphone' ? 'АДМИНИСТРАТОР · МИКРОФОН' : 'АДМИНИСТРАТОР · ТЕКСТОВЫЙ ВВОД', text, 'receptionist');
    $('receptionist-text').value = ''; lastRecognized = ''; inputSource = 'typed'; $('input-provenance').textContent = '직접 입력은 텍스트 대체 입력으로 기록됩니다.';
    applyEvent(result);
  } catch (error) { $('mic-status').textContent = error.message; }
};
$('relay-form').onsubmit = event => {
  event.preventDefault(); const text = $('relay-answer').value.trim();
  if (!text) { $('relay-error').textContent = 'Введите ответ. Пока вы не ответите, разговор приостановлен.'; return; }
  try {
    const result = answerRelay(session, text);
    if (session.pendingRelay) { $('relay-error').textContent = result.message || 'Ответ не распознан. Для этого примера напишите «Да» или «Нет».'; return; }
    bubble('ВЫ · ОТВЕТ КЛИНИКЕ', text, 'user'); $('relay-answer').value = ''; $('relay-error').textContent = ''; applyEvent(result);
  } catch (error) { $('relay-error').textContent = error.message; }
};
const fixtureScript = [SCRIPT[0], SCRIPT[1], SCRIPT[2], '처음 방문하시나요?', ...SCRIPT.slice(3)];
$('insert-fixture').onclick = () => {
  if (session.pendingRelay) { $('mic-status').textContent = '사용자의 러시아어 응답을 먼저 기다려 주세요.'; return; }
  if (fixtureIndex >= fixtureScript.length) { $('mic-status').textContent = '가상 대본이 끝났습니다. 결과를 확인할 수 있습니다.'; return; }
  stopMic();
  $('receptionist-text').value = fixtureScript[fixtureIndex++]; inputSource = 'synthetic-fixture'; lastRecognized = '';
  $('input-provenance').textContent = '합성 데모 문장 · 실제 마이크 입력 아님.';
};
function renderReport() {
  report = { ...buildReport(session), audioEvidence, generatedAt: new Date().toISOString(), evidenceWarning: 'Fictional simulation only. Rule-based language mapping; browser speech integration. No real clinic was contacted.' };
  $('summary').textContent = report.summary;
  $('result-heading').textContent = report.complete ? 'Всё важное — перед вами.' : 'Есть неуточнённые детали.';
  $('unresolved-relay').hidden = !report.pendingRelay;
  $('unresolved-relay').textContent = report.pendingRelay ? `Unclear — ${report.pendingRelay.russian} Ответ пользователя не получен; мы его не предполагали.` : '';
  $('fact-list').replaceChildren();
  for (const fact of report.facts) {
    const el = document.createElement('div'); el.className = 'fact' + (fact.status === 'Unclear' ? ' unclear' : '');
    const heading = document.createElement('h3'); heading.textContent = fact.label;
    const value = document.createElement('p'); value.className = 'fact-value'; value.textContent = fact.value == null ? 'Неясно' : String(fact.display || fact.value);
    const status = document.createElement('span'); status.className = 'fact-status'; status.textContent = fact.status;
    const evidence = document.createElement('p'); evidence.className = 'evidence';
    const quotes = (Array.isArray(fact.evidence) ? fact.evidence : fact.evidence ? [fact.evidence] : []).map(x => typeof x === 'string' ? x : x.text || x.quote || JSON.stringify(x));
    evidence.textContent = quotes.length ? 'Основание: ' + quotes.join(' · ') : 'Нет однозначного ответа в разговоре.';
    el.append(heading, value, status, evidence); $('fact-list').append(el);
  }
  $('readback-text').textContent = session.readbackKorean || '';
  const sheetText = value => typeof value === 'string' ? value : Array.isArray(value) ? value.join('\n') : JSON.stringify(value);
  $('reception-sheet').textContent = sheetText(report.sheets.reception);
  $('doctor-sheet').textContent = sheetText(report.sheets.doctor);
  const micCount = report.transcript.filter(t => t.source === 'microphone').length;
  $('verification-note').textContent = `Вымышленная симуляция. Передано реплик с микрофона: ${micCount}. Другие способы ввода отмечены отдельно. Общая языковая модель и реальный телефон не подключены. Пользовательская ценность: Unverified.`;
}
$('finish-simulation').onclick = () => { stopMic(); finishSession(session); renderReport(); showStage('result'); speak(session.readbackKorean); };
$('repeat-readback').onclick = () => speak(session.readbackKorean);
$('heard-korean').onchange = () => { audioEvidence.userConfirmedAudible = $('heard-korean').checked; };
$('print-sheets').onclick = () => window.print();
$('download-report').onclick = async () => {
  renderReport();
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'yokobu-simulated-result.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  try {
    const response = await fetch('/api/evidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) });
    if (!response.ok) throw new Error();
    const saved = await response.json(); $('global-status').textContent = `Результат сохранён локально: ${saved.path}. Аудиозаписи не создаются.`;
  } catch { $('global-status').textContent = 'Файл скачан в браузере. Серверная копия недоступна.'; }
};
$('restart').onclick = () => { stopMic(); window.speechSynthesis?.cancel(); location.reload(); };
window.addEventListener('pagehide', () => { stopMic(); window.speechSynthesis?.cancel(); });
