# V2 submission review files

This directory preserves v2 separately from the earlier v1 submission.

- `slides.pdf`: five-page English presentation for submission review.
- `slides.pptx`: editable slides with a three-minute speaker sequence in the notes.
- `solution.md`: users, problem, solution, scope, and demonstration sequence.
- `codex-use.md`: concise explanation of delegation and result verification.
- `verification.md`: expected-versus-actual checkpoint with synthetic/live distinctions.
- `slides.source.mjs` and `slides.evidence.json`: editable presentation source and status wording.
- `slides.export-pdf.mjs`: PDF conversion through the bundled LibreOffice runtime.

The PDF uses selectable English text. All slides have simulation labels. A real English API interview turn succeeded at 14:06:39 KST on 2026-09-29. The editable evidence wording reflects that result; the PDF/PPTX from the earlier checkpoint still show the historical credit blocker and await the final rehearsal update before regeneration. Do not upload those earlier slide exports as the final current-status version. Live Korean microphone/speaker operation remains Unverified. Value remains Unverified until actual target-user feedback exists.

## Rebuilding the deck

Use the Codex bundled workspace runtime. Set `RUNTIME_NODE_MODULES`, `PRESENTATIONS_SKILL_DIR`, and `RUNTIME_PYTHON` to the installed paths, then run `slides.source.mjs` with the bundled Node executable. It requires the installed `@oai/artifact-tool` package and the Presentations skill tools. The source uses Arial and a 16:9 canvas.

Set `RUNTIME_SOFFICE` to the bundled absolute `soffice` path from the same workspace runtime and run `slides.export-pdf.mjs`. Do not use an unrelated desktop LibreOffice installation. Render the resulting PDF with bundled Poppler and inspect all five pages. Private previews and validation receipts are under `.presentation-build-v2`; keep that directory outside any official upload.

The official upload destination is the [participant submission app](https://ralphthon.org/kakao-ai-dot-2026/app), following the [official instructions](https://ralphthon.org/kakao-ai-dot-2026/#process). A local ZIP or prepared PDF is not evidence of submission. The team representative must review and authorize any external submission. Do not upload raw prompts, Codex session logs, secrets, or unrelated local artifacts.
