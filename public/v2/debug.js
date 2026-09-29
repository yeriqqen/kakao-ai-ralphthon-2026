const $ = id => document.getElementById(id);
const room = new URLSearchParams(location.search).get('room');
const token = new URLSearchParams(location.hash.slice(1)).get('token');
let stopped = false, signature = '';
const make = (tag, text, cls = '') => { const node = document.createElement(tag); node.textContent = text; node.className = cls; return node; };
if (room && token) {
  const phone = new URL('/business', location.origin); phone.searchParams.set('room', room); phone.hash = `token=${encodeURIComponent(token)}`; $('phone-link').href = phone.href; window.name = `yokobu-debug-${room}`; $('phone-link').target = `yokobu-call-${room}`; $('chat-link').target = `yokobu-chat-${room}`;
} else { $('debug-error').hidden = false; $('debug-error').textContent = 'Start a conversation in Chat, then open Debug from its top bar.'; stopped = true; }
async function refresh() {
  if (stopped) return;
  try {
    const response = await fetch(`/api/rooms/${encodeURIComponent(room)}/debug`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!response.ok) throw new Error(response.status === 404 ? 'This conversation has ended or the server restarted. Open Debug from a new chat.' : 'Unable to load conversation activity.');
    const state = await response.json(); $('debug-error').hidden = true;
    const current = JSON.stringify(state); if (current === signature) return; signature = current;
    $('debug-status').textContent = `${state.call.status.replaceAll('_', ' ')} · ${state.call.connected ? 'connected' : 'not connected'}`;
    $('debug-progress').textContent = `${state.requiredQuestions.filter(q => q.status === 'resolved').length} / ${state.requiredQuestions.length} answered`;
    $('debug-model').textContent = state.apiEvidence?.findLast(e => e.model)?.model || '';
    $('debug-relay').textContent = state.pendingRelay ? `Customer clarification: ${state.pendingRelay.question}` : '';
    $('debug-questions').replaceChildren(...state.requiredQuestions.map(q => { const item = make('li', q.korean); item.append(make('p', q.text, 'question-translation'), make('p', q.answer || 'Awaiting answer', 'question-status')); return item; }));
    const log = $('transcript'), atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 70;
    log.replaceChildren(...state.transcripts.map(t => { const item = make('article', '', 'turn'); item.append(make('strong', t.role === 'business' ? 'Business' : 'YOKOBU'), make('p', t.text)); return item; }));
    if (!state.transcripts.length) log.append(make('p', 'Waiting for the call to begin.', 'empty'));
    if (atBottom) log.scrollTop = log.scrollHeight;
    $('debug-events').textContent = JSON.stringify({ events: state.voiceDiagnostics?.slice(-30), api: state.apiEvidence?.map(({purpose, model, at, code}) => ({purpose, model, at, code})) }, null, 2);
  } catch (error) { $('debug-error').hidden = false; $('debug-error').textContent = error.message; }
  finally { if (!stopped) setTimeout(refresh, 1000); }
}
window.addEventListener('pagehide', () => { stopped = true; });
refresh();
