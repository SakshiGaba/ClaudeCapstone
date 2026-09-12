---
name: sdlc-implementation-conventions
description: Use this skill whenever implementing any task from my-app/impl-plan.md against my-app/server/index.js or my-app/client/src/App.js (Stage 5 of the ClaudeCapstone Agentic SDLC pipeline). It encodes this codebase's existing conventions and the required per-task workflow, so that T1-T12 stay consistent no matter which session or model implements them. Trigger this whenever the task is "implement task T<N>", "start Stage 5", or any direct edit to server/index.js or client/src/App.js in this repo.
---

# SDLC Implementation Conventions (ClaudeCapstone / ITEMS-101)

This skill exists because Stage 5 touches the same two files across many
tasks (T1-T12 in `my-app/impl-plan.md`). Without a shared reference,
different sessions could implement the same kind of change in different
styles. Read this before editing either file.

## 1. Existing coding conventions — match these, don't "improve" them mid-task

- **SQLite access:** callback-style `db.run(...)` / `db.all(...)`, not
  promisified, not wrapped in `async/await`. The whole file uses this
  pattern consistently — do not introduce a different async style for new
  code; that's a separate refactor, out of scope for this story.
- **Validation placement:** inline, at the top of the route handler,
  immediately after destructuring `req.body`/`req.query`, with an early
  `return res.status(400).json({ error: '...' })`. Match the existing
  `name` validation's shape exactly for any new `category` validation.
- **Response shapes:** items are plain objects with `id`, `name` (and now
  `category`) — don't wrap responses in an envelope object. Errors are
  always `{ error: <string> }`.
- **No new npm dependencies** for this story without going back through
  `/architecture` — the approved design deliberately uses only what's
  already in `package.json`.
- **Client state:** plain `useState`/`useEffect`, no state management
  library, no new component files — `App.js` stays a single component,
  matching its current structure.

## 2. Per-task workflow (for every task ID in `my-app/impl-plan.md`)

1. **Read the task's full row** in `impl-plan.md` §2: files touched,
   which FR/NFR it satisfies, and its `Depends on` column.
2. **Confirm dependencies are actually done** — check
   `.claude/pipeline-state.md`'s task checklist and `git log` for the
   dependency's commit before starting. Don't start a blocked task early.
3. **Implement the smallest change that satisfies the task's stated
   FR/NFR** — resist folding in work that belongs to a different task ID,
   even if it's tempting because you're already in the same file.
4. **Self-check against the actual FR/NFR wording** in
   `my-app/requirements.md` before considering the task done — not just
   "does this compile," but "does this literally do what FR-N says."
5. **Update `.claude/pipeline-state.md`**: mark the task done, with the
   commit hash, in a running Stage 5 task checklist (create one if it
   doesn't exist yet).
6. **Commit with the task ID in the message** (e.g. `feat(T2): ...`) so
   history stays traceable back to `impl-plan.md`.

## 3. Testing discipline

- Playwright tasks (T8-T11) must actually be **run**
  (`npx playwright test`), not just written — "the test file exists" is
  not the same as "the test passes."
- T12 (the load-test script) must produce and record **real measured
  numbers**, not an estimate — its output is required "Test Evidence" for
  Stage 8's PR per the human's confirmed Stage 4 decision.

## 4. Traceability rule

Every code change in Stage 5 should be traceable to **both** a task ID in
`impl-plan.md` and a requirement ID in `requirements.md`. If you can't
point to both for a given edit, stop and ask the human before proceeding —
don't guess at scope this late in the pipeline.

## 5. Known carried-forward decisions (don't re-litigate these)

- Whitespace-only category → defaults to `Uncategorized` (FR-7 stands,
  confirmed at Stage 3 — this is final, not open for reinterpretation).
- Non-string `name`/`category` → reject with `400` (Design Review finding
  B, folded into `architecture.md`).
- The "All" filter value is client-only — the server must never
  special-case the literal string `"All"`.
