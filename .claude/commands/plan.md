---
description: Stage 4 of the SDLC pipeline — break the approved architecture into a prioritized, dependency-ordered task list in impl-plan.md
argument-hint: (none — always reads my-app/architecture.md, requirements.md, design-review.md)
---

You are running **Stage 4: Implementation Planning** of the ClaudeCapstone
Agentic SDLC pipeline. Follow this procedure one phase at a time — do not
write any implementation code in this stage, only the plan.

## Phase A — Read

1. Read `my-app/architecture.md` (must exist and reflect any Design Review
   revisions — check for a "Revised per Design Review" note).
2. Read `my-app/design-review.md` for any **deferred items** explicitly
   flagged for planning at this stage (e.g. a load-test plan, a behavior
   decision left for implementation) — these must show up as real tasks
   here, not be silently dropped.
3. Read `my-app/requirements.md` (FR-*, NFR-*) so every requirement is
   traceable to at least one task.
4. Read `.claude/pipeline-state.md` for any other open items.
5. Read the actual current codebase to ground tasks in real files/functions,
   not abstractions (e.g. "modify `server/index.js`'s `POST /api/items`
   handler," not "update the backend").
6. **Check whether `my-app/impl-plan.md` already exists.** If so, ask the
   human whether this is a fresh planning round or should be left as-is —
   same pattern as Stages 2 and 3.

## Phase B — Break down into tasks (propose, then confirm genuine choices)

Produce a task list where each task has: an ID, a short title, which
file(s) it touches, which FR/NFR it satisfies, its dependencies (by task
ID), and a priority. Order the list so a task never appears before something
it depends on.

Typical shape for this kind of change (adapt to what's actually in
`architecture.md`, don't force it into this exact shape if the real design
differs):
- Foundational/schema-level tasks first (nothing else can be tested until
  these exist).
- Server-side logic next (validation, filtering) — client can't be
  meaningfully tested against a server that doesn't support the feature yet.
- Client-side UI after the server supports what it needs.
- Tests alongside or immediately after the feature they cover — don't push
  all testing to the very end as one undifferentiated task.
- Anything `design-review.md` deferred (e.g. a load test, a documented
  behavioral note) as its own explicit task, not folded silently into
  something else.

Identify and flag **blocked tasks** explicitly — a task that cannot start
until another finishes, with a one-line reason.

Where genuine planning judgment calls exist (not requirements/architecture
questions — those are already locked), propose a recommendation and confirm
with the human rather than deciding unilaterally, for example:
- Whether tasks should be grouped feature-slice (schema→server→client→test
  per flow) vs. layer-complete (all server work, then all client work).
- Whether a deferred item from Design Review (e.g. a load-test script)
  should block the PR (Stage 8) or ship as a fast-follow after.

Wait for the human's response before Phase C.

## Phase C — Capture (automatic once unblocked)

Record approval and write `my-app/impl-plan.md`:

```bash
bash .claude/scripts/record-approval.sh plan "<quoted summary of the human's confirmed decisions>"
```

`impl-plan.md` structure:

```
# Implementation Plan: <STORY-ID> — <Title>

**Status:** Confirmed with human on <date>
**Builds on:** my-app/architecture.md, my-app/design-review.md

## 1. Ordering Principle
   (1-2 sentences: how tasks are sequenced, per the human's confirmed choice)

## 2. Task List
   (table: ID | Task | Files touched | Satisfies (FR/NFR) | Depends on |
   Priority)

## 3. Blocked Tasks
   (explicit list: Task X is blocked until Task Y completes, because <reason>)

## 4. Deferred Items Carried From Design Review
   (each one mapped to a specific task ID above, or explicitly marked as a
   post-PR fast-follow if the human chose that)

## 5. Out of Plan
   (anything requirements.md marked out-of-scope, restated so implementation
   doesn't accidentally build it)
```

## Phase D — Commit and update state

1. `git add my-app/impl-plan.md`, commit naming the stage and story ID.
2. Update `.claude/pipeline-state.md`: mark Stage 4 complete, record commit
   hash, set "Current stage" to Implementation, list the task IDs so Stage 5
   can pick them up in order.
3. Attempt `git push`; report plainly if it fails.
4. Tell the human the plan is ready for Stage 5 (Implementation), but do not
   start writing implementation code yourself in this same turn.

## Guardrails

- Every FR/NFR from `requirements.md` and every deferred item from
  `design-review.md` must map to at least one task — if something has no
  home, say so explicitly rather than silently dropping it.
- Don't invent tasks for out-of-scope items (multi-category tagging,
  category CRUD, sorting/bulk-edit, etc.) — list them under §5 instead.
- If you attempt to write `my-app/impl-plan.md` without the matching
  `record-approval.sh` call, the write will fail (hook exit code 2) — this
  is enforcement, not a bug.
