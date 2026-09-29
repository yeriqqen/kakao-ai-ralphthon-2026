# V2 submission review files

This directory preserves v2 separately from the earlier v1 submission.

- `slides.pdf`: five-page English presentation for submission review.
- `slides.pptx`: editable slides with a three-minute speaker sequence in the notes.
- `solution.md`: users, problem, solution, scope, and demonstration sequence.
- `codex-use.md`: concise explanation of delegation and result verification.
- `verification.md`: expected-versus-actual checkpoint with synthetic/live distinctions.
- `slides.source.mjs` and `slides.evidence.json`: editable presentation source and status wording.
- `slides.export-pdf.mjs`: PDF conversion through the bundled LibreOffice runtime.

The PDF/PPTX reflect the **16:10 KST checkpoint**. The fifth real shop rehearsal completed the full laptop flow: an offered black alternative triggered chat clarification, the human accepted it, Korean speech returned the choice, stock/₩10,000/pickup by 19:00 were confirmed, and the matching summary/recommendation appeared. The user confirmed audible Korean and microphone shutdown. One price fragment needed clarification. Earlier failures remain preserved. The later teammate UI/shutdown merge passed automated regressions; it is not represented as another live rehearsal.

Current checks: 67 unit, 30 local HTTP with mocked AI, 20 mocked customer UI, 19 mocked business UI, 32 design checks, and 8 extracted-package checks. The build passes. Prior real Russian/Chinese checks retain disclosed meaning-preservation limits. User value remains **Unverified**. See `docs/v2-pr1-review.md` for precise evidence boundaries.

The review ZIP contains exactly six files: PDF, PPTX, solution, Codex-use explanation, verification and this README. The JavaScript source and build helpers remain in the repository outside that six-file archive. ZIP acceptance by organizers is Unconfirmed.

The local checks and the real rehearsal are separate evidence classes. The live run and later merged-code regressions are distinguished. The verification document identifies evidence paths; raw prompts and session logs are excluded from these submission materials.

## Rebuilding the deck

Use the Codex bundled workspace runtime. Set `RUNTIME_NODE_MODULES`, `PRESENTATIONS_SKILL_DIR`, and `RUNTIME_PYTHON` to the installed paths, then run `slides.source.mjs` with the bundled Node executable. It requires the installed `@oai/artifact-tool` package and the Presentations skill tools. The source uses Arial and a 16:9 canvas.

Set `RUNTIME_SOFFICE` to the bundled absolute `soffice` path from the same workspace runtime and run `slides.export-pdf.mjs`. Do not use an unrelated desktop LibreOffice installation. Render the resulting PDF with bundled Poppler and inspect all five pages. Private previews and validation receipts are under `.presentation-build-v2`; keep that directory outside any official upload.

The official upload destination is the [participant submission app](https://ralphthon.org/kakao-ai-dot-2026/app), following the [official instructions](https://ralphthon.org/kakao-ai-dot-2026/#process). A local ZIP or prepared PDF is not evidence of submission. The team representative must review and authorize any external submission. Do not upload raw prompts, Codex session logs, secrets, or unrelated local artifacts.


Official public page rechecked at 16:10 KST: submission remains 16:30 KST, PDF at most five pages, with customer/problem, solution and Codex-use descriptions. The current schedule lists eight-minute group-judging slots and ten-minute finalist presentations. The prepared three-minute sequence is a short demo script within those slots. Authenticated upload limits and ZIP acceptance are still Unconfirmed.
