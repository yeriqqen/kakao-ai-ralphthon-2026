import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('./public/', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/evidence') {
      if (![`http://localhost:${port}`, `http://127.0.0.1:${port}`].includes(req.headers.origin)) { res.writeHead(403); return res.end(); }
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 250000) { res.writeHead(413); return res.end(); } }
      const evidence = JSON.parse(body);
      if (evidence.simulation !== true || !Array.isArray(evidence.facts)) { res.writeHead(400); return res.end(); }
      const dir = fileURLToPath(new URL('./artifacts/local-runs/', import.meta.url));
      await mkdir(dir, { recursive: true });
      const filename = `simulation-${new Date().toISOString().replaceAll(':', '-')}.json`;
      await writeFile(path.join(dir, filename), JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ path: `artifacts/local-runs/${filename}` }));
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    const bytes = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'microphone=(self)' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`YOKOBU fictional simulation: http://localhost:${port}`));
