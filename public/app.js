import { translations } from './i18n.js';
const $ = id => document.getElementById(id);
const icon = name => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.classList.add('icon'); svg.setAttribute('aria-hidden', 'true'); const use = document.createElementNS(svg.namespaceURI, 'use'); use.setAttribute('href', `#i-${name}`); svg.append(use); return svg; };
const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
const readStored = (storage, key, fallback) => { try { return JSON.parse(storage.getItem(key)) || fallback; } catch { return fallback; } };
let profile = readStored(localStorage, 'yokobu-profile', { language: 'en', name: '', location: '', preferences: '' });
let language = ['en', 'ru', 'ko'].includes(profile.language) ? profile.language : 'en';
let records = readStored(sessionStorage, 'yokobu-conversation', []);
if (!Array.isArray(records)) records = [];
let status = { connected: false, calling: false }; let busy = false; let controller; let activeView = 'home'; let toastTimer; let currentAction; let pendingMessage = '';
let followLatest = true;
const t = key => translations[language][key] || translations.en[key] || key;
const storageWrite = (storage, key, value) => { try { storage.setItem(key, JSON.stringify(value)); } catch {} };
function persist() { storageWrite(sessionStorage, 'yokobu-conversation', records.slice(-60)); }
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 4500); }
async function api(url, data, signal) {
  const res = await fetch(url, { method: data === undefined ? 'GET' : 'POST', headers: data === undefined ? {} : { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data), signal });
  const result = await res.json(); if (!res.ok) throw Object.assign(new Error(result.error || t('failed')), { status: res.status }); return result;
}
function setLanguage(value) {
  language = value; profile.language = value; document.documentElement.lang = value; $('language').value = value;
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll('[data-placeholder]').forEach(node => node.placeholder = t(node.dataset.placeholder));
  document.querySelectorAll('[data-aria]').forEach(node => node.setAttribute('aria-label', t(node.dataset.aria)));
  $('language').setAttribute('aria-label', t('language'));
  $('location-label').textContent = profile.location || t('setLocation');
  if ($('remember-profile').checked) storageWrite(localStorage, 'yokobu-profile', profile);
  renderConnection(); renderActivity(); updateContextButton();
  api('/api/profile', profile).catch(() => {});
}
function renderConnection() {
  $('connection-status').textContent = t(status.connected ? 'connected' : 'notConnected');
  $('phone-status').textContent = t(status.calling ? 'callsOn' : 'callsOff');
  $('ai-dot').classList.toggle('connected', status.connected); $('connection-dot').classList.toggle('connected', status.connected);
}
function showView(view) {
  activeView = view;
  document.body.dataset.view = view;
  $('home').hidden = view !== 'home'; $('conversation-view').hidden = view !== 'conversation'; $('activity-view').hidden = view !== 'activity'; $('chat-composer-slot').hidden = view !== 'conversation';
  if (view === 'home') $('home-composer-slot').append($('composer'));
  if (view === 'conversation') $('chat-composer-slot').append($('composer'));
  $('composer').hidden = view === 'activity';
  $('nav-home').classList.toggle('active', view !== 'activity'); $('nav-activity').classList.toggle('active', view === 'activity');
  $('nav-home').setAttribute('aria-current', view !== 'activity' ? 'page' : 'false');
  $('nav-activity').setAttribute('aria-current', view === 'activity' ? 'page' : 'false');
  $('latest-message').hidden = true;
  if (view === 'activity') renderActivity();
}
const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
function scrollBottom() {
  followLatest = true; $('latest-message').hidden = true;
  if (activeView === 'conversation') requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: motion() }));
}
function updateContextButton() {
  const hasContext = Boolean(profile.name || profile.location || profile.preferences);
  $('context-button').classList.toggle('has-context', hasContext);
  const text = $('context-button').querySelector('span');
  text.dataset.i18n = hasContext ? 'contextReady' : 'yourContext'; text.textContent = t(text.dataset.i18n);
}
function button(text, className, action) { const b = el('button', className, text); b.type = 'button'; b.addEventListener('click', action); return b; }
function label(tag, className, key) { const node = el(tag, className, t(key)); node.dataset.i18n = key; return node; }
function uiButton(key, className, action, iconName) { const b = button('', className, action); if (iconName) b.append(icon(iconName)); b.append(label('span', '', key)); return b; }
function safeUrl(url) { try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null; } catch { return null; } }
function link(text, url, className) { const a = el('a', className, text); a.href = safeUrl(url) || '#'; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
// Plain text plus safe Markdown links; model text is never inserted as HTML.
function richText(text) {
  const p = el('div', 'message-text'); const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g; let last = 0;
  for (const match of String(text).matchAll(pattern)) { p.append(document.createTextNode(text.slice(last, match.index))); p.append(link(match[1], match[2])); last = match.index + match[0].length; }
  p.append(document.createTextNode(String(text).slice(last))); return p;
}
function addRecord(record) {
  const shouldFollow = followLatest;
  record.createdAt ||= Date.now(); records.push(record); persist();
  const node = renderRecord(record); renderActivity();
  if (activeView !== 'conversation') return;
  if (shouldFollow) requestAnimationFrame(() => node.scrollIntoView({ block: record.role === 'assistant' ? 'start' : 'end', behavior: motion() }));
  else $('latest-message').hidden = false;
}
function renderRecord(record) {
  const node = el('article', `message ${record.role}`);
  node.id = `message-${records.indexOf(record)}`;
  if (record.role === 'user') node.textContent = record.text;
  else {
    const assistantLabel = el('div', 'assistant-label'); assistantLabel.append(icon('spark'), document.createTextNode('yokobu')); node.append(assistantLabel);
    const r = record.result || { message: record.text || '' }; node.append(richText(r.message || ''));
    if (r.question) node.append(el('p', 'question', r.question));
    if (r.choices?.length) { const choices = el('div', 'choices'); r.choices.forEach(c => choices.append(button(c, 'choice', () => send(c)))); node.append(choices); }
    if (r.places?.length) {
      const places = el('div', 'places');
      r.places.forEach(p => {
        const card = el('div', 'place'); const heading = el('div', 'place-heading'); heading.append(el('h3', '', p.name));
        if (safeUrl(p.url)) { const a = link('', p.url); a.setAttribute('aria-label', `${t('source')}: ${p.name}`); a.title = t('source'); a.append(icon('link')); heading.append(a); }
        card.append(heading, el('p', 'place-detail', p.detail));
        if (p.address) { const address = el('p', 'place-meta address'); address.append(icon('pin'), el('span', '', p.address)); card.append(address); }
        if (p.phone) { const phone = el('p', 'place-meta'); phone.append(icon('phone'), el('span', '', p.phone)); card.append(phone); }
        card.append(label('p', 'listing-note', 'listing')); places.append(card);
      }); node.append(places);
    }
    (r.actions || []).forEach(action => {
      const card = el('div', 'action-card'); card.append(label('div', 'action-status', 'readyReview'), el('h3', '', action.title), el('p', 'action-recipient', `${action.business} · ${action.phone}`));
      if (action.purpose) card.append(el('p', '', action.purpose));
      card.append(uiButton('review', 'primary', () => reviewCall(action), 'phone')); node.append(card);
    });
    if (r.summary) {
      const s = r.summary; const card = el('section', 'summary-card'); const heading = el('div', 'summary-heading'); heading.append(icon('note'), el('h3', '', s.title)); card.append(heading);
      const facts = el('ul'); (s.facts || []).forEach(f => facts.append(el('li', '', f))); card.append(facts);
      if (s.nextSteps?.length) { card.append(label('h4', '', 'nextSteps')); const steps = el('ol'); s.nextSteps.forEach(x => steps.append(el('li', '', x))); card.append(steps); }
      if (s.korean) {
        const header = el('div', 'korean-heading'); header.append(label('h4', '', 'korean'), uiButton('copy', 'text-button', async () => { try { await navigator.clipboard.writeText(s.korean); toast(t('copied')); } catch { toast(t('failed')); } }, 'copy'));
        const ko = el('div', 'korean-note', s.korean); ko.lang = 'ko'; card.append(header, ko);
      }
      node.append(card);
    }
    if (r.sources?.length) {
      const sources = el('div', 'sources'); sources.append(label('span', 'sources-label', 'sources'));
      r.sources.forEach(s => { if (safeUrl(s.url)) { const a = link('', s.url, 'source'); a.title = s.title || s.url; a.append(el('span', '', s.title || new URL(s.url).hostname), icon('link')); sources.append(a); } }); node.append(sources);
    }
    if (r.suggestions?.length) { const suggestions = el('div', 'suggestions'); r.suggestions.forEach(s => { const b = button('', 'suggestion', () => send(s)); b.append(el('span', '', s), icon('right')); suggestions.append(b); }); node.append(suggestions); }
  }
  $('messages').append(node); return node;
}
function renderActivity() {
  const list = $('activity-list'); list.replaceChildren();
  const first = records.find(r => r.role === 'user');
  if (!first) { const empty = el('div', 'empty-state'); empty.append(icon('clock'), el('p', '', t('emptyActivity')), uiButton('startConversation', 'secondary', () => { showView('home'); window.scrollTo({ top: 0, behavior: motion() }); })); list.append(empty); return; }
  const b = button('', 'activity-item', () => { showView('conversation'); scrollBottom(); }); const text = el('span'); text.append(el('strong', '', first.text.slice(0, 110)), el('small', '', t('currentTask'))); const arrow = icon('right'); arrow.classList.add('activity-arrow'); b.append(icon('clock'), text, arrow); list.append(b);
  records.filter(r => r.result?.summary).forEach(r => {
    const item = button('', 'activity-item', () => { showView('conversation'); followLatest = false; requestAnimationFrame(() => $(`message-${records.indexOf(r)}`)?.scrollIntoView({ block: 'start', behavior: motion() })); });
    const body = el('span'); body.append(el('strong', '', r.result.summary.title), el('small', '', t('savedSummary'))); const arrow = icon('right'); arrow.classList.add('activity-arrow'); item.append(icon('note'), body, arrow); list.append(item);
  });
}
function setBusy(value) { busy = value; $('send-button').disabled = busy || !$('request').value.trim(); $('progress').hidden = !busy; $('messages').setAttribute('aria-busy', String(busy)); $('new-task').disabled = busy; document.querySelectorAll('.choice,.suggestion').forEach(b => b.disabled = busy); }
async function send(message, { fromVoice = false, repeat = false } = {}) {
  message = String(message).trim(); if (!message || busy) return null;
  if (!status.connected) { pendingMessage = message; $('request').value = message; openSettings('connection'); toast(t('connectFirst')); return null; }
  if (message.length > 8000) { toast(t('failed')); return null; }
  showView('conversation'); if (!fromVoice) followLatest = true; if (!repeat && !fromVoice) addRecord({ role: 'user', text: message });
  $('request').value = ''; $('request').style.height = ''; setBusy(true); $('progress-label').textContent = t('thinking'); if (!fromVoice || followLatest) scrollBottom();
  controller = new AbortController(); let finalResult = null; let received = false;
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, profile }), signal: controller.signal });
    if (!res.ok) { const err = await res.json(); throw Object.assign(new Error(err.error || t('failed')), { status: res.status }); }
    const decoder = new TextDecoder(); let buffer = '';
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue; const event = JSON.parse(line);
        if (event.type === 'status') $('progress-label').textContent = t(event.stage);
        if (event.type === 'error') throw new Error(event.error);
        if (event.type === 'result') { received = true; finalResult = event.result; addRecord({ role: 'assistant', result: event.result }); }
      }
    }
    if (!received) throw new Error(t('noReply'));
  } catch (error) {
    if (error.status === 503) { status.connected = false; pendingMessage = message; renderConnection(); openSettings('connection'); }
    const messageText = error.name === 'AbortError' ? t('stopped') : error.message;
    const box = el('div', 'error-message', messageText); box.setAttribute('role', 'alert'); box.append(button(t('retry'), 'text-button', () => { box.remove(); send(message, { repeat: true, fromVoice }); })); $('messages').append(box); scrollBottom();
    finalResult = { error: messageText };
  } finally { setBusy(false); controller = null; }
  return finalResult;
}
function openSettings(tab = 'profile') {
  api('/api/status').then(value => { status = value; renderConnection(); }).catch(() => {});
  $('profile-name').value = profile.name || ''; $('profile-location').value = profile.location || ''; $('profile-preferences').value = profile.preferences || '';
  selectSettingsTab(tab); if (!$('settings').open) { $('settings').showModal(); $('settings-title').focus({ preventScroll: true }); }
}
function selectSettingsTab(tab) {
  $('profile-form').hidden = tab !== 'profile'; $('connection-panel').hidden = tab !== 'connection';
  for (const name of ['profile', 'connection']) {
    const button = $(name + '-tab'); const selected = tab === name;
    button.classList.toggle('selected', selected); button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
  }
}
function reviewCall(action) {
  currentAction = action; $('call-review').replaceChildren(); $('call-error').textContent = '';
  for (const [key, value] of [['recipient', action.business], ['phone', action.phone], ['purpose', action.purpose], ['shared', action.detailsToShare]]) { const dl = el('dl', 'call-review-field'); dl.append(el('dt', '', t(key)), el('dd', '', value)); $('call-review').append(dl); }
  if (safeUrl(action.sourceUrl)) $('call-review').append(link(t('source'), action.sourceUrl, 'text-button'));
  $('approve-call').textContent = t(status.calling ? 'approveCall' : 'setupCalling'); $('approve-call').disabled = false; $('call-sheet').showModal(); $('call-title').focus({ preventScroll: true });
}
let callPoll;
function renderCall(call, node) {
  node.replaceChildren(); node.append(el('h3', '', call.business));
  node.append(el('p', '', `${call.phone} · ${call.status}`)); if (call.error) node.append(el('p', 'field-error', call.error));
  const details = el('details'); details.append(el('summary', '', t('liveTranscript')));
  const transcript = el('div', 'call-transcript'); let speaker = '';
  for (const line of call.transcript || []) { if (line.speaker !== speaker) { transcript.append(document.createTextNode('\n' + (line.speaker === 'business' ? '접수' : 'YOKOBU') + ': ')); speaker = line.speaker; } transcript.append(document.createTextNode(line.text)); }
  details.append(transcript); node.append(details);
  if (!call.endedAt && call.status !== 'failed') node.append(button(t('endCall'), 'secondary', async () => { try { const result = await api(`/api/calls/${encodeURIComponent(call.id)}/end`, {}); renderCall(result.call, node); } catch (e) { toast(e.message); } }));
  else node.append(button(t('summary'), 'primary', async event => { event.currentTarget.disabled = true; try { const result = await api(`/api/calls/${encodeURIComponent(call.id)}/summary`, {}); addRecord({ role: 'assistant', result: result.result }); } catch (e) { toast(e.message); event.currentTarget.disabled = false; } }));
}
async function watchCall(call) {
  const node = el('section', 'call-live'); $('messages').append(node); renderCall(call, node); scrollBottom();
  const poll = async () => {
    try { const result = await api(`/api/calls/${encodeURIComponent(call.id)}`); call = result.call; renderCall(call, node); if (call.endedAt || call.status === 'failed') {
      try { sessionStorage.removeItem('yokobu-active-call'); } catch {}
      try { const summary = await api(`/api/calls/${encodeURIComponent(call.id)}/summary`, {}); addRecord({ role: 'assistant', result: summary.result }); node.querySelector('.primary')?.remove(); }
      catch (error) { toast(error.message); }
      return;
    } }
    catch (e) { node.append(el('p', 'field-error', e.message)); }
    callPoll = setTimeout(poll, 2500);
  }; callPoll = setTimeout(poll, 2500);
}

let voice; let voiceGeneration = 0;
function endVoice() {
  voiceGeneration++; const old = voice; voice = null;
  if (old) { clearTimeout(old.timeout); old.abort.abort(); old.stream?.getTracks().forEach(track => track.stop()); old.channel?.close(); old.pc?.close(); }
  $('voice-audio').pause(); $('voice-audio').srcObject = null; $('voice-audio').hidden = true; $('voice-sheet').classList.remove('connected'); if ($('voice-sheet').open) $('voice-sheet').close();
}
function voiceText(role, text) {
  if (!text?.trim()) return;
  const p = el('p'); p.append(el('span', 'speaker', role === 'user' ? t('you') : 'YOKOBU'), document.createTextNode(text)); $('voice-transcript').append(p); $('voice-transcript').scrollTop = $('voice-transcript').scrollHeight;
  addRecord({ role, ...(role === 'user' ? { text } : { result: { message: text } }) });
  api('/api/voice-context', { role, text }).catch(() => {});
}
async function startVoice() {
  if (!status.connected) { openSettings('connection'); toast(t('connectFirst')); return; }
  if (busy) { toast(t('thinking')); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) { toast(t('voiceUnavailable')); return; }
  endVoice(); const generation = voiceGeneration; const session = { abort: new AbortController(), seen: new Set() }; voice = session;
  $('voice-status').textContent = t('connecting'); $('voice-transcript').replaceChildren(); $('voice-sheet').showModal();
  const current = () => voice === session && voiceGeneration === generation;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    if (!current()) { stream.getTracks().forEach(track => track.stop()); return; } session.stream = stream;
    const pc = new RTCPeerConnection(); session.pc = pc;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.ontrack = async event => { if (!current()) return; $('voice-audio').srcObject = event.streams[0] || new MediaStream([event.track]); try { await $('voice-audio').play(); } catch { $('voice-audio').hidden = false; } };
    pc.onconnectionstatechange = () => { if (current() && ['failed', 'disconnected'].includes(pc.connectionState)) { endVoice(); toast(t('voiceFailure')); } };
    const channel = pc.createDataChannel('oai-events'); session.channel = channel;
    const sendEvent = event => { if (current() && channel.readyState === 'open') channel.send(JSON.stringify(event)); };
    channel.onopen = () => { if (!current()) return; clearTimeout(session.timeout); $('voice-sheet').classList.add('connected'); $('voice-status').textContent = t('listening'); sendEvent({ type: 'response.create', response: { instructions: 'Briefly greet the user in their chosen language and ask how you can help. If you have context, acknowledge it briefly. Do not repeat a full introduction.' } }); };
    channel.onclose = () => { if (current()) { endVoice(); toast(t('voiceFailure')); } };
    channel.onmessage = async ({ data }) => {
      if (!current()) return; let event; try { event = JSON.parse(data); } catch { return; }
      if (event.type === 'conversation.item.input_audio_transcription.completed') voiceText('user', event.transcript);
      if (event.type === 'response.output_audio_transcript.done') voiceText('assistant', event.transcript);
      if (event.type === 'input_audio_buffer.speech_started') $('voice-status').textContent = t('listening');
      if (event.type === 'response.function_call_arguments.done' && event.name === 'concierge' && !session.seen.has(event.call_id)) {
        session.seen.add(event.call_id); let result;
        try { const args = JSON.parse(event.arguments); $('voice-status').textContent = t('thinking'); result = await send(args.request, { fromVoice: true }); }
        catch { result = { error: t('failed') }; }
        if (!current()) return;
        sendEvent({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: event.call_id, output: JSON.stringify(result || { error: 'The concierge is busy. Ask the user to wait.' }) } });
        sendEvent({ type: 'response.create' }); $('voice-status').textContent = t('listening');
      }
      if (event.type === 'error') { endVoice(); toast(t('voiceFailure')); }
    };
    session.timeout = setTimeout(() => { if (current()) { endVoice(); toast(t('voiceFailure')); } }, 35000);
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    if (!current()) return;
    const result = await api('/api/realtime', { sdp: offer.sdp, profile }, session.abort.signal);
    if (!current()) return;
    await pc.setRemoteDescription({ type: 'answer', sdp: result.sdp });
  } catch (error) { if (!current()) return; endVoice(); if (error.status === 503) { status.connected = false; renderConnection(); openSettings('connection'); } toast(error.name === 'NotAllowedError' ? t('micDenied') : error.message); }
}

$('home-composer-slot').append($('composer'));
// Measure the real controls so growing drafts and mobile keyboards never cover content.
function syncViewport() {
  const viewport = window.visualViewport;
  const focused = document.activeElement?.matches('input, textarea, select');
  const inset = viewport && viewport.scale === 1 ? Math.max(0, innerHeight - viewport.height - viewport.offsetTop) : 0;
  document.documentElement.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`);
  document.documentElement.style.setProperty('--viewport-height', `${Math.round(viewport?.height || innerHeight)}px`);
  document.body.classList.toggle('keyboard-open', Boolean(focused && inset > 120));
}
new ResizeObserver(() => {
  const height = $('composer').getBoundingClientRect().height;
  if (height) document.documentElement.style.setProperty('--composer-height', `${Math.ceil(height)}px`);
}).observe($('composer'));
new ResizeObserver(() => {
  const dock = document.querySelector('.bottom-nav'); const bottom = parseFloat(getComputedStyle(dock).bottom) || 0;
  document.documentElement.style.setProperty('--dock-height', `${Math.ceil(dock.getBoundingClientRect().height + bottom)}px`);
}).observe(document.querySelector('.bottom-nav'));
window.visualViewport?.addEventListener('resize', syncViewport);
window.visualViewport?.addEventListener('scroll', syncViewport);
window.addEventListener('resize', syncViewport);
document.addEventListener('focusin', syncViewport); document.addEventListener('focusout', () => requestAnimationFrame(syncViewport));
window.addEventListener('scroll', () => {
  if (activeView !== 'conversation') return;
  followLatest = window.scrollY + innerHeight >= document.documentElement.scrollHeight - 180;
  if (followLatest) $('latest-message').hidden = true;
}, { passive: true });
$('latest-message').addEventListener('click', scrollBottom);
const syncDialogs = () => {
  const open = [...document.querySelectorAll('dialog')].some(dialog => dialog.open);
  document.body.classList.toggle('has-modal', open);
  $('nav-you').classList.toggle('active', $('settings').open);
  $('nav-home').classList.toggle('active', !$('settings').open && activeView !== 'activity');
  $('nav-activity').classList.toggle('active', !$('settings').open && activeView === 'activity');
  for (const id of ['nav-home', 'nav-activity', 'nav-you']) $(id).setAttribute('aria-current', $(id).classList.contains('active') ? 'page' : 'false');
};
for (const dialog of document.querySelectorAll('dialog')) {
  new MutationObserver(syncDialogs).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const targets = [...dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex]')]
      .filter(node => node.tabIndex >= 0 && node.getClientRects().length > 0);
    if (!targets.length) { event.preventDefault(); return; }
    const first = targets[0]; const last = targets.at(-1); const focused = document.activeElement;
    if (event.shiftKey && (focused === first || !targets.includes(focused))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (focused === last || !dialog.contains(focused))) { event.preventDefault(); first.focus(); }
  });
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) {
      if (dialog.id === 'voice-sheet') endVoice(); else dialog.close();
    }
  });
}
for (const name of ['profile', 'connection']) $(name + '-tab').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault(); const target = event.key === 'Home' ? 'profile' : event.key === 'End' ? 'connection' : name === 'profile' ? 'connection' : 'profile';
  selectSettingsTab(target); $(target + '-tab').focus();
});
syncViewport();
$('remember-profile').checked = Boolean(readStored(localStorage, 'yokobu-profile', null));
$('language').addEventListener('change', event => setLanguage(event.target.value));
$('local-time').textContent = 'SEOUL  ' + new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }).format(new Date());
$('composer').addEventListener('submit', event => { event.preventDefault(); send($('request').value); });
$('request').addEventListener('input', () => { $('send-button').disabled = busy || !$('request').value.trim(); $('request').style.height = 'auto'; $('request').style.height = Math.min($('request').scrollHeight, 180) + 'px'; });
$('request').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && matchMedia('(min-width: 720px)').matches) { event.preventDefault(); send($('request').value); } });
document.querySelectorAll('[data-starter]').forEach(b => b.addEventListener('click', () => send(t(b.dataset.starter + 'Prompt'))));
$('stop-request').addEventListener('click', () => controller?.abort());
$('context-button').addEventListener('click', () => openSettings()); $('location-chip').addEventListener('click', () => { openSettings(); $('profile-location').focus(); });
$('nav-you').addEventListener('click', () => openSettings()); $('nav-home').addEventListener('click', () => { showView(records.length ? 'conversation' : 'home'); scrollBottom(); }); $('nav-activity').addEventListener('click', () => { showView('activity'); window.scrollTo({ top: 0, behavior: motion() }); });
$('brand-home').addEventListener('click', event => { event.preventDefault(); showView(records.length ? 'conversation' : 'home'); scrollBottom(); });
$('profile-tab').addEventListener('click', () => selectSettingsTab('profile')); $('connection-tab').addEventListener('click', () => selectSettingsTab('connection'));
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => $(b.dataset.close).close()));
$('settings').addEventListener('close', () => { $('api-key').value = ''; });
$('profile-form').addEventListener('submit', async event => {
  event.preventDefault(); const updated = { name: $('profile-name').value.trim(), location: $('profile-location').value.trim(), preferences: $('profile-preferences').value.trim(), language };
  const save = event.submitter; if (save) save.disabled = true;
  try { await api('/api/profile', updated); profile = updated; if ($('remember-profile').checked) storageWrite(localStorage, 'yokobu-profile', profile); else localStorage.removeItem('yokobu-profile'); $('location-label').textContent = profile.location || t('setLocation'); updateContextButton(); $('settings').close(); toast(t('saved')); } catch (e) { toast(e.message); } finally { if (save) save.disabled = false; }
});
$('forget-profile').addEventListener('click', async () => { try { const empty = { name: '', location: '', preferences: '', language }; await api('/api/profile', empty); profile = empty; localStorage.removeItem('yokobu-profile'); $('remember-profile').checked = false; updateContextButton(); openSettings(); $('location-label').textContent = t('setLocation'); toast(t('forgotten')); } catch (e) { toast(e.message); } });
$('connection-form').addEventListener('submit', async event => {
  event.preventDefault(); $('connect-button').disabled = true; $('connection-error').textContent = ''; const key = $('api-key').value.trim(); $('api-key').value = '';
  try { await api('/api/connect', { key }); status.connected = true; renderConnection(); $('settings').close(); toast(t('keyConnected')); if (pendingMessage) { const msg = pendingMessage; pendingMessage = ''; await send(msg); } }
  catch (error) { $('connection-error').textContent = error.message; } finally { $('connect-button').disabled = false; }
});
$('new-task').addEventListener('click', async () => { if (busy) { toast(t('thinking')); return; } endVoice(); try { await api('/api/reset', {}); records = []; persist(); $('messages').replaceChildren(); $('request').value = ''; $('send-button').disabled = true; showView('home'); window.scrollTo({ top: 0 }); } catch (e) { toast(e.message); } });
$('export-task').addEventListener('click', () => {
  if (!records.length) return toast(t('notesEmpty'));
  const text = records.map(r => r.role === 'user' ? `You: ${r.text}` : `YOKOBU: ${r.result?.message || ''}\n${r.result?.summary ? JSON.stringify(r.result.summary, null, 2) : ''}\n${(r.result?.sources || []).map(s => `${s.title}: ${s.url}`).join('\n')}`).join('\n\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'yokobu-notes.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('approve-call').addEventListener('click', async () => {
  if (!status.calling) { $('call-sheet').close(); openSettings('connection'); return; }
  $('approve-call').disabled = true; $('call-error').textContent = '';
  try { const result = await api('/api/calls', { actionId: currentAction.id, approved: true }); $('call-sheet').close(); storageWrite(sessionStorage, 'yokobu-active-call', result.call.id); await watchCall(result.call); }
  catch (e) { $('call-error').textContent = e.message; } finally { $('approve-call').disabled = false; }
});
$('voice-button').addEventListener('click', startVoice); $('end-voice').addEventListener('click', endVoice); $('close-voice').addEventListener('click', endVoice);
$('voice-sheet').addEventListener('cancel', event => { event.preventDefault(); endVoice(); });
window.addEventListener('pagehide', () => { controller?.abort(); endVoice(); clearTimeout(callPoll); });
window.addEventListener('focus', () => { api('/api/status').then(value => { status = value; renderConnection(); }).catch(() => {}); });
setLanguage(language); records.forEach(renderRecord); showView(records.length ? 'conversation' : 'home');
try { status = await api('/api/status'); renderConnection(); const id = readStored(sessionStorage, 'yokobu-active-call', null); if (id) { const result = await api(`/api/calls/${encodeURIComponent(id)}`); showView('conversation'); watchCall(result.call); } } catch { toast(t('failed')); }
