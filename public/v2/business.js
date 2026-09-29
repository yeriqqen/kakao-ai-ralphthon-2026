// Real OpenAI Realtime WebRTC only. No browser speech synthesis or audio recording.
// Official GA references: https://developers.openai.com/api/docs/guides/voice-webrtc?api=realtime
// https://developers.openai.com/api/docs/guides/realtime-mcp
const $ = id => document.getElementById(id);
const roomId = new URLSearchParams(location.search).get('room') || '';
const token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
const endpoint = `/api/rooms/${encodeURIComponent(roomId)}`;
let state = null;
let peer = null;
let channel = null;
let microphone = null;
let generation = 0;
let accepting = false;
let closing = false;
let muted = false;
let connectionAnnounced = false;
let sessionReady = false;
let remoteTrackReady = false;
let playbackAllowed = false;
let openingPending = false;
let openingSent = false;
let openingResponseId = null;
let openingAudioStarted = false;
let openingAudioStopped = false;
let openingTimer = null;
let diagnosticTimer = null;
let diagnosticEvents = [];
let waitingTool = false;
let completingTool = false;
let endingAudio = false;
let goodbyeResponse = null;
let responseBusy = false;
let assistantSpeaking = false;
let speakingResponseId = null;
const pendingPlayback = new Set();
const drainedPlayback = new Set();
let continuationNeeded = false;
let activeResponseId = null;
let requestedResponseKind = null;
let activeResponseKind = null;
let cancellationPending = false;
let pendingToolCount = 0;
let waitNoticeActive = false;
let finishClosing = false;
const cancelledResponses = new Set();
let responseQueue = [];
let transcriptQueue = Promise.resolve();
let toolQueue = Promise.resolve();
let pollTimer = null;
let finishTimer = null;
let connectionTimer = null;
let pollFailures = 0;
let localFailure = '';
let stopped = false;
const toolCalls = new Set();
const seenVoiceMessages = new Set();
const savedTranscripts = new Set();
const turns = new Map();
const pendingTranscripts = new Map();
let businessSpeaking = false;
const terminal = new Set(['completed', 'interrupted', 'failed']);
const statusText = {
  idle: ['Waiting for customer · 고객 요청 대기', 'No incoming call yet', 'The customer must approve the proposed simulated call first. Your microphone is off.'],
  pending: ['Incoming simulated call · 수신 대기', 'The customer has authorized a call', 'Accept when you are ready. For the relay rehearsal, ask one unknown customer detail after the assistant’s opening question, before answering the service questions.'],
  connecting: ['Connecting · 연결 중', 'Connecting to OpenAI Realtime', 'Allow the microphone when your browser asks. Connection has not been verified yet.'],
  active: ['Live simulated call · 가상 통화 중', 'You can speak in Korean', 'Answer naturally as the fictional business. Watch the generated questions and tell the assistant when a detail is unclear.'],
  waiting_customer: ['Waiting for customer · 고객 답변 대기', 'The customer is being asked in chat', 'Microphone input is paused. The assistant will relay the customer’s answer in Korean.'],
  awaiting_decision: ['Customer decision needed · 고객 결정 대기', 'The conversation needs a decision', 'Microphone input is paused while the customer decides how to proceed. Unresolved questions remain unresolved.'],
  completed: ['Simulation completed · 완료', 'The simulated conversation has ended', 'The customer receives a conversation-grounded summary. This is not verification by a real business.'],
  interrupted: ['Call interrupted · 통화 중단', 'This was not a successful completion', 'Unresolved questions must remain visible in the customer’s chat.'],
  failed: ['Connection failed · 연결 실패', 'The voice connection could not continue', 'No successful call is claimed. Return to the customer chat to decide how to proceed.'],
};

function showError(message) { $('error').textContent = message; $('error').hidden = !message; }
function currentStatus() { return state?.call?.status || 'idle'; }
function live() { return peer?.connectionState === 'connected' && channel?.readyState === 'open' && connectionAnnounced; }
function syncMicrophone() {
  const enabled = live() && currentStatus() === 'active' && !openingPending && playbackAllowed && !responseBusy && !assistantSpeaking && pendingPlayback.size === 0 && !waitingTool && !state?.pendingRelay && !muted && !endingAudio && pendingToolCount === 0 && (businessSpeaking || pendingTranscripts.size === 0);
  microphone?.getAudioTracks().forEach(track => { track.enabled = enabled; });
  $('microphone-status').textContent = enabled ? 'Microphone live · 마이크 사용 중' : microphone ? 'Microphone paused · 마이크 일시 정지' : 'Microphone inactive · 마이크 꺼짐';
  $('mute-mic').textContent = muted ? 'Unmute microphone · 마이크 켜기' : 'Mute microphone · 마이크 끄기';
}
async function api(path = '', { method = 'GET', body, sdp = false, keepalive = false } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = sdp ? 'application/sdp' : 'application/json';
  const response = await fetch(endpoint + path, { method, headers, cache: 'no-store', keepalive, body: body === undefined ? undefined : sdp ? body : JSON.stringify(body) });
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try { const data = await response.json(); if (typeof data.error === 'string') message = data.error; else if (typeof data.error?.message === 'string') message = data.error.message; else if (typeof data.message === 'string') message = data.message; } catch {}
    const error = new Error(message); error.status = response.status; throw error;
  }
  if (sdp) return response.text();
  if (response.status === 204) return {};
  return response.json();
}
function post(path, body) { return api(path, { method: 'POST', body }); }
function flushDiagnostics() {
  clearTimeout(diagnosticTimer);
  if (!diagnosticEvents.length || !state?.call?.id) return;
  const events = diagnosticEvents.splice(0, 30);
  api('/diagnostics', { method: 'POST', body: { callId: state.call.id, events }, keepalive: true }).catch(() => {});
}
function diagnostic(type, details = {}) {
  diagnosticEvents.push({ type, at: new Date().toISOString(), ...details });
  if (diagnosticEvents.length >= 30) flushDiagnostics();
  else { clearTimeout(diagnosticTimer); diagnosticTimer = setTimeout(flushDiagnostics, 250); }
}
function finishOpening() {
  if (!openingPending || !openingAudioStopped || !playbackAllowed) return;
  openingPending = false; diagnostic('opening.finished'); render();
}
function playRemoteAudio() {
  const attempt = generation;
  // Do not await this promise before response.create: the remote stream may be
  // silent until the first response is requested.
  $('remote-audio').play().then(() => {
    if (attempt !== generation) return;
    playbackAllowed = true; $('play-audio').hidden = true; showError('');
    diagnostic('playback.allowed'); finishOpening(); syncMicrophone();
  }).catch(() => {
    if (attempt !== generation) return;
    playbackAllowed = false; $('play-audio').hidden = false;
    diagnostic('playback.blocked'); syncMicrophone();
    showError('Your browser blocked playback. Select “Play incoming audio” to hear the Korean assistant.');
  });
}
function maybeStartOpening() {
  if (!openingPending || openingSent || !sessionReady || !remoteTrackReady || !live() || currentStatus() !== 'active') return;
  openingSent = true; diagnostic('opening.requested');
  respond('Greet the fictional business briefly in Korean and immediately ask the first required question. Do not announce a long agenda. Wait for the business answer.', '', 'opening');
  render();
}
function renderQuestions() {
  const list = $('required-questions'); list.replaceChildren();
  const questions = state?.requiredQuestions || [];
  if (!questions.length) { const item = document.createElement('li'); item.className = 'empty'; item.textContent = 'The customer’s generated call plan will appear here.'; list.append(item); return; }
  for (const question of questions) {
    const item = document.createElement('li');
    const text = typeof question === 'string' ? question : question.questionKorean || question.korean || question.question || question.text || question.label || question.id;
    item.append(document.createTextNode(text || 'Required question'));
    if (question.text && question.text !== text) {
      const translation = document.createElement('span'); translation.className = 'question-translation';
      translation.textContent = question.text; item.append(translation);
    }
    const label = document.createElement('span');
    const resolved = ['answered', 'confirmed', 'resolved'].includes(question.status) || question.resolved === true;
    label.className = 'question-status' + (resolved ? ' resolved' : '');
    label.textContent = resolved ? 'Answered in simulation · 답변 확인' : 'Unresolved · 미확인';
    item.append(label); list.append(item);
  }
}
function render() {
  const status = localFailure ? 'failed' : currentStatus();
  const text = statusText[status] || statusText.idle;
  $('call-status').textContent = text[0];
  $('call-status').className = 'status' + (status === 'active' && live() ? ' active' : ['pending', 'connecting', 'waiting_customer', 'awaiting_decision'].includes(status) ? ' waiting' : ['failed', 'interrupted'].includes(status) ? ' failed' : '');
  $('call-heading').textContent = text[1]; $('call-detail').textContent = text[2];
  $('connection-label').textContent = live() ? 'OpenAI connection established' : accepting ? 'Connection not yet verified' : 'Not connected';
  if (openingPending && live()) {
    $('call-heading').textContent = 'Preparing the Korean opening';
    $('call-detail').textContent = 'Listen for the greeting and first question. Your microphone stays paused until the assistant finishes.';
    $('connection-label').textContent = openingAudioStarted ? 'Opening audio received · Listen, then reply' : 'Waiting for the assistant’s opening audio';
  }
  $('accept-call').hidden = status !== 'pending' || accepting || !!peer;
  $('accept-call').disabled = accepting || !isSecureContext || !navigator.mediaDevices?.getUserMedia;
  $('end-call').hidden = !peer && !accepting;
  $('mute-mic').hidden = !live() || terminal.has(status);
  const waiting = ['waiting_customer', 'awaiting_decision'].includes(status) || waitingTool;
  $('waiting-note').hidden = !waiting;
  $('waiting-note').textContent = status === 'awaiting_decision' ? 'The assistant cannot proceed yet. Waiting for the customer’s decision. · 고객의 결정을 기다리고 있습니다.' : 'Please wait while the assistant checks with the customer. Microphone input is paused. · 고객에게 확인 중입니다.';
  renderQuestions(); syncMicrophone();
}
function addTranscript(id, role, text) {
  const key = `${role}:${id}`;
  if (turns.has(key)) return;
  turns.set(key, { role, text });
  if (turns.size === 1) $('transcript').replaceChildren();
  const entry = document.createElement('div'); entry.className = `turn ${role}`;
  const label = document.createElement('span'); label.className = 'turn-label'; label.textContent = role === 'business' ? 'BUSINESS · 업체' : 'YOKOBU · AI ASSISTANT';
  const content = document.createElement('p'); content.lang = 'ko'; content.textContent = text;
  entry.append(label, content); $('transcript').append(entry); $('transcript').scrollTop = $('transcript').scrollHeight;
  $('transcript-count').textContent = `${turns.size} turns`;
}
function send(event) { if (channel?.readyState !== 'open') throw new Error('Realtime event channel is not connected.'); channel.send(JSON.stringify(event)); }
function isWaiting() { return waitingTool || ['waiting_customer', 'awaiting_decision'].includes(currentStatus()) || !!state?.pendingRelay; }
function pumpResponse() {
  if (responseBusy || assistantSpeaking || businessSpeaking || pendingPlayback.size || pendingTranscripts.size || pendingToolCount || channel?.readyState !== 'open' || !responseQueue.length) return;
  // A queued question must not resume after the server has decided to wait or end.
  responseQueue = responseQueue.filter(task => isWaiting() ? task.kind === 'wait' : currentStatus() === 'completed' ? task.kind === 'goodbye' : !terminal.has(currentStatus()) && task.kind !== 'wait');
  if (!responseQueue.length) return;
  const task = responseQueue.shift();
  const context = [task.instructions ? `APPLICATION CALL CONTROL: ${task.instructions}` : '', task.text].filter(Boolean).join('\n');
  if (context) send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: context }] } });
  responseBusy = true; requestedResponseKind = task.kind; activeResponseId = null;
  syncMicrophone();
  // Keep the server's full system instructions. Control messages do not replace them.
  send({ type: 'response.create', ...(['opening', 'wait', 'goodbye'].includes(task.kind) ? { response: { tool_choice: 'none', output_modalities: ['audio'] } } : task.kind === 'complete' ? { response: { tool_choice: { type: 'function', name: 'complete_call' } } } : {}) });
}
function respond(instructions = '', text = '', kind = 'normal') {
  if (['normal', 'continuation', 'complete'].includes(kind) && (isWaiting() || terminal.has(currentStatus()))) return;
  // Consecutive reviewed fragments update one pending reply with the latest state.
  // Tool results, customer relay updates and control responses remain separate.
  if (['continuation', 'complete'].includes(kind)) responseQueue = responseQueue.filter(task => !['continuation', 'complete'].includes(task.kind));
  responseQueue.push({ instructions, text, kind }); pumpResponse();
}
function continueAfterBusinessReview() {
  if (!continuationNeeded || businessSpeaking || pendingTranscripts.size || pendingToolCount || currentStatus() !== 'active' || isWaiting()) return;
  continuationNeeded = false;
  const unresolved = state.requiredQuestions.filter(question => question.status !== 'resolved');
  const action = unresolved.length
    ? `Only this next question remains the current target: ${unresolved[0].korean}. Do not re-ask questions marked resolved. If the business already attempted to answer this question but the transcript did not resolve it, briefly apologize for not catching that detail and ask one precise clarification. Do not claim it was confirmed, invent a number from unclear speech, or read back a complete result while any required question is unresolved.`
    : state.call.confirmedKeyDetails
      ? 'The server has retained every answer and validated the business confirmation of the full readback. Call complete_call now. Do not ask or read back the questions again.'
      : 'Every required question has a retained answer. Read back only those recorded facts once, ask whether they are correct, and wait. Do not collect the answers again or add facts beyond the retained answers.';
  respond(`Continue in Korean using the application state below as authoritative, even if earlier audio sounded different. ${action} If the latest business utterance asks for unknown customer information, address it through request_customer_detail before continuing the checklist.`, JSON.stringify({ requiredQuestions: state.requiredQuestions, confirmedKeyDetails: state.call.confirmedKeyDetails }), !unresolved.length && state.call.confirmedKeyDetails ? 'complete' : 'continuation');
}
function ensureWaitNotice() {
  if (waitNoticeActive || channel?.readyState !== 'open') return;
  waitNoticeActive = true;
  responseQueue = []; continuationNeeded = false;
  if (responseBusy && activeResponseKind !== 'wait') {
    cancellationPending = true;
    if (activeResponseId) cancelledResponses.add(activeResponseId);
    send({ type: 'response.cancel', ...(activeResponseId ? { response_id: activeResponseId } : {}) });
  }
  if (responseBusy || assistantSpeaking || pendingPlayback.size) send({ type: 'output_audio_buffer.clear' });
  respond('The application is waiting for customer information or a customer decision. Say once, briefly and politely in Korean, that you are checking with the customer and ask the business to wait. Then remain silent. Do not ask a business question or infer any customer answer.', '', 'wait');
}

function releasePeer() {
  ++generation; closing = true;
  clearTimeout(connectionTimer); clearTimeout(finishTimer); clearTimeout(openingTimer); flushDiagnostics();
  microphone?.getTracks().forEach(track => track.stop()); microphone = null;
  const oldChannel = channel; channel = null;
  const oldPeer = peer; peer = null;
  oldChannel?.close(); oldPeer?.close();
  $('remote-audio').pause(); $('remote-audio').srcObject = null;
  accepting = false; connectionAnnounced = false; waitingTool = false; responseBusy = false; assistantSpeaking = false; speakingResponseId = null; endingAudio = false; completingTool = false;
  responseQueue = []; activeResponseId = null; requestedResponseKind = null; activeResponseKind = null; cancellationPending = false;
  pendingPlayback.clear(); drainedPlayback.clear(); continuationNeeded = false;
  businessSpeaking = false;
  waitNoticeActive = false; finishClosing = false;
  sessionReady = false; remoteTrackReady = false; playbackAllowed = false; openingPending = false; openingSent = false; openingResponseId = null; openingAudioStarted = false; openingAudioStopped = false;
  for (const item of pendingTranscripts.values()) item.resolve();
  pendingTranscripts.clear();
  closing = false; render();
}
async function disconnect(reason, failed = true) {
  if (closing) return;
  if (failed) { localFailure = reason; showError(reason); }
  releasePeer();
  try { await post('/connection', { connected: false, reason }); } catch { showError(`${reason} The server could not be notified. The local microphone is off.`); }
  await pollOnce().catch(() => {});
}
async function finishPlayback() {
  if (!endingAudio || finishClosing) return;
  finishClosing = true;
  // The server has already validated the call evidence. Saving the optional
  // farewell must never hold the microphone or peer open after playback.
  releasePeer();
  post('/connection', { connected: false, reason: 'completed_audio_finished' }).catch(() => {});
}
function planGoodbye() {
  if (endingAudio) return;
  endingAudio = true; goodbyeResponse = null; responseQueue = []; syncMicrophone();
  respond('The application has authorized completion. Briefly thank the fictional business in Korean and end. Do not ask another question or call another tool.', '', 'goodbye');
  finishTimer = setTimeout(finishPlayback, 8000);
}

function trackPendingTranscript(id) {
  if (!id || pendingTranscripts.has(id)) return;
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  const timer = setTimeout(() => { resolve(); pendingTranscripts.delete(id); disconnect('The business audio transcript did not arrive in time. The call is interrupted rather than continuing without evidence.'); }, 30000);
  pendingTranscripts.set(id, { promise, arrived: () => clearTimeout(timer), resolve: () => { clearTimeout(timer); resolve(); } }); syncMicrophone();
}
function persistTranscript(id, role, text) {
  // Silence/noise may commit an audio item with an empty completed transcript.
  // It supplies no evidence, but it is not a missing transcription event.
  if (!text?.trim()) {
    if (role === 'business') { pendingTranscripts.get(id)?.resolve(); pendingTranscripts.delete(id); continueAfterBusinessReview(); pumpResponse(); syncMicrophone(); }
    return;
  }
  const key = `${role}:${id}`;
  if (savedTranscripts.has(key)) return;
  const eventGeneration = generation;
  savedTranscripts.add(key); addTranscript(id, role, text);
  if (role === 'business') { trackPendingTranscript(id); pendingTranscripts.get(id)?.arrived(); }
  transcriptQueue = transcriptQueue.then(async () => {
    if (eventGeneration !== generation) return;
    const next = await post('/transcript', { id, role, text });
    if (eventGeneration !== generation) return;
    if (role === 'business') { pendingTranscripts.get(id)?.resolve(); pendingTranscripts.delete(id); }
    applyState(next);
    // Server semantic review is authoritative. Automatic VAD responses are disabled.
    // A pending function already owns the next reply and will return its tool result.
    if (role === 'business' && currentStatus() === 'active' && !isWaiting() && pendingToolCount === 0 && state.voiceMessage?.sourceTranscriptId !== id) {
      continuationNeeded = true; continueAfterBusinessReview();
    }
    pumpResponse(); syncMicrophone();
  }).catch(async () => {
    if (eventGeneration === generation) await disconnect('Text evidence could not be saved. Voice stopped so the summary cannot silently omit this conversation.');
  });
}

async function runTool(event, eventGeneration) {
  if (eventGeneration !== generation) return;
  const callId = event.call_id;
  if (!callId || cancelledResponses.has(event.response_id)) return;
  const allowed = ['request_customer_detail', 'complete_call', 'cannot_proceed'];
  if (!allowed.includes(event.name)) {
    send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: callId, output: JSON.stringify({ ok: false, message: 'Unsupported application tool. Do not invent an outcome.' }) } });
    respond(); return;
  }
  let argumentsObject;
  try { argumentsObject = typeof event.arguments === 'string' ? JSON.parse(event.arguments) : event.arguments || {}; }
  catch { argumentsObject = null; }
  if (!argumentsObject || typeof argumentsObject !== 'object' || Array.isArray(argumentsObject)) {
    send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: callId, output: JSON.stringify({ ok: false, message: 'Invalid tool arguments. Ask for clarification.' }) } });
    respond(); return;
  }
  await Promise.all([...pendingTranscripts.values()].map(item => item.promise));
  await transcriptQueue;
  if (eventGeneration !== generation || channel?.readyState !== 'open') return;
  completingTool = event.name === 'complete_call';
  try {
    const result = await post('/tool', { name: event.name, arguments: argumentsObject, callId });
    if (eventGeneration !== generation || channel?.readyState !== 'open') return;
    if (result.pending) { waitingTool = true; syncMicrophone(); }
    send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(result) } });
    if (result.allowComplete === true) planGoodbye();
    else if (result.pending) ensureWaitNotice();
    else respond();
    await pollOnce();
  } finally { completingTool = false; }
}
function handleEvent(event) {
  if (['session.created', 'response.created', 'response.done', 'output_audio_buffer.started', 'output_audio_buffer.stopped', 'output_audio_buffer.cleared', 'error', 'input_audio_buffer.speech_started', 'input_audio_buffer.speech_stopped'].includes(event.type)) {
    diagnostic(event.type, { responseId: event.response?.id || event.response_id, status: event.response?.status, code: event.error?.code || event.response?.status_details?.error?.code });
  }
  if (event.type === 'session.created') { sessionReady = true; maybeStartOpening(); }
  if (event.type === 'response.created') {
    responseBusy = true; activeResponseId = event.response?.id || null;
    activeResponseKind = requestedResponseKind || 'normal'; requestedResponseKind = null;
    if (activeResponseKind === 'opening') openingResponseId = activeResponseId;
    if (cancellationPending && activeResponseId) cancelledResponses.add(activeResponseId);
    if (endingAudio && activeResponseKind === 'goodbye') goodbyeResponse = activeResponseId;
  }
  if (event.type === 'response.done') {
    const response = event.response || {};
    // Generation can finish before WebRTC announces playback. Reserve that
    // response until its own output-buffer drain event, including this ordering.
    const hasAudio = response.output?.some(item => item.content?.some(part => ['audio', 'output_audio'].includes(part.type)));
    if (response.id && hasAudio && response.status === 'completed' && !cancelledResponses.has(response.id) && !drainedPlayback.has(response.id)) pendingPlayback.add(response.id);
    if (response.status === 'completed' && !cancelledResponses.has(response.id)) {
      for (const item of response.output || []) if (item.type === 'function_call') enqueueTool({ ...item, response_id: response.id });
    }
    // A delayed done event from an old response must not unlock a newer response.
    if (response.id && response.id === activeResponseId) {
      responseBusy = false; activeResponseId = null; activeResponseKind = null; cancellationPending = false;
      if (response.status === 'failed') { disconnect('The OpenAI audio response failed. The call is interrupted.'); return; }
      pumpResponse();
      syncMicrophone();
    }
  }
  // A second utterance may start before review of the first one returns. Keep
  // capturing it, and do not respond until its transcript has also been reviewed.
  if (event.type === 'input_audio_buffer.speech_started') { businessSpeaking = true; syncMicrophone(); }
  if (event.type === 'input_audio_buffer.speech_stopped') {
    trackPendingTranscript(event.item_id); businessSpeaking = false; syncMicrophone();
  }
  if (event.type === 'input_audio_buffer.committed') trackPendingTranscript(event.item_id);
  if (event.type === 'conversation.item.input_audio_transcription.completed') persistTranscript(event.item_id || event.event_id, 'business', event.transcript);
  if (event.type === 'response.output_audio_transcript.done') persistTranscript(event.item_id || event.event_id, 'assistant', event.transcript);
  if (event.type === 'conversation.item.input_audio_transcription.failed') {
    pendingTranscripts.get(event.item_id)?.resolve(); pendingTranscripts.delete(event.item_id);
    disconnect('OpenAI could not transcribe the business audio. The call is interrupted; no answer is assumed.');
  }
  if (event.type === 'response.function_call_arguments.done') enqueueTool(event);
  if (event.type === 'response.output_item.done' && event.item?.type === 'function_call') enqueueTool({ ...event.item, response_id: event.response_id });
  if (event.type === 'output_audio_buffer.started') {
    if (event.response_id && drainedPlayback.has(event.response_id)) return;
    if (event.response_id) pendingPlayback.add(event.response_id);
    if (openingPending && event.response_id === openingResponseId) { openingAudioStarted = true; clearTimeout(openingTimer); }
    assistantSpeaking = true; speakingResponseId = event.response_id || null; syncMicrophone();
    $('connection-label').textContent = 'OpenAI audio is playing · Listen, then reply'; $('heard-korean').disabled = false;
  }
  if (['output_audio_buffer.stopped', 'output_audio_buffer.cleared'].includes(event.type)) {
    if (event.response_id) { pendingPlayback.delete(event.response_id); drainedPlayback.add(event.response_id); }
    else if (event.type === 'output_audio_buffer.cleared') { for (const id of pendingPlayback) drainedPlayback.add(id); pendingPlayback.clear(); }
    if (!event.response_id || event.response_id === speakingResponseId) { assistantSpeaking = false; speakingResponseId = null; }
    pumpResponse(); syncMicrophone();
  }
  if (event.type === 'output_audio_buffer.stopped') {
    if (openingPending && openingAudioStarted && event.response_id === openingResponseId) { openingAudioStopped = true; finishOpening(); }
    if (endingAudio && goodbyeResponse && event.response_id === goodbyeResponse) finishPlayback();
    else render();
  }
  if (event.type === 'error') {
    if (event.error?.code === 'response_cancel_not_active') {
      if (cancellationPending) { responseBusy = false; activeResponseId = null; activeResponseKind = null; cancellationPending = false; pumpResponse(); syncMicrophone(); }
      return;
    }
    disconnect('OpenAI Realtime reported an error. The call is interrupted; check the server’s sanitized error details.');
  }
}
function enqueueTool(event) {
  if (!event.call_id || toolCalls.has(event.call_id) || cancelledResponses.has(event.response_id)) return;
  toolCalls.add(event.call_id);
  continuationNeeded = false; responseQueue = responseQueue.filter(task => !['continuation', 'complete'].includes(task.kind));
  const eventGeneration = generation;
  pendingToolCount++; syncMicrophone();
  toolQueue = toolQueue.then(() => runTool(event, eventGeneration)).catch(() => {
    if (eventGeneration === generation) return disconnect('The application could not process a Realtime tool request. No successful completion is claimed.');
  }).finally(() => { pendingToolCount--; if (eventGeneration === generation) { syncMicrophone(); pumpResponse(); } });
}

function applyState(next) {
  const incoming = next.room || next;
  if (Number.isFinite(incoming.revision) && Number.isFinite(state?.revision) && incoming.revision < state.revision) return;
  const previousStatus = currentStatus();
  state = incoming;
  const status = currentStatus();
  if (status === 'pending' && previousStatus !== 'pending' && !peer && !accepting) { localFailure = ''; showError(''); }
  const voice = state.voiceMessage;
  const newVoiceMessage = voice?.id && voice.text && !seenVoiceMessages.has(voice.id);
  if (status === 'active' && !state.pendingRelay && (['waiting_customer', 'awaiting_decision'].includes(previousStatus) || newVoiceMessage)) { waitingTool = false; waitNoticeActive = false; }
  render();
  if (isWaiting()) ensureWaitNotice();
  if (newVoiceMessage && channel?.readyState === 'open' && status === 'active' && !isWaiting()) {
    seenVoiceMessages.add(voice.id);
    continuationNeeded = false; responseQueue = responseQueue.filter(task => !['continuation', 'complete'].includes(task.kind));
    respond('Relay this application-provided update naturally in polite Korean. Reuse the supplied customer information, then continue only the unresolved required questions.', `Application update from the customer chat:\n${voice.text}`);
  }
  if (status === 'completed' && peer && !completingTool && !endingAudio) planGoodbye();
  if (['interrupted', 'failed'].includes(status) && (peer || accepting)) releasePeer();
}

async function pollOnce() { const next = await api(); applyState(next); return state; }
async function pollLoop() {
  if (stopped) return;
  try { await pollOnce(); pollFailures = 0; }
  catch (error) {
    ++pollFailures;
    if ([401, 403, 404].includes(error.status)) { stopped = true; localFailure = 'This room link is missing, expired, or not authorized. Open the business link from the customer chat.'; showError(localFailure); releasePeer(); }
    else if (pollFailures >= 3 && (peer || accepting)) await disconnect('The shared call state is unavailable. The local microphone has been stopped.');
    else showError('Cannot refresh the shared call state. Checking the local server connection…');
  }
  if (!stopped) pollTimer = setTimeout(pollLoop, 1000);
}
async function acceptCall() {
  if (accepting || peer || currentStatus() !== 'pending') return;
  if (!isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) { showError('Voice requires a browser with microphone support on localhost or HTTPS.'); return; }
  accepting = true; localFailure = ''; showError(''); muted = false;
  openingPending = true; openingSent = false; openingAudioStarted = false; openingAudioStopped = false;
  $('heard-korean').checked = false; $('heard-korean').disabled = true;
  $('observation-status').textContent = 'Audible Korean: Unverified';
  const attempt = ++generation;
  render();
  let stream;
  try {
    await post('/accept', {});
    if (attempt !== generation) return;
    await pollOnce();
    diagnostic('call.accepted');
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    if (attempt !== generation || currentStatus() !== 'connecting') { stream.getTracks().forEach(track => track.stop()); return; }
    microphone = stream;
    microphone.getAudioTracks().forEach(track => { track.enabled = false; });
    const connection = new RTCPeerConnection(); peer = connection;
    connection.addEventListener('track', event => {
      if (attempt !== generation) return;
      $('audio-panel').hidden = false;
      $('remote-audio').srcObject = event.streams[0] || new MediaStream([event.track]);
      remoteTrackReady = true; diagnostic('remote.track'); playRemoteAudio(); maybeStartOpening();
    });
    connection.addEventListener('connectionstatechange', () => {
      if (attempt !== generation || closing) return;
      if (['failed', 'disconnected', 'closed'].includes(connection.connectionState)) disconnect(`WebRTC ${connection.connectionState}. The call is interrupted and microphone input has stopped.`);
      else { render(); maybeStartOpening(); }
    });
    stream.getTracks().forEach(track => connection.addTrack(track, stream));
    const events = connection.createDataChannel('oai-events'); channel = events;
    events.addEventListener('message', message => {
      if (attempt !== generation) return;
      try { handleEvent(JSON.parse(message.data)); } catch { disconnect('A Realtime event could not be processed. The call is interrupted.'); }
    });
    events.addEventListener('open', async () => {
      if (attempt !== generation) return;
      try {
        await post('/connection', { connected: true });
        if (attempt !== generation) return;
        connectionAnnounced = true; accepting = false; clearTimeout(connectionTimer);
        diagnostic('connection.registered');
        openingTimer = setTimeout(() => {
          if (attempt === generation && !openingAudioStarted) {
            diagnostic('opening.timeout');
            disconnect('The assistant’s opening audio did not start within 12 seconds. Return to the customer chat and select Retry this simulation.');
          }
        }, 12000);
        await pollOnce();
        maybeStartOpening();
      } catch { disconnect('The voice connection could not be registered with the customer chat.'); }
    });
    events.addEventListener('close', () => { if (attempt === generation && !closing) disconnect('The Realtime event channel disconnected.'); });
    events.addEventListener('error', () => { if (attempt === generation && !closing) disconnect('The Realtime event channel failed.'); });
    connectionTimer = setTimeout(() => { if (attempt === generation) disconnect('OpenAI voice connection timed out. Microphone input stopped.'); }, 30000);
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    const answer = await api('/realtime', { method: 'POST', sdp: true, body: connection.localDescription.sdp });
    if (attempt !== generation) return;
    await connection.setRemoteDescription({ type: 'answer', sdp: answer });
  } catch (error) {
    stream?.getTracks().forEach(track => track.stop());
    if (attempt !== generation) return;
    const message = error.name === 'NotAllowedError' ? 'Microphone permission was denied. No voice conversation started. Allow it in your browser only if you choose to retry.' : `Voice setup failed: ${error.message}`;
    await disconnect(message);
  }
}
$('accept-call').addEventListener('click', acceptCall);
$('end-call').addEventListener('click', () => disconnect('The business operator disconnected the simulated call.', false));
$('mute-mic').addEventListener('click', () => { muted = !muted; syncMicrophone(); });
$('play-audio').addEventListener('click', playRemoteAudio);
$('heard-korean').addEventListener('change', async () => {
  const audibleKorean = $('heard-korean').checked;
  try { await post('/observation', { audibleKorean, deviceLabel: $('device-label').value.trim() || 'Laptop business tab' }); $('observation-status').textContent = audibleKorean ? 'Audible Korean: confirmed by the human operator for this simulation.' : 'Audible Korean: Unverified'; }
  catch { $('heard-korean').checked = !audibleKorean; $('observation-status').textContent = 'The observation could not be saved. Please retry.'; }
});
window.addEventListener('pagehide', () => {
  stopped = true; clearTimeout(pollTimer);
  const wasConnected = !!peer || accepting;
  releasePeer();
  if (wasConnected) api('/connection', { method: 'POST', body: { connected: false, reason: 'Business tab closed or navigated away.' }, keepalive: true }).catch(() => {});
});
if (!roomId || !token) { stopped = true; showError('Open the business link from the customer chat. This page needs its room and access token; no microphone has been activated.'); }
else if (!/^[A-Za-z0-9_-]{1,160}$/.test(roomId) || token.length > 2048) { stopped = true; showError('This business room link is invalid. Open a new link from the customer chat.'); }
else { if (!isSecureContext) showError('Microphone access needs localhost or HTTPS.'); pollLoop(); }
