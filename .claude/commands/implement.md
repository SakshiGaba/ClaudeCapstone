---
description: Stage 5 of the SDLC pipeline — implement one task from impl-plan.md at a time, following the sdlc-implementation Skill's conventions
argument-hint: [task-id, e.g. T1 — omit to auto-pick the next unblocked task]
---

You are running **Stage 5: Implementation** of the ClaudeCapstone Agentic
SDLC pipeline. Implement **exactly one task per invocation of this
command** — do not chain into the next task automatically, since there is
no technical approval gate on source code files (unlike Stages 1-4) and the
human's review between tasks is the real checkpoint here.

## Phase A — Pick the task

1. Read `my-app/impl-plan.md` in full.
2. Read `.claude/pipeline-state.md` for the Stage 5 task checklist (create
   one if it doesn't exist yet: a table of Task ID | Status | Commit).
3. If a task ID was given in `$ARGUMENTS`, use that one — but first confirm
   its `Depends on` tasks are actually marked done; refuse and tell the
   human if not.
4. If no task ID was given, pick the **lowest-numbered task whose
   dependencies are all done** and that isn't already marked done itself.
5. State clearly which task you're about to implement and why (its
   dependencies are satisfied), before writing any code.

## Phase B — Implement

1. Load and follow `.claude/skills/sdlc-implementation/SKILL.md` — its
   coding conventions and per-task workflow apply to everything here.
2. Make the smallest change that satisfies the task's stated FR/NFR from
   `my-app/requirements.md`. Don't fold in other tasks' work even if it's
   in the same file and tempting.
3. If the task is a Playwright spec (T8-T11 or equivalent), write it, then
   actually run `npx playwright test` (with
   `DANGEROUSLY_DISABLE_HOST_CHECK=true` if needed in this environment) —
   don't mark it done on the basis of the file existing alone.
4. If the task is the load-test script (T12 or equivalent), run it and
   record the actual measured numbers — not an estimate.
5. If the task is the schema migration (T1 or equivalent), verify it
   applies cleanly against the actual current `server/db/app.db` (or a
   fresh one) — start the server briefly and confirm no errors, or
   equivalent verification.

## Phase C — Report and pause for review

1. Show the human a concise summary: what changed, in which file(s), which
   FR/NFR it satisfies, and test/verification results if applicable.
2. Do not present this as "done" until the human has looked at it — ask
   directly: does this look right, or should something change?
3. Wait for their response before Phase D.

## Phase D — Commit and update state (once the human is satisfied)

1. Commit with the task ID in the message (e.g. `feat(T2): add category
   validation to POST /api/items`).
2. Update `.claude/pipeline-state.md`'s Stage 5 task checklist: mark this
   task done with its commit hash.
3. If this was the **last** task (all of T1-T12 or equivalent done), update
   the main stage table: mark Stage 5 complete, set "Current stage" to
   Code Review, and say so plainly. Otherwise, state which task(s) are now
   unblocked and ready next, but **stop here** — don't start them
   automatically.
4. Attempt `git push`; report plainly if it fails.

## Guardrails

- One task per invocation. If the human says "just do all of them," ask
  for explicit confirmation that they want to waive the per-task review
  checkpoint before proceeding to chain multiple tasks in one turn.
- Never mark a task done without having actually run any test/verification
  it calls for.
- If a task's implementation reveals the plan or architecture was wrong
  about something, stop and say so — don't silently improvise around it.
