# Pipeline State

> Read this file first in any session. Update it immediately after finishing
> a stage. This is the single source of truth for "where are we."

**Active story:** ITEMS-101 — Categorize and Filter Items
**Current stage:** 2 — Architecture (not started)
**Last completed stage:** 1 — Requirements

## Stage log

| Stage | Artifact | Status | Commit |
|---|---|---|---|
| 1. Requirements | `my-app/requirements.md` | ✅ Complete — clarified & committed | `1e87fcb` |
| 2. Architecture | `my-app/architecture.md` | ⏳ Not started | — |
| 3. Design Review | `my-app/design-review.md` | ⏳ Not started | — |
| 4. Implementation Planning | `my-app/impl-plan.md` | ⏳ Not started | — |
| 5. Implementation | (source diffs) | ⏳ Not started | — |
| 6. Code Review | `my-app/code-review.md` | ⏳ Not started | — |
| 7. Verification | test run output | ⏳ Not started | — |
| 8. PR | PR description | ⏳ Not started | — |

## Open items carried forward

- **Whitespace-only category conflict (found on Stage 1 re-run, 2026-09-12):**
  the source story's AC #7 says a whitespace-only category should be
  **rejected** with a validation message (same treatment as >50 chars), but
  the committed `my-app/requirements.md` FR-7 says whitespace-only is treated
  as "no category provided" and silently **defaults to `Uncategorized`**
  (per FR-1). These are contradictory for the same input
  (`category: "   "`). Requirements were left as committed (FR-1/FR-7 stand:
  default-to-Uncategorized wins) rather than re-opening Stage 1, per human
  confirmation ("you are right" — acknowledging the conflict without
  requesting a rewrite). **Architecture/Implementation should build to FR-7
  as written**, but flag this discrepancy again before Stage 6 (Code Review)
  so it doesn't surprise verification against the story's literal AC text.

## Enforcement

Stage approval is now a technical gate, not just an instruction: see
`.claude/hooks/check-stage-approval.sh` (PreToolUse hook, wired in
`.claude/settings.json`) and `.claude/scripts/record-approval.sh`. Tested
2026-09-12: blocks unapproved writes (exit 2), allows exactly once after a
valid `record-approval.sh` call, re-blocks immediately after (single-use),
and passes through non-gated files/tools untouched.

## Notes for whoever/whatever picks this up next

- Requirements are locked (FR-1..FR-8, NFR-1..NFR-4). Architecture stage
  should design against those, not re-litigate scope.
- Repo push access: local commits succeed; pushing to
  `origin` (`https://github.com/SakshiGaba/ClaudeCapstone.git`) requires
  credentials not currently available in this environment — flag this to
  the human each time a stage commits, so they can push manually if needed.
