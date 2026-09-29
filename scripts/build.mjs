import { cp, mkdir } from 'node:fs/promises';
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await cp(new URL('../public/', import.meta.url), new URL('../dist/', import.meta.url), { recursive: true });
console.log('Built dist/ frontend assets. The concierge requires server.mjs and its /api endpoints; static-only hosting does not enable AI features.');
