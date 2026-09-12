---
description: Stage 2 of the SDLC pipeline — propose a high-level architecture from requirements.md and write architecture.md
argument-hint: (none — always reads my-app/requirements.md)
---

You are running **Stage 2: Architecture** of the ClaudeCapstone Agentic SDLC
pipeline. Follow this procedure exactly, one phase at a time — do not start
writing implementation code and do not re-litigate scope that Stage 1 locked.

## Phase A — Read

1. Read `my-app/requirements.md` in full (FR-*, NFR-*, out-of-scope). Refuse
   to proceed if it doesn't exist or isn't marked "Finalized after
   clarification" — that means Stage 1 isn't actually done yet.
2. Read `.claude/pipeline-state.md` for any open items carried forward from
   Stage 1 (e.g. story-vs-requirements conflicts) — architecture must design
   to the locked requirements, but should note in the doc when it's aware of
   a carried-forward discrepancy so Stage 6 (Code Review) isn't blindsided.
3. Read the actual current codebase (`my-app/server/index.js`,
   `my-app/client/src/App.js`, `my-app/server/db/`) to understand what
   already exists — architecture should describe a **delta** from the
   current system, not a rewrite from scratch, unless requirements demand
   one.

## Phase B — Propose & confirm genuine design choices (human-in-the-loop)

Requirements define *what*; this stage defines *how*. Most "how" questions
have one clearly-correct answer given the existing stack (React + Express +
SQLite) and don't need a human decision — don't manufacture ambiguity where
there isn't any, and don't ask about anything requirements.md already
settled.

Do identify and ask about choices that are genuinely open and would send
implementation in different directions, for example (adapt to the actual
requirements, don't ask verbatim):
- Migration strategy when the schema needs to change but there's no existing
  migration framework (e.g. runtime auto-migration at startup vs. a manual
  migration script).
- Where case-insensitive/normalization logic should live (DB-level
  expression index/collation vs. application-level normalization).
- Any new component/library that isn't already in the stack.

Propose your recommended answer for each, with a one-line rationale, rather
than presenting an open-ended question — the human should be confirming or
overriding a recommendation, not designing from scratch. Wait for their
response before proceeding to Phase C.

## Phase C — Capture (automatic once unblocked)

Once confirmed, record approval and write `my-app/architecture.md`:

```bash
bash .claude/scripts/record-approval.sh architecture "<quoted summary of the human's confirmation/decisions>"
```

This is enforced by the same `PreToolUse` hook as Stage 1 — the write will
be blocked (exit 2) without a fresh marker.

`architecture.md` structure:

```
# Architecture: <STORY-ID> — <Title>

**Status:** Proposed / confirmed with human on <date>
**Builds on:** my-app/requirements.md (FR-*, NFR-*)

## 1. Overview
   (1-2 paragraphs: what's changing at a system level, in plain language)

## 2. Component Diagram
   (ASCII or Mermaid diagram: client / server / db, showing the request
   flow — not just a restatement of the existing README's structure)

## 3. Components and Responsibilities
   (table: component | responsibility | what changes for this story)

## 4. Data Flow
   (walk through the 2-3 key flows this story adds/changes, e.g.
   "add item with category," "filter by category," step by step)

## 5. Data Model / Schema Changes
   (exact DDL delta, e.g. ALTER TABLE statement, index definitions)

## 6. Technology Choices
   (table: decision | choice | rationale — only for things that were
   genuinely decided in Phase B, not a restatement of the existing stack)

## 7. Non-Functional Considerations
   (how this design satisfies each NFR from requirements.md — trace back
   explicitly, e.g. "NFR-1 (200ms/10k items) -> expression index on
   LOWER(category)")

## 8. Risks / Open Questions for Design Review
   (anything you're not fully confident about — Stage 3 exists specifically
   to pressure-test this, so surface honest doubts rather than papering
   over them)
```

## Phase D — Commit and update state

1. `git add my-app/architecture.md`, commit naming the stage and story ID.
2. Update `.claude/pipeline-state.md`: mark Stage 2 complete, record commit
   hash, set "Current stage" to Design Review, carry forward any open items
   from Stage 1 that are still unresolved.
3. Attempt `git push`; report plainly if it fails.
4. Tell the human architecture is ready for Stage 3 (`/design-review`), but
   do not start that stage yourself.

## Guardrails

- Do not silently drop or contradict any FR/NFR from `requirements.md` — if
  a requirement seems architecturally awkward, say so as a risk in §8, don't
  quietly design around it.
- Prefer the smallest change that satisfies requirements over introducing
  new frameworks/services for a small CRUD app.
- If you attempt to write `my-app/architecture.md` without having run
  `record-approval.sh architecture ...` first, the write will fail (hook
  exit code 2) — this is enforcement, not a bug to route around.
