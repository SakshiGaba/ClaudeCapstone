---
description: Stage 7 of the SDLC pipeline — run the full test suite and a content-quality check on the pipeline's documents, before opening the PR
argument-hint: (none)
---

You are running **Stage 7: Verification** of the ClaudeCapstone Agentic
SDLC pipeline. This has two halves: verifying the **code** (tests actually
pass, known issues are resolved or deliberately deferred) and verifying the
**documents** (the 5 artifacts from Stages 1-6 are internally consistent,
not just individually correct).

## Phase A — Read

1. Read `.claude/pipeline-state.md` in full, especially any open items
   (e.g. a flagged flaky test) — this stage exists partly to resolve or
   consciously accept those, not let them silently ride into the PR.
2. Read all 5 prior artifacts: `requirements.md`, `architecture.md`,
   `design-review.md`, `impl-plan.md`, `code-review.md`.
3. **Check whether `my-app/verification-report.md` already exists** — if
   so, ask the human whether this is a fresh run, same pattern as prior
   stages.

## Phase B — Verify the code

1. **Run the full test suite for real**, multiple times if there's a known
   flake: `npx playwright test` (with
   `DANGEROUSLY_DISABLE_HOST_CHECK=true` if this environment needs it).
   If a flaky test was logged in `pipeline-state.md`, run enough times to
   characterize it (e.g. 3-5 runs) rather than accepting a single pass.
2. For any flake or failure found: diagnose whether it's caused by this
   story's changes or is pre-existing/environmental. Propose a fix if it's
   cheap and low-risk; otherwise propose documenting it as a **Known
   Limitation** for the PR (Stage 8 needs this list either way).
3. Re-run `npm audit` in all 3 `package.json` locations as a final sanity
   check — confirm nothing changed since Stage 6's review.
4. Confirm every FR (`requirements.md`) and NFR has at least one passing
   test or explicit verification step behind it — build a traceability
   check, don't just assume Stage 5/6 covered everything.

## Phase C — Verify the documents (content-quality check)

Read all 5 documents together, checking for:
- **Contradictions between documents** (e.g. does `code-review.md` cite a
  decision that conflicts with what `design-review.md` or `requirements.md`
  actually say?).
- **Stale checklists** — Definition of Done items that are checked/unchecked
  incorrectly relative to what's actually been completed.
- **Broken cross-references** — a document pointing at a commit hash, task
  ID, or section that doesn't actually exist or say what's claimed.
- **Unresolved carried-forward items** that were never actually closed out
  (distinguish "deliberately deferred with a reason" from "silently
  dropped").

## Phase D — Agree findings with the human (human-in-the-loop, mandatory)

1. Present: test results (including flake characterization), dependency
   audit status, FR/NFR traceability gaps if any, and document
   consistency findings.
2. For anything requiring a fix (code or docs), get explicit agreement
   before applying it — same as Stage 6, this doesn't unilaterally rewrite
   prior stages' work.
3. Wait for the human's response before Phase E.

## Phase E — Capture (automatic once unblocked)

Record approval and write `my-app/verification-report.md`:

```bash
bash .claude/scripts/record-approval.sh verify "<quoted summary of agreed findings>"
```

Structure:

```
# Verification Report: <STORY-ID> — <Title>

**Status:** Verified and agreed with human on <date>

## 1. Test Suite Results
   (how many runs, pass/fail counts, flake characterization if applicable)

## 2. Dependency Audit (final check)

## 3. FR/NFR Traceability Matrix
   (table: requirement ID | satisfied by (file/task) | verified by (test/
   check) )

## 4. Document Consistency Check
   (any issues found and fixed, or "no issues found" with what was checked)

## 5. Known Limitations (carries directly into Stage 8's PR description)
```

## Phase F — Commit and update state

1. `git add my-app/verification-report.md` (and any fix commits), commit.
2. Update `.claude/pipeline-state.md`: mark Stage 7 complete, set "Current
   stage" to PR, carry the "Known Limitations" list forward explicitly so
   Stage 8 doesn't have to rediscover it.
3. Attempt `git push`; report plainly if it fails.
4. Tell the human verification is complete and Stage 8 (`/open-pr`) is
   next, but do not start it yourself.

## Guardrails

- A single passing test run does not resolve a previously-flagged flake —
  run it enough times to actually characterize the failure rate.
- Don't mark an FR/NFR "verified" without pointing at the specific test or
  check that verifies it.
- If you attempt to write `my-app/verification-report.md` without the
  matching `record-approval.sh` call, the write will fail (hook exit code 2)
  in environments where the hook fires.
