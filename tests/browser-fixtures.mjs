// All data is fictional. Browser speech shims below are synthetic test doubles.
// They must never be reported as microphone or audible speech verification.
export const RUSSIAN_REQUEST = 'Узнайте в этой детской клинике, принимает ли сегодня женщина-врач, принимают ли пациентов без корейской государственной медицинской страховки и сколько сейчас ждать.';

export const EXPECTED_SUMMARY = 'Клиника открыта. Женщина-врач сегодня не принимает, но доступен другой врач. Принимают без корейской государственной медицинской страховки. Консультация — примерно 20 000 вон. Сейчас ожидание — 15 минут.';

export const RECEPTIONIST_FIXTURE = [
  '네, 오늘 진료합니다.',
  '오늘 여자 의사 선생님은 진료하지 않습니다.',
  '다른 의사 선생님은 진료 가능합니다.',
  '국민건강보험이 없어도 진료받을 수 있습니다.',
  '진찰료는 약 2만 원입니다.',
  '지금 대기 시간은 15분입니다.',
];

export function installSyntheticSpeech({ denied = false, controlledRecognition = false, deferPermission = false } = {}) {
  const evidence = window.__browserTestEvidence = {
    source: 'Synthetic browser test doubles; no microphone or speakers used',
    spokenTexts: [], recognitionStarts: 0, recognitionStops: 0, recognitionAborts: 0, getUserMediaCalls: 0, tracks: [], permissionRequests: [], emittedResults: [],
    realMicrophoneVerified: false, audibleSpeechVerified: false,
  };
  class FakeUtterance extends EventTarget {
    constructor(text = '') { super(); this.text = text; this.lang = ''; this.rate = 1; }
  }
  const synthesisEvents = new EventTarget();
  let generation = 0;
  const voice = { name: 'Synthetic Korean test voice', lang: 'ko-KR', localService: true, default: false, voiceURI: 'synthetic-test-only' };
  const synthesis = {
    speaking: false, pending: false, paused: false,
    getVoices: () => [voice],
    addEventListener: (...args) => synthesisEvents.addEventListener(...args),
    removeEventListener: (...args) => synthesisEvents.removeEventListener(...args),
    cancel() { generation++; this.speaking = false; this.pending = false; },
    pause() { this.paused = true; },
    resume() { this.paused = false; },
    speak(utterance) {
      const token = generation;
      evidence.spokenTexts.push(utterance.text);
      this.speaking = true;
      queueMicrotask(() => {
        if (generation !== token) return;
        const event = new Event('start');
        utterance.dispatchEvent(event); utterance.onstart?.(event);
      });
      setTimeout(() => {
        if (generation !== token) return;
        this.speaking = false;
        const event = new Event('end');
        utterance.dispatchEvent(event); utterance.onend?.(event);
      }, 20);
    },
  };
  const instances = [];
  const pendingPermissions = [];
  class FakeRecognition extends EventTarget {
    constructor() { super(); this.lang = 'ko-KR'; this.continuous = false; this.interimResults = false; this.active = false; instances.push(this); }
    start() {
      evidence.recognitionStarts++;
      this.active = true;
      if (controlledRecognition) {
        queueMicrotask(() => { if (this.active) this.onstart?.(new Event('start')); });
      } else {
        setTimeout(() => {
          this.onerror?.({ error: denied ? 'not-allowed' : 'no-speech', message: 'Synthetic test error; no hardware capture' });
          this.end();
        }, 20);
      }
    }
    end() {
      if (!this.active) return;
      this.active = false;
      queueMicrotask(() => this.onend?.(new Event('end')));
    }
    stop() { evidence.recognitionStops++; this.end(); }
    abort() { evidence.recognitionAborts++; this.end(); }
  }
  const latest = index => instances[index ?? instances.length - 1];
  window.__syntheticSpeechControl = {
    emitResult(text, { final = true, index, late = false } = {}) {
      const instance = latest(index);
      if (!instance) throw new Error('No synthetic recognition instance');
      if (!instance.active && !late) throw new Error('Synthetic recognizer is not active');
      const result = [{ transcript: text, confidence: 0.99 }]; result.isFinal = final;
      evidence.emittedResults.push({ text, final, index: instances.indexOf(instance), late, synthetic: true });
      instance.onresult?.({ resultIndex: 0, results: [result] });
    },
    emitError(error = 'no-speech', index) { const instance = latest(index); instance.onerror?.({ error, message: 'Synthetic error' }); instance.end(); },
    end(index) { latest(index)?.end(); },
    allowPending() { for (const pending of pendingPermissions.splice(0)) { pending.evidence.state = 'synthetic-granted'; pending.resolve(); } },
    denyPending() { for (const pending of pendingPermissions.splice(0)) { pending.evidence.state = 'synthetic-denied'; pending.reject(new DOMException('Synthetic test denial', 'NotAllowedError')); } },
    instanceCount() { return instances.length; },
  };
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synthesis });
  Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: FakeRecognition });
  Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: FakeRecognition });
  if (navigator.mediaDevices) {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
      evidence.getUserMediaCalls++;
      const permission = { id: evidence.getUserMediaCalls, state: 'synthetic-pending' };
      evidence.permissionRequests.push(permission);
      if (!controlledRecognition || denied) {
        permission.state = 'synthetic-denied';
        throw new DOMException('Synthetic test denial; no permission settings changed', 'NotAllowedError');
      }
      if (deferPermission) await new Promise((resolve, reject) => pendingPermissions.push({ resolve, reject, evidence: permission }));
      else permission.state = 'synthetic-granted';
      const trackEvidence = { id: `synthetic-track-${permission.id}`, readyState: 'live', stopCalls: 0 };
      evidence.tracks.push(trackEvidence);
      const track = { kind: 'audio', get readyState() { return trackEvidence.readyState; }, stop() { trackEvidence.readyState = 'ended'; trackEvidence.stopCalls++; } };
      return { getTracks: () => [track], getAudioTracks: () => [track] };
    } });
  }
}
