---
description: Stage 6 of the SDLC pipeline — structured peer code review of the actual implementation, before opening the PR
argument-hint: (none — reviews the current state of my-app/server and my-app/client against requirements.md)
---

You are running **Stage 6: Code Review** of the ClaudeCapstone Agentic
SDLC pipeline. Act as a **peer reviewer** examining someone else's finished
implementation, not the person who wrote it — be specific and skeptical,
not complimentary. This reviews actual code (T1-T12's diffs), not the
architecture (that was Stage 3).

## Phase A — Read

1. Read `my-app/requirements.md`, `my-app/impl-plan.md`, and
   `.claude/pipeline-state.md` (especially any open items, e.g. a flagged
   test flake) so you know what "correct" means and what's already known.
2. Read the actual current code: `my-app/server/index.js`,
   `my-app/client/src/App.js`, `my-app/server/scripts/load-test.js`,
   `my-app/tests/app.spec.js`, and both `package.json` files.
3. **Check whether `my-app/code-review.md` already exists.** If so, don't
   silently regenerate — ask the human whether this is a fresh review
   round, same pattern as Stages 2-3.

## Phase B — Evaluate the fixed checklist

Go through each area below. For each, give a specific finding (not just
"looks fine") — cite the actual file/line/behavior, not a generality.

| Review Area | Review Question |
|---|---|
| **Correctness** | Does each component behave as specified in `requirements.md`? Check every FR/NFR against the actual code, not the plan. |
| **Security** | Are secrets excluded from output/logs? Is all user input validated server-side (not just client-side)? |
| **Error Handling** | Are API failures, malformed input, and "not found" cases (e.g. deleting a non-existent item ID) handled gracefully — no uncaught exceptions, no raw stack traces returned to the client? |
| **Test Coverage** | Do tests cover the happy path **and** not-found/missing-field/invalid-input edge cases? Check the actual assertions in `tests/app.spec.js`, not just that files exist. |
| **Code Clarity** | Are function/variable names self-explanatory? Is the logic followable without needing comments to explain *what* it does (comments explaining *why* are fine)? |
| **DRY Principle** | Is there duplicated logic (e.g. the same validation pattern repeated) that should be refactored into a shared function? Look specifically at whether `POST` and `GET` handlers duplicate the type-checking added in T2/T3. |
| **Dependency Safety** | Run `npm audit` in `my-app`, `my-app/server`, and `my-app/client`. Report any high/critical vulnerabilities in production dependencies specifically — distinguish dev-tooling vulnerabilities (lower priority) from runtime ones. |

## Phase C — Agree findings with the human (human-in-the-loop, mandatory)

1. Present findings grouped as **Must fix before PR**, **Should note but
   acceptable to defer**, and **No issue**.
2. For anything "must fix," propose the specific change and get the
   human's explicit agreement before touching any code — this stage
   reviews Stage 5's work, it doesn't get to silently rewrite it.
3. Wait for the human's response before Phase D.

## Phase D — Capture (automatic once unblocked)

Record approval and write `my-app/code-review.md`:

```bash
bash .claude/scripts/record-approval.sh code-review "<quoted summary of agreed findings>"
```

`code-review.md` structure:

```
# Code Review: <STORY-ID> — <Title>

**Status:** Reviewed and agreed with human on <date>
**Reviewed:** my-app/server, my-app/client, my-app/tests (as of commit <hash>)

## 1. Review Summary
## 2. Findings by Area (the 7-row table above, filled in, with a
   Severity + Agreed Decision column)
## 3. Fixes Applied (if any, with commit references)
## 4. Dependency Audit Results (npm audit summary, all 3 package.json's)
```

**If any "must fix" item requires a code change:** make the agreed fix,
then commit it separately from `code-review.md` itself (code files aren't
gated by the approval hook, but still get the human's explicit agreement
per Phase C before you touch them).

## Phase E — Commit and update state

1. `git add my-app/code-review.md` (and any fix commits), commit naming
   the stage and story ID.
2. Update `.claude/pipeline-state.md`: mark Stage 6 complete, record commit
   hash(es), set "Current stage" to Verification.
3. Attempt `git push`; report plainly if it fails.
4. Tell the human code review is complete and Stage 7 (Verification) is
   next, but do not start it yourself.

## Guardrails

- Don't rubber-stamp — if you find nothing wrong after genuinely checking,
  say so with evidence of what you checked, not just "no issues found."
- Don't invent findings to seem thorough — every finding must point to a
  real line of code or a real test gap.
- If you attempt to write `my-app/code-review.md` without the matching
  `record-approval.sh` call, the write will fail (hook exit code 2) in
  environments where the hook fires — treat that as enforcement, not a bug.
