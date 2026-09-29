#!/usr/bin/env python3
"""Package only the prepared v2 submission documents; never upload them."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parent.parent
folder = root / 'submission' / 'v2'
names = ('slides.pdf', 'slides.pptx', 'solution.md', 'codex-use.md', 'verification.md', 'README.md')
files = [folder / name for name in names]
for file in files:
    if not file.is_file():
        raise SystemExit(f'Missing prepared artifact: {file.name}')
archive = folder / 'yokobu-v2-submission-review.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:
    for file in files:
        output.write(file, file.name)
with zipfile.ZipFile(archive) as output:
    assert sorted(output.namelist()) == sorted(names)
    assert output.testzip() is None
manifest = {
    'purpose': 'Local review bundle; not submitted. ZIP acceptance by organizers is Unconfirmed.',
    'archive': archive.name,
    'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
    'files': [{'name': file.name, 'bytes': file.stat().st_size, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()} for file in files],
    'excluded': ['API keys', 'room credentials', 'raw prompts', 'Codex session logs', 'raw conversation evidence'],
}
(folder / 'package-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Prepared {archive.relative_to(root)} with {len(names)} documents. No external submission.')
