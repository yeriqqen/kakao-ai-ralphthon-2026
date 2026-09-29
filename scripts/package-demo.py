"""Prepare reviewable local archives; never upload or submit anything."""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

ROOT = Path(__file__).resolve().parent.parent
SUBMISSION = ROOT / 'submission'
ARTIFACTS = ROOT / 'artifacts'
SUBMISSION.mkdir(exist_ok=True)
ARTIFACTS.mkdir(exist_ok=True)
shutil.copyfile(ROOT / 'docs/demo-guide.md', SUBMISSION / 'demo-guide.md')
shutil.copyfile(ROOT / 'docs/korean-pronunciation-guide.md', SUBMISSION / 'korean-pronunciation-guide.md')

review_files = [SUBMISSION / p for p in [
    'README.md', 'slides.pdf', 'solution.md', 'codex-use.md',
    'verification-summary.md', 'demo-guide.md', 'korean-pronunciation-guide.md',
]]
manifest = {
    'purpose': 'Prepared local review package; NOT submitted; ZIP acceptance Unconfirmed',
    'official_destination': 'https://ralphthon.org/kakao-ai-dot-2026/app',
    'deadline_kst': '2026-09-29 16:30',
    'raw_prompts_or_codex_session_logs_included': False,
    'files': [{
        'path': p.name, 'bytes': p.stat().st_size,
        'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
    } for p in review_files],
}
(SUBMISSION / 'package-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
with zipfile.ZipFile(SUBMISSION / 'yokobu-submission-review.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for p in review_files + [SUBMISSION / 'package-manifest.json']:
        archive.write(p, p.name)

# A separate runnable archive preserves source and reproducible checks. No personal
# environment, hidden build workspace, raw prompts, or human microphone run is copied.
source_files = [ROOT / p for p in ['README.md', 'package.json', 'server.mjs', '.gitignore']]
for folder in ['public', 'scripts', 'tests', 'docs']:
    source_files.extend(p for p in (ROOT / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
source_files.extend(ARTIFACTS / p for p in ['expected-vs-actual.json', 'browser-results.json'])
source_files.extend(p for p in ARTIFACTS.glob('browser-*.png'))
source_files.extend(p for p in ARTIFACTS.glob('sample-korean-sheets.*'))
source_files.extend(review_files)
source_files.extend(p for p in SUBMISSION.glob('slides.*') if p.is_file() and p not in source_files)
with zipfile.ZipFile(ARTIFACTS / 'yokobu-runnable-demo.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for p in sorted(set(source_files)):
        archive.write(p, 'yokobu/' + str(p.relative_to(ROOT)))

for p in [SUBMISSION / 'yokobu-submission-review.zip', ARTIFACTS / 'yokobu-runnable-demo.zip']:
    with zipfile.ZipFile(p) as archive:
        assert archive.testzip() is None
        assert not any(name.startswith('/') or '..' in Path(name).parts for name in archive.namelist())
    print(f'{p.relative_to(ROOT)}: {p.stat().st_size:,} bytes, archive integrity passed')
