# V2 submission review files

This directory preserves v2 separately from the earlier v1 submission.

- `slides.pdf`: five-page English presentation for submission review.
- `slides.pptx`: editable slides with a three-minute speaker sequence in the notes.
- `solution.md`: users, problem, solution, scope, and demonstration sequence.
- `codex-use.md`: concise explanation of delegation and result verification.
- `verification.md`: expected-versus-actual checkpoint with synthetic/live distinctions.
- `slides.source.mjs` and `slides.evidence.json`: editable presentation source and status wording.
- `slides.export-pdf.mjs`: PDF conversion through the bundled LibreOffice runtime.

The five-page PDF and editable PPTX reflect the current checkpoint after the third actual laptop rehearsal. The deck uses selectable English text and labels every page as a simulation. Four actual Korean business answers and a readback were captured, but confirmation reset the answers and the human disconnected. Actual voice is **Partial**; live unknown-detail relay and normal completion remain **Unverified**. Russian/Chinese checks exposed fidelity limits. User value remains **Unverified**.

The local checks and the real rehearsal are separate evidence classes. Later code corrections are not presented as a successful new microphone run. The verification document identifies evidence paths; raw prompts and session logs are excluded from these submission materials.

## Rebuilding the deck

Use the Codex bundled workspace runtime. Set `RUNTIME_NODE_MODULES`, `PRESENTATIONS_SKILL_DIR`, and `RUNTIME_PYTHON` to the installed paths, then run `slides.source.mjs` with the bundled Node executable. It requires the installed `@oai/artifact-tool` package and the Presentations skill tools. The source uses Arial and a 16:9 canvas.

Set `RUNTIME_SOFFICE` to the bundled absolute `soffice` path from the same workspace runtime and run `slides.export-pdf.mjs`. Do not use an unrelated desktop LibreOffice installation. Render the resulting PDF with bundled Poppler and inspect all five pages. Private previews and validation receipts are under `.presentation-build-v2`; keep that directory outside any official upload.

The official upload destination is the [participant submission app](https://ralphthon.org/kakao-ai-dot-2026/app), following the [official instructions](https://ralphthon.org/kakao-ai-dot-2026/#process). A local ZIP or prepared PDF is not evidence of submission. The team representative must review and authorize any external submission. Do not upload raw prompts, Codex session logs, secrets, or unrelated local artifacts.
