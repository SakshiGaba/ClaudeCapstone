# Pipeline State

> Read this file first in any session. Update it immediately after finishing
> a stage. This is the single source of truth for "where are we."

**Active story:** ITEMS-101 — Categorize and Filter Items
**Current stage:** 4 — Implementation Planning (not started)
**Last completed stage:** 3 — Design Review

## Stage log

| Stage | Artifact | Status | Commit |
|---|---|---|---|
| 1. Requirements | `my-app/requirements.md` | ✅ Complete — clarified & committed | `1e87fcb` |
| 2. Architecture | `my-app/architecture.md` | ✅ Complete — confirmed, committed, revised per Design Review | `f13efd2`, revised `52b152d` |
| 3. Design Review | `my-app/design-review.md` | ✅ Complete — reviewed & agreed & committed | `52b152d` |
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
  **Update:** carried into `architecture.md` §8 as an explicit Design
  Review risk, so it's now tracked in two places by design — not lost.
  **Resolved at Stage 3 (2026-09-12):** re-confirmed with human as a
  binding decision, not just a note for later — FR-7 stands
  (whitespace-only → `Uncategorized`). See `my-app/design-review.md` §2/§3.
  Implementation and Code Review should treat this as settled.

- **Design Review must-address items resolved into `architecture.md`
  (2026-09-12):** input type-checking added — non-string `name`/`category`
  (body) and non-string `category` (query param) must be rejected with
  `400` before any `.trim()`/comparison, to avoid uncaught-exception `500`s
  on malformed input (ties to NFR-4). See `architecture.md` §3/§4/§6 and
  `my-app/design-review.md` §2 finding.

- **Design Review should-note items, deferred (not architecture.md
  changes), for Stage 4/5/6 to carry forward:**
  1. Migration-startup failure behavior (fail-fast recommended, not yet
     coded) — see `design-review.md` §2.
  2. NFR-1 (200ms/10k items) needs an explicit load-test plan (seed
     script + timing), separate from Playwright UI specs — must be
     planned at Stage 4.
  3. The "All" filter sentinel is client-only (omit the `category` param);
     the server must never special-case a literal `"All"` string — keep
     this in mind during Stage 5 implementation.

## Enforcement

Stage approval is now a technical gate, not just an instruction: see
`.claude/hooks/check-stage-approval.sh` (PreToolUse hook, wired in
`.claude/settings.json`) and `.claude/scripts/record-approval.sh`. Tested
2026-09-12: blocks unapproved writes (exit 2), allows exactly once after a
valid `record-approval.sh` call, re-blocks immediately after (single-use),
and passes through non-gated files/tools untouched.

**Important caveat found during Stage 2 (2026-09-12):** the hook only fires
when *Claude Code's own* `Write`/`Edit` tools are used. A sandbox/script
that writes the file through a different mechanism (e.g. a generic
file-creation tool outside Claude Code) will not trigger `PreToolUse` and
will not consume the marker automatically — this was observed firsthand
when `architecture.md` was authored outside a live Claude Code session; the
marker had to be consumed manually afterward to keep the audit trail
correct. In a real `claude` CLI/VS Code session (as used for Stage 1), this
does not occur — `Write`/`Edit` always go through the hook.

**Recurred at Stage 3 (2026-09-12):** both the `architecture` marker (across
4 `Edit` calls revising `architecture.md`) and the `design-review` marker
(one `Write` call for `design-review.md`) were left un-consumed after
otherwise-successful writes in this session, and were removed manually
immediately after to keep the audit trail accurate. Content of both writes
was verified correct via `git diff`/read-back before commit — this caveat
affects marker bookkeeping only, not the human-approval requirement itself
(approval was still obtained and content still matches what was approved).

**ROOT CAUSE FOUND AND FIXED (2026-09-12):** the earlier "VS Code extension
doesn't read settings.json" theory was **wrong** — the human confirmed
Stages 2-3 were run via a genuine `claude` CLI session in a real terminal
(they typed `claude` and pressed enter themselves). The actual bug: the
hook script's JSON parsing shelled out to `python3` with
`2>/dev/null || echo ""` swallowing any failure. On the human's machine
(Windows, MSYS2 bash), `python3` resolves to a Microsoft Store alias stub,
not a real interpreter — so parsing silently failed, `TOOL_NAME` came back
empty, the `if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]`
check treated that as "not a gated tool," and the script exited 0
(**allowed**) before ever checking the approval marker. This is a **fail-open**
bug in a component whose entire job is to fail closed.

**Fix shipped:** `check-stage-approval.sh` rewritten to try `node` first
(this is a Node.js project — node is expected to be present in any dev
environment for it), then `python3`, then `python`, and if **none** parse
successfully, the hook now explicitly **blocks (exit 2)** with a clear error
telling the human to install Node or Python — it no longer silently no-ops.
Re-verified with 6 test cases including a deliberately empty-PATH
simulation of "no interpreter available," which now correctly fails closed
instead of allowing the write. **Action for the human:** pull this fix,
re-run the same manual diagnostic (`echo '{...}' | bash
.claude/hooks/check-stage-approval.sh`) to confirm `node` is found and used
on your machine, then retry a real Write/Edit in a `claude` session to
confirm the block is now visible.

## Notes for whoever/whatever picks this up next

- Requirements are locked (FR-1..FR-8, NFR-1..NFR-4). Architecture stage
  should design against those, not re-litigate scope.
- Repo push access: local commits succeed; pushing to
  `origin` (`https://github.com/SakshiGaba/ClaudeCapstone.git`) requires
  credentials not currently available in this environment — flag this to
  the human each time a stage commits, so they can push manually if needed.
