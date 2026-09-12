---
description: Stage 8 of the SDLC pipeline — generate the PR description (Summary, Changes Made, Test Evidence, Known Limitations, Reviewer Checklist) and open the actual Pull Request
argument-hint: [feature-branch-name] [base-branch-name, defaults to main]
---

You are running **Stage 8: PR** — the final stage of the ClaudeCapstone
Agentic SDLC pipeline. This produces the actual Pull Request, not just a
document about one.

## Prerequisite check

Confirm a feature branch actually exists with a real diff against the base
branch (`git diff --stat <base> <feature-branch>`). If the feature branch
doesn't exist, or there's no diff, stop and tell the human — this stage
cannot proceed without something real to open a PR for. (If this pipeline
was run without branching first, as happened for ITEMS-101, that's a
one-time retroactive fix, not something this command does automatically —
see `.claude/pipeline-state.md` for how that was handled.)

## Phase A — Read

Read `my-app/requirements.md`, `my-app/impl-plan.md`, `my-app/code-review.md`,
and `my-app/verification-report.md` — these directly supply the PR's
required sections.

## Phase B — Generate the PR description

Produce all 5 required sections. Do not invent content — pull directly
from the artifacts already produced:

1. **Summary** — 2-3 sentences: what was built and why, from
   `requirements.md`'s narrative.
2. **Changes Made** — bulleted list of every file added/modified and the
   reason, derived from `impl-plan.md`'s task list (T1-T12 or equivalent)
   and the actual `git diff --stat` against the base branch — cross-check
   these match, don't just restate the plan without verifying the diff.
3. **Test Evidence** — the actual test run output and load-test numbers
   from `verification-report.md` (real numbers, not placeholders).
4. **Known Limitations** — copied directly from
   `verification-report.md` §5, not re-summarized loosely.
5. **Reviewer Checklist** — a tick-list derived from the Stage 6 code
   review checklist (correctness, security, error handling, test coverage,
   code clarity, DRY, dependency safety) plus anything specific this story
   needs a human reviewer to double-check.

## Phase C — Confirm with the human before opening anything

Show the full generated PR description to the human. This is the last
gate before something becomes visible on GitHub — get explicit
confirmation before Phase D creates the actual PR.

## Phase D — Open the PR

Use the GitHub API (or `gh pr create` if the GitHub CLI is authenticated)
to open a real PR from the feature branch into the base branch, with the
confirmed title and body. Report back the actual PR URL.

## Phase E — Update state

1. Update `.claude/pipeline-state.md`: mark Stage 8 complete, record the
   PR URL/number.
2. Tell the human the full 8-stage pipeline is complete for this story.

## Guardrails

- Never fabricate test numbers or file lists — every claim in the PR
  description must trace back to an actual artifact or a fresh `git diff`.
- Get explicit human confirmation before the PR actually goes live on
  GitHub — this is a public, visible action, not a local file write.
