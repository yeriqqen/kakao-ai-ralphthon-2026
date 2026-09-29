import { readFileSync } from 'node:fs';

export function config() {
  let file = '';
  try { file = readFileSync(new URL('../.env', import.meta.url), 'utf8'); } catch {}
  const values = {};
  for (const line of file.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  const get = (name, fallback = '') => process.env[name] || values[name] || fallback;
  return {
    key: get('OPENAI_API_KEY'), chatModel: get('OPENAI_CHAT_MODEL', 'gpt-6-astra'),
    reviewModel: get('OPENAI_REVIEW_MODEL', 'gpt-4.1'),
    realtimeModel: get('OPENAI_REALTIME_MODEL', 'gpt-realtime'),
    port: Number(get('PORT', '4173')), host: get('HOST', '127.0.0.1'),
    publicBaseUrl: get('PUBLIC_BASE_URL'), cert: get('TLS_CERT_FILE'), tlsKey: get('TLS_KEY_FILE'),
  };
}

export function apiError(code, statusCode = 400) {
  return Object.assign(new Error(code), { code, statusCode });
}
