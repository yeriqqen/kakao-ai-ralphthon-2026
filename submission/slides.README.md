# YOKOBU presentation

- `slides.pdf`: five-page Korean submission presentation. Clinic facts and patient inputs are explicitly fictional simulation fixtures.
- `slides.pptx`: editable PowerPoint source, including three-minute speaker notes.
- `slides.source.mjs`: editable JavaScript authoring source using the installed Codex presentation runtime.
- `slides.pdf.py`: generates the PDF from the high-resolution slide renders.
- `slides.evidence.json`, when present: concise verification wording used on slide four.

The deck covers the agreed users and problem, the clinic simulation flow, the fictional example and Russian/Korean first-visit relay, the current implementation and verification boundary, and the unverified value hypothesis.

## Rebuild

Use the Codex bundled workspace Node/Python dependencies and the installed Presentations skill. Set `RUNTIME_NODE_MODULES`, `PRESENTATIONS_SKILL_DIR`, and `RUNTIME_PYTHON` to the paths reported by `load_workspace_dependencies` and the skill catalog. Run `slides.source.mjs` with the bundled Node executable, then `slides.pdf.py` with the bundled Python executable. Keep `.presentation-build` private and outside the final submission package.

The source deliberately uses Apple SD Gothic Neo and Arial, both available on the verified authoring Mac. Confirm fonts before rebuilding on another machine. The finalizer validates each new PPTX before copying it to the stable output path.

## PDF rendering note

The bundled LibreOffice conversion omitted Korean glyphs. Visual inspection caught the defect. The delivered PDF instead embeds the verified 2560×1440 render of each slide on a 16:9 page. This keeps the presentation visually stable, but the PDF's text is not selectable. Edit the PPTX or JavaScript source, then rebuild and inspect all five pages.

Only completed observations belong on slide four. Automated or manually entered text checks do not prove a real microphone conversation. Preserve `Unverified` for microphone capture and audible Korean speech until a teammate has actually rehearsed them. Preserve `Unverified` for user value until actual user feedback exists.

No external submission or public deployment was performed. The team representative should review the PDF and current verification evidence before uploading to the official submission app.
