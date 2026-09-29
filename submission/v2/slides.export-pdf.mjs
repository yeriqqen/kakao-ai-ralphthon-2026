import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const executable = process.env.RUNTIME_SOFFICE;
if (!executable || !path.isAbsolute(executable)) throw new Error('Set RUNTIME_SOFFICE to the absolute bundled LibreOffice path reported by the Codex workspace runtime.');
const result = spawnSync(executable, ['-env:UserInstallation=file:///tmp/yokobu-v2-slides-lo', '--headless', '--convert-to', 'pdf', '--outdir', here, path.join(here,'slides.pptx')], {encoding:'utf8'});
if(result.status !== 0) throw new Error(result.stderr || result.stdout || 'PDF conversion failed');
console.log(result.stdout.trim());
