---
description: Stage 3 of the SDLC pipeline — critique architecture.md as a senior reviewer, agree on findings with the human, write design-review.md, and revise architecture.md if needed
argument-hint: (none — always reads my-app/architecture.md and my-app/requirements.md)
---

You are running **Stage 3: Design Review** of the ClaudeCapstone Agentic
SDLC pipeline. You are acting as a **senior engineering reviewer** examining
someone else's proposed architecture before any production code is written —
be skeptical and specific, not just complimentary. Follow this procedure one
phase at a time; do not start implementation.

## Phase A — Read

1. Read `my-app/requirements.md` (must be "Finalized after clarification")
   and `my-app/architecture.md` (must exist — refuse to proceed if Stage 2
   hasn't produced it yet).
2. Read `.claude/pipeline-state.md`, especially any open items and the
   "Risks / Open Questions" section (§8) already logged in `architecture.md`
   — a good review starts from what the architecture stage itself admitted
   it wasn't sure about, then goes further.
3. Read the actual current codebase to sanity-check the architecture
   against reality (e.g. does the proposed schema delta actually apply
   cleanly to `server/index.js`'s existing table definition?).
4. **Check whether `my-app/design-review.md` already exists.** If so, don't
   silently regenerate it — ask the human whether this is a fresh review
   round or should be left as-is, same pattern as Stage 2's existing-file
   handling.

## Phase B — Structured critique (do this yourself first, thoroughly)

Evaluate `architecture.md` against each of these dimensions. For each,
either state "no material issue found" with one sentence of justification,
or raise a specific, concrete finding (not a vague "consider X"):

| Dimension | What to check |
|---|---|
| **Correctness vs requirements** | Does every FR/NFR in `requirements.md` map to something explicit in the architecture? Any silent gaps? |
| **Security** | Input validation coverage, injection risk (parameterized queries?), anything newly exposed by the change |
| **Error handling** | What happens on partial failure (e.g. migration fails mid-way, index creation fails, malformed query param)? |
| **Data integrity / migration safety** | Is the migration idempotent? Safe under concurrent startup? Reversible if something goes wrong? |
| **Performance & scalability** | Does the NFR-1 claim (200ms/10k items) actually hold given the proposed index? Any N+1 or full-scan risk left? |
| **Consistency with existing conventions** | Does the design match how the rest of `server/index.js`/`App.js` already does things, or does it introduce a inconsistent pattern? |
| **Testability** | Can each FR/NFR be verified by a Playwright test against this design, or does the design make something hard to test? |
| **Maintainability** | Is this the simplest design that satisfies requirements, or is there unnecessary complexity? |

Also explicitly revisit each item already listed in `architecture.md` §8 —
say whether you consider it resolved, still open, or newly understood
differently.

## Phase C — Agree findings with the human (human-in-the-loop, mandatory)

1. Present your findings to the human, grouped as: **Must address before
   implementation**, **Should note but acceptable to defer**, and
   **No issue**. Be concrete about what "must address" would require
   changing in `architecture.md`.
2. Do not decide unilaterally to revise `architecture.md` — ask the human
   which findings they agree require a change, and get their explicit
   decision on each "must address" item before writing anything.
3. Wait for their response before Phase D.

## Phase D — Capture (automatic once unblocked)

Record approval and write `my-app/design-review.md`:

```bash
bash .claude/scripts/record-approval.sh design-review "<quoted summary of the human's agreed findings/decisions>"
```

`design-review.md` structure:

```
# Design Review: <STORY-ID> — <Title>

**Status:** Reviewed and agreed with human on <date>
**Reviewed artifact:** my-app/architecture.md (as of commit <hash>)

## 1. Review Summary
   (2-3 sentences: overall verdict — ready as-is, ready with minor notes,
   or needs revision)

## 2. Findings by Dimension
   (table: dimension | finding | severity (must-fix/should-note/no-issue) |
   agreed decision)

## 3. Carried-Forward Risks Re-Assessed
   (revisit each architecture.md §8 item explicitly: resolved / still open
   / reframed)

## 4. Changes Required to architecture.md
   (list, or "None — architecture approved as-is")
```

**If any finding requires changing `architecture.md`:** that file is
independently gated by the same hook. Get a *separate* approval for it:

```bash
bash .claude/scripts/record-approval.sh architecture "<quoted summary of what's changing and why, per design review>"
```

Then edit `architecture.md` to incorporate the agreed changes (e.g. append
a "Revised per Design Review" note near the affected section rather than
silently rewriting history) before writing `design-review.md`.

## Phase E — Commit and update state

1. `git add my-app/design-review.md` (and `my-app/architecture.md` if
   revised), commit naming the stage and story ID, summarizing the verdict.
2. Update `.claude/pipeline-state.md`: mark Stage 3 complete, record commit
   hash(es), set "Current stage" to Implementation Planning, update the
   status of any carried-forward risk items per Phase B/C's re-assessment.
3. Attempt `git push`; report plainly if it fails.
4. Tell the human design review is complete and Stage 4 (`/plan`) is next,
   but do not start it yourself.

## Guardrails

- Don't rubber-stamp. If you genuinely find no issues after a thorough
  pass, say so explicitly and explain why you looked — don't produce a
  review that's just praise with no evidence of scrutiny.
- Don't invent findings to seem thorough either — every finding must be
  traceable to something specific in `architecture.md`, `requirements.md`,
  or the actual codebase.
- If you attempt to write `my-app/design-review.md` (or edit
  `architecture.md`) without the matching `record-approval.sh` call, the
  write will fail (hook exit code 2) — this is enforcement, not a bug.
