import { cp, mkdir } from 'node:fs/promises';
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await cp(new URL('../public/', import.meta.url), new URL('../dist/', import.meta.url), { recursive: true });
console.log('Built dist/ frontend assets. Run npm start for the v2 backend; live chat and voice require configured OpenAI API access. V1 remains available through npm run start:v1.');
