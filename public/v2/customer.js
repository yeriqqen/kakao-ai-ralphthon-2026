import { languages, languageNames, translate } from './i18n.js';

const $ = (id) => document.getElementById(id);
const STORAGE = 'yokobu.v2.customer';
const liveStates = new Set(['pending', 'connecting', 'active', 'waiting_customer', 'awaiting_decision']);
const connectedStates = new Set(['active', 'waiting_customer', 'awaiting_decision']);
let language = 'en', credentials = null, state = null, config = null;
let sending = false, polling = false, online = true, selectedInstitution = '', localError = '', pendingText = '';
let lastMessagesSignature = '', lastContextSignature = '', generation = 0, dialogAction = null;
const t = (key, values) => translate(language, key, values);

try {
  const saved = JSON.parse(sessionStorage.getItem(STORAGE));
  if (saved?.id && saved?.customerToken && languages.includes(saved.language)) {
    credentials = saved; language = saved.language;
  }
} catch { /* A missing or invalid tab session starts a fresh conversation. */ }

function node(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined && content !== null) element.textContent = String(content);
  return element;
}
function button(label, action, className = 'secondary-button', disabled = false) {
  const result = node('button', className, label); result.type = 'button'; result.disabled = disabled;
  result.addEventListener('click', action); return result;
}
function section(title, className = '') {
  const result = node('section', `message-section ${className}`); if (title) result.append(node('h2', '', title)); return result;
}
function setError(code = 'UNKNOWN') { localError = code; render(); }
function saveCredentials() {
  try { if (credentials) sessionStorage.setItem(STORAGE, JSON.stringify(credentials)); else sessionStorage.removeItem(STORAGE); } catch { /* Room remains usable in this tab without persistence. */ }
}
async function api(path, body, { auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && credentials?.customerToken) headers.Authorization = `Bearer ${credentials.customerToken}`;
  let response;
  try { response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' }); }
  catch { throw Object.assign(new Error('CONNECTION_FAILED'), { code: 'CONNECTION_FAILED' }); }
  let result;
  try { result = await response.json(); } catch { throw Object.assign(new Error('CONNECTION_FAILED'), { code: 'CONNECTION_FAILED' }); }
  if (!response.ok) {
    const code = result.error?.code || result.code || (response.status === 401 ? 'UNAUTHORIZED' : response.status === 404 ? 'NOT_FOUND' : 'UNKNOWN');
    throw Object.assign(new Error(code), { code });
  }
  return result;
}
function applyState(value) {
  const next = value?.state ?? value;
  if (!next || next.id !== credentials?.id) return;
  if (state && Number.isFinite(next.version) && next.version < state.version) return;
  state = next; online = true;
  if (pendingText && state.messages?.some((message) => message.role === 'user' && message.text === pendingText)) pendingText = '';
  const list = state.institutions || [];
  if (!list.some((institution) => institution.id === selectedInstitution)) selectedInstitution = list[0]?.id || '';
  render();
}
async function loadConfiguration() {
  config = null; render();
  try { config = await api('/api/config', undefined, { auth: false }); }
  catch (error) { config = { configured: false }; localError = error.code; }
  render();
}
async function refreshRoom() {
  if (!credentials || polling) return;
  polling = true; const requestGeneration = generation;
  try { const result = await api(`/api/rooms/${encodeURIComponent(credentials.id)}`); if (requestGeneration === generation) applyState(result); }
  catch (error) { if (requestGeneration === generation) { online = false; if (['NOT_FOUND', 'UNAUTHORIZED'].includes(error.code)) localError = error.code; render(); } }
  finally { polling = false; }
}
async function mutate(action, body) {
  if (sending || !credentials) return;
  sending = true; localError = ''; render(); const requestGeneration = generation;
  try { const value = await api(`/api/rooms/${encodeURIComponent(credentials.id)}/${action}`, body); if (requestGeneration === generation) applyState(value); }
  catch (error) { if (requestGeneration === generation) { if (error.code === 'CONNECTION_FAILED') online = false; localError = error.code; } }
  finally { sending = false; render(); }
}
async function sendMessage(event) {
  event.preventDefault();
  const message = $('message-input').value.trim();
  if (!message) return setError('INVALID_INPUT');
  if (sending || state?.busy) return setError('BUSY');
  if (!config?.configured) return setError('CONFIG_REQUIRED');
  sending = true; localError = ''; pendingText = message; $('message-input').value = ''; resizeComposer(); render();
  try {
    if (!credentials) {
      const room = await api('/api/rooms', { language }, { auth: false });
      credentials = { id: room.id, customerToken: room.customerToken, businessToken: room.businessToken, language };
      saveCredentials(); applyState(room.state);
    }
    applyState(await api(`/api/rooms/${encodeURIComponent(credentials.id)}/chat`, { message }));
  } catch (error) {
    pendingText = ''; $('message-input').value = message; resizeComposer(); localError = error.code;
    if (error.code === 'CONNECTION_FAILED') online = false;
  } finally { sending = false; render(); $('message-input').focus(); }
}
function businessLink() {
  if (!credentials?.businessToken || !credentials?.id) return '';
  // The business token stays in a fragment, never a query or a request log.
  const link = new URL('/business', config?.publicBaseUrl || location.origin);
  link.searchParams.set('room', credentials.id); link.hash = `token=${encodeURIComponent(credentials.businessToken)}`;
  return link.href;
}
function renderMessages() {
  const messages = state?.messages || [];
  const signature = JSON.stringify([messages, pendingText, language, state?.summary]);
  if (signature === lastMessagesSignature) return;
  const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 220;
  lastMessagesSignature = signature; const fragment = document.createDocumentFragment();
  for (const message of messages) {
    if (!['user', 'assistant'].includes(message.role) || !message.text) continue;
    // The current result is rendered once, with its separate recommendation
    // and reasoning below. Earlier call summaries remain in chat history.
    if (message.kind === 'summary' && state?.summary && message.text === [state.summary.text, state.summary.recommendation, state.summary.reasoning].join('\n\n')) continue;
    const article = node('article', `message ${message.role}`); article.dataset.messageId = message.id || '';
    article.append(node('p', 'message-label', t(message.role === 'user' ? 'you' : 'assistant')), node('p', 'message-content', message.text)); fragment.append(article);
  }
  if (pendingText) { const article = node('article', 'message user pending'); article.append(node('p', 'message-content', pendingText)); fragment.append(article); }
  $('messages').replaceChildren(fragment);
  if (nearBottom || pendingText) requestAnimationFrame(() => $('scroll-anchor').scrollIntoView({ block: 'end', behavior: 'auto' }));
}
function questionDetails() {
  const questions = state?.requiredQuestions || [];
  if (!questions.length) return null;
  const details = node('details', 'question-details');
  details.open = Boolean(state.planReady && state.call?.status === 'idle');
  details.append(node('summary', '', `${t('questions')} · ${t('questionProgress', { resolved: questions.filter((q) => q.status === 'resolved').length, total: questions.length })}`));
  const list = node('ol', 'question-list');
  for (const question of questions) {
    const li = node('li'); li.append(node('span', '', question.text));
    if (question.answer) li.append(node('p', 'answer', question.answer));
    li.append(node('span', `question-status ${question.status === 'resolved' ? 'resolved' : ''}`, t(question.status === 'resolved' ? 'resolved' : 'unresolved'))); list.append(li);
  }
  details.append(list); return details;
}
function renderContext() {
  const signature = JSON.stringify([state, language, selectedInstitution, sending, online, config?.publicBaseUrl]);
  if (signature === lastContextSignature) return;
  lastContextSignature = signature; const fragment = document.createDocumentFragment();
  if (!state) { $('context').replaceChildren(); return; }
  const status = state.call?.status || 'idle';
  if (state.planReady && status === 'idle') {
    const plan = section(t('plan')); plan.append(node('p', 'fictional-note', t('fictional')));
    const institutions = state.institutions || [];
    if (institutions.length) {
      const options = node('fieldset', 'institution-options'); options.append(node('legend', '', t('chooseInstitution')));
      for (const institution of institutions) {
        const label = node('label', 'institution-option'); const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'institution'; radio.value = institution.id; radio.checked = selectedInstitution === institution.id; radio.disabled = sending;
        radio.addEventListener('change', () => { selectedInstitution = institution.id; render(); });
        const copy = node('span'); copy.append(node('strong', '', institution.name), node('p', '', institution.reason)); label.append(radio, copy); options.append(label);
      }
      plan.append(options);
    } else plan.append(node('p', 'muted', t('noInstitution')));
    const questions = questionDetails(); if (questions) plan.append(questions);
    plan.append(node('p', '', t('permission')));
    plan.append(button(t('yes'), () => mutate('authorize', { institutionId: selectedInstitution }), 'primary-button', sending || state.busy || !selectedInstitution || !online));
    fragment.append(plan);
  } else if (state.requiredQuestions?.length) {
    const block = section(); block.append(questionDetails()); fragment.append(block);
  }
  if (state.pendingRelay?.question) {
    const relay = section(t('relayTitle'), 'relay'); relay.append(node('p', 'relay-question', state.pendingRelay.question), node('p', 'muted', t('relayHelp'))); fragment.append(relay);
  }
  if (status === 'awaiting_decision' || state.decisionPrompt) {
    const decision = section(t('decisionTitle'), 'decision'); if (state.decisionPrompt) decision.append(node('p', '', state.decisionPrompt));
    const actions = node('div', 'button-row'); actions.append(button(t('continueCall'), () => mutate('decision', { action: 'continue' }), 'primary-button', sending || !online), button(t('stopCall'), () => mutate('decision', { action: 'end' }), 'secondary-button', sending || !online)); decision.append(actions); fragment.append(decision);
  }
  if (credentials?.businessToken) {
    const business = section(t('businessTitle')); business.append(node('p', 'business-instructions', t('businessHelp')));
    const actions = node('div', 'button-row'); const link = businessLink();
    if (link) {
      const open = node('a', 'secondary-button link-button', t('openBusiness')); open.href = link; open.target = '_blank'; open.rel = 'noopener noreferrer'; actions.append(open);
      actions.append(button(t('copyLink'), async (event) => { const target = event.currentTarget; try { await navigator.clipboard.writeText(link); target.textContent = t('copied'); } catch { setError('COPY_FAILED'); } }, 'quiet-button'));
    }
    if (liveStates.has(status)) actions.append(button(t('endCall'), () => confirmAction('end'), 'quiet-button', sending));
    if (['interrupted', 'failed'].includes(status) && state.planReady && selectedInstitution) actions.append(button(t('retryCall'), () => mutate('authorize', { institutionId: selectedInstitution }), 'primary-button', sending || state.busy || !online));
    business.append(actions, node('p', 'muted', t('linkNotice'))); fragment.append(business);
  }
  if (state.summary) {
    const result = section(t('result'));
    result.append(node('p', 'fictional-note', t('simulation')));
    if ((state.requiredQuestions || []).some((question) => question.status !== 'resolved')) result.append(node('p', 'fictional-note', t('unresolvedWarning')));
    if (state.summary.text && !state.messages?.some((message) => message.role === 'assistant' && message.text === state.summary.text)) result.append(node('p', 'summary-text', state.summary.text));
    if (state.summary.recommendation) { result.append(node('h3', '', t('recommendation')), node('p', 'recommendation-text', typeof state.summary.recommendation === 'string' ? state.summary.recommendation : state.summary.recommendation.text || '')); }
    if (state.summary.reasoning) result.append(node('h3', '', t('reasoning')), node('p', 'recommendation-text', state.summary.reasoning));
    fragment.append(result);
  }
  if (state.customerInfo?.length) {
    const block = section(); const details = node('details'); details.append(node('summary', '', t('supplied'))); const list = node('ul', 'detail-list');
    for (const item of state.customerInfo) list.append(node('li', '', item.value)); details.append(list); block.append(details); fragment.append(block);
  }
  if (['completed', 'interrupted', 'failed'].includes(status) || state.summary) {
    const evidence = section(); evidence.append(button(t('export'), downloadEvidence, 'secondary-button', sending), node('p', 'muted', t('exportHelp'))); fragment.append(evidence);
  }
  $('context').replaceChildren(fragment);
}
function render() {
  document.documentElement.lang = language; document.title = t('title');
  for (const [id, key] of Object.entries({ subtitle:'subtitle', 'new-chat':'newChat', 'simulation-label':'simulation', 'welcome-title':'welcome', 'welcome-intro':'intro', 'language-label':'chooseLanguage', starter:'starter', 'shop-starter':'shopStarter', 'text-note':'textOnly', working:'thinking', 'dismiss-error':'closeError' })) $(id).textContent = t(key);
  $('fixed-language').textContent = credentials ? t('selectedLanguage', { language: languageNames[language] }) : '';
  $('welcome').hidden = Boolean(credentials || pendingText);
  const picker = document.createDocumentFragment();
  for (const choice of languages) { const item = button(languageNames[choice], () => { if (!credentials) { language = choice; localError = ''; render(); } }, 'language-button'); item.setAttribute('aria-pressed', String(choice === language)); item.lang = choice; picker.append(item); }
  $('language-options').replaceChildren(picker);
  $('message-input').placeholder = t('placeholder'); $('message-input').setAttribute('aria-label', t('placeholder'));
  $('send').textContent = t(sending ? 'sending' : 'send'); $('send').disabled = sending || Boolean(state?.busy);
  $('new-chat').disabled = sending;
  $('working').hidden = !(sending || state?.busy);
  $('configuration').hidden = Boolean(config?.configured);
  if (!config?.configured) {
    const fragment = document.createDocumentFragment();
    if (!config) fragment.append(node('p', '', t('configUnknown')));
    else fragment.append(node('h2', '', t('configTitle')), node('p', '', t('configBody')), button(t('refresh'), loadConfiguration, 'quiet-button'));
    $('configuration').replaceChildren(fragment);
  }
  const status = state?.call?.status || 'idle'; const showCall = credentials && status !== 'idle';
  $('call-state').hidden = !showCall;
  const green = online && state?.call?.connected === true && connectedStates.has(status);
  const unresolvedCompletion = status === 'completed' && state?.requiredQuestions?.some((question) => question.status !== 'resolved');
  $('call-state').className = `call-state${green ? ' is-active' : ''}${(!online || ['failed', 'interrupted'].includes(status) || unresolvedCompletion) ? ' is-failed' : ''}`;
  $('call-state-text').textContent = !online ? t('offline') : unresolvedCompletion ? t('unresolvedWarning') : t(connectedStates.has(status) && !state?.call?.connected ? 'connecting' : status);
  const error = localError || state?.error?.code || (!online ? 'CONNECTION_FAILED' : '');
  $('error').hidden = !error; $('error-text').textContent = error ? t(error) : '';
  renderMessages(); renderContext();
}
function confirmAction(action) {
  dialogAction = action; $('dialog-title').textContent = t(action === 'restart' ? 'restartTitle' : 'endTitle');
  $('dialog-body').textContent = t(action === 'restart' ? 'restartBody' : 'endBody');
  $('dialog-confirm').textContent = t(action === 'restart' ? 'restartConfirm' : 'endConfirm'); $('dialog-cancel').textContent = t('cancel'); $('confirm-dialog').returnValue = ''; $('confirm-dialog').showModal();
}
async function restart() {
  if (liveStates.has(state?.call?.status)) {
    await mutate('end', { reason: 'user_ended' });
    if (localError) return;
  }
  generation++; credentials = null; state = null; pendingText = ''; selectedInstitution = ''; localError = ''; online = true;
  lastContextSignature = ''; lastMessagesSignature = ''; saveCredentials(); $('message-input').value = ''; resizeComposer(); render(); window.scrollTo({ top: 0 });
}
async function downloadEvidence() {
  if (!credentials) return;
  try {
    const data = await api(`/api/rooms/${encodeURIComponent(credentials.id)}/export`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
    const anchor = node('a'); anchor.href = url; anchor.download = `yokobu-simulation-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) { setError(error.code); }
}
function resizeComposer() { $('message-input').style.height = 'auto'; $('message-input').style.height = `${Math.min(170, $('message-input').scrollHeight)}px`; }
$('chat-form').addEventListener('submit', sendMessage);
$('message-input').addEventListener('input', resizeComposer);
$('message-input').addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('chat-form').requestSubmit(); } });
$('starter').addEventListener('click', () => { $('message-input').value = t('starter'); resizeComposer(); $('message-input').focus(); });
$('shop-starter').addEventListener('click', () => { $('message-input').value = t('shopStarter'); resizeComposer(); $('message-input').focus(); });
$('new-chat').addEventListener('click', () => confirmAction('restart'));
$('dismiss-error').addEventListener('click', () => { localError = ''; if (state?.error) state = { ...state, error: null }; render(); });
$('confirm-dialog').addEventListener('close', () => { if ($('confirm-dialog').returnValue !== 'confirm') return; if (dialogAction === 'restart') restart(); else mutate('end', { reason: 'user_ended' }); });
window.addEventListener('online', refreshRoom); document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshRoom(); });
render(); loadConfiguration(); refreshRoom(); setInterval(refreshRoom, 1000);
