# Pipeline State

> Read this file first in any session. Update it immediately after finishing
> a stage. This is the single source of truth for "where are we."

**Active story:** ITEMS-101 — Categorize and Filter Items
**Current stage:** 8 — PR (not started)
**Last completed stage:** 7 — Verification (3 traceability-gap tests added, flake mitigated, agreed & committed)

## Stage log

| Stage | Artifact | Status | Commit |
|---|---|---|---|
| 1. Requirements | `my-app/requirements.md` | ✅ Complete — clarified & committed | `1e87fcb` |
| 2. Architecture | `my-app/architecture.md` | ✅ Complete — confirmed, committed, revised per Design Review | `f13efd2`, revised `52b152d` |
| 3. Design Review | `my-app/design-review.md` | ✅ Complete — reviewed & agreed & committed | `52b152d` |
| 4. Implementation Planning | `my-app/impl-plan.md` | ✅ Complete — confirmed & committed | `ada9a6d` |
| 5. Implementation | (source diffs) | ✅ Complete — T1-T12 all done | `48108be` (T1), `37a9b0d` (T2), `0227677` (T3), `064dac1` (T4), `4aa9362` (T5), `bbcf503` (T6), `3280893` (T7), `7a8a500` (T8), `c2a1cb7` (T9), `e5253d8` (T10), `e85a4f2` (T11), `9565b9c` (T12) |
| 6. Code Review | `my-app/code-review.md` | ✅ Complete — reviewed, 2 must-fix items agreed & fixed, committed | `64e4948` (fix), `764bc4d` (code-review.md) |
| 7. Verification | `my-app/verification-report.md` | ✅ Complete — 8 full-suite runs, 3 traceability-gap tests added, flake mitigated with `retries: 1` | `e2bd89a` (tests+config), `5facad8` (verification-report.md + DoD) |
| 8. PR | PR description | ⏳ Not started — current stage | — |

## Open items carried forward

- **Stale `server/db/app.db` from T12's load-test — resolved at Stage 7
  (2026-09-12):** confirmed at Stage 6 that a leftover load-test DB
  (10k+ items) causes real (non-flaky) Playwright failures via slow/timed-out
  `<li>` locator waits, not the contention flake below. Stage 7 started every
  run from a freshly reset DB per this note; no longer an open item, but
  worth remembering for any future full-suite run made shortly after
  `load-test.js` has been run.

- **Pre-existing Playwright worker/DB-contention flake — characterized and
  mitigated at Stage 7 (2026-09-12):** the original `can delete an item`
  test (predates this story, unmodified by any T1-T12 commit) failed
  intermittently across repeated full-suite runs (~1-in-8 observed rate
  across 8 runs total this stage, consistent with Stage 5's ~1-in-3
  observation) — `fullyParallel: true` workers contending on the single
  shared SQLite file, not a defect in any T1-T12/verification code. Agreed
  with human: added `retries: 1` to `playwright.config.js` (commit
  `e2bd89a`) as a low-risk mitigation. 3 clean 16/16 runs confirmed since.
  No longer open — see `my-app/verification-report.md` §1 for full detail.

- **T5 filter-dropdown option-list quirk — resolved at T6 (2026-09-12):**
  T5's `filterOptions` was derived only from currently-loaded `items`. When
  T6 (empty state) was implemented and tested, this surfaced as a real
  FR-5 violation, not just a cosmetic quirk: filtering to a category and
  then emptying it made the `<select>` visually snap back to "All" (no
  matching `<option>` left in the DOM), even though the underlying `filter`
  state and fetched data were still correct for the selected category.
  Fixed as part of T6's commit (`bbcf503`) per human decision: `filterOptions`
  now always unions in the current `filter` value, so the dropdown stays
  visibly on the selected category even with zero matching items. No
  longer an open item — noted here for traceability only.

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

- **Design Review should-note items — planned into `impl-plan.md` at Stage 4
  (2026-09-12), no longer just carried notes:**
  1. Migration-startup failure behavior (fail-fast) — folded into **T1** as
     an explicit implementation requirement.
  2. NFR-1 (200ms/10k items) load-test — **T12**, its own task
     (`server/scripts/load-test.js`). Per human decision, **T12 blocks
     Stage 8 (PR)** — its measured numbers are required Test Evidence, not
     a post-merge fast-follow.
  3. The "All" filter sentinel is client-only — folded into **T3** (server:
     never special-case any literal string) and **T5** (client: omit the
     param for "All") as explicit acceptance criteria.

- **Stage 4 task list for Stage 5 to pick up, in dependency order:** T1
  (schema/migration) → T2, T3 (server endpoints, can proceed in either
  order once T1 is done) → T4 → T5 → T6 → T7 (client, strictly sequential)
  → T8, T9, T10, T11 (Playwright specs, each gated on its feature task) →
  T12 (load-test, gated on T1+T3, blocks Stage 8). Full detail, file
  paths, and acceptance criteria in `my-app/impl-plan.md` §2-3.

## Enforcement — final status (2026-09-12)

A `PreToolUse` hook (`.claude/hooks/check-stage-approval.sh`, registered in
`.claude/settings.json`) was built to make stage approval a technical gate,
not just an instruction, for the 5 scope-defining artifacts
(`requirements.md`, `architecture.md`, `design-review.md`, `impl-plan.md`,
`code-review.md`). **Investigation across Stages 1-4 concluded it does not
actually fire in this human's `claude` CLI environment (Windows/MSYS2),
in any permission mode.** Summary of the investigation, in order:

1. Hook script logic itself: verified correct via 6+ direct manual
   invocations — blocks with no marker, allows-and-consumes with a valid
   marker, re-blocks after consumption, passes through non-gated
   files/tools untouched.
2. First real bug found and fixed: the original script shelled out to
   `python3` for JSON parsing with the failure silently swallowed. On this
   machine `python3` is a non-functional Windows Store alias stub, so
   parsing failed, and the script incorrectly **failed open** (allowed the
   write) instead of closed. Fixed by trying `node` first (this is a
   Node.js project), then `python3`/`python`, and failing **closed**
   (block, exit 2) if none work. Verified with a deliberately-empty-PATH
   test that this now correctly blocks.
3. Even after that fix, markers were still not being consumed on real
   Write/Edit calls in live sessions (Stages 3 and 4). Ruled out via
   `/hooks`: the hook **is** correctly registered (event `PreToolUse`,
   matcher `Write|Edit`, correct command, sourced from
   `.claude/settings.json`).
4. Ruled out "auto mode" (a Claude Code permission mode) short-circuiting
   the hook's decision: switched explicitly to **manual mode** and
   deliberately attempted an unapproved edit to `architecture.md`. It
   still succeeded, with **zero** hook output of any kind (not even a
   swallowed error) — meaning the hook is not being invoked by Claude
   Code's runtime at all in this session, in any mode, not that it's being
   invoked and its decision overridden.

**Conclusion:** this is a platform-level gap in this specific Claude Code
installation — plausibly a Windows/MSYS2 subprocess-spawning issue when
Claude Code's own runtime (not the human) tries to invoke the hook command
— not something fixable by any change to this repository. Recommended:
report to Anthropic via in-app feedback.

**What actually holds the line going forward:** every command file's
Phase B/C/D procedure (ask the human real questions → wait for a real
answer → call `record-approval.sh <stage> "<confirmation>"`, which itself
rejects empty/bogus input → then write → commit) has been followed
correctly and verifiably in all 4 completed stages: every artifact's
content traces back to an actual human decision made in the conversation,
never silently assumed. **This is the real safeguard in this environment —
instruction-following plus an auditable approval-script call, not a tool-
call-level block.** Stage 5 (Implementation) and beyond should continue
following each command's approval procedure exactly as written, and the
human should keep reading what gets written/committed, since that review
is the actual backstop here, not the hook.

## Stage 5 task checklist (implementation, one task per /implement run)

| Task | Status | Commit |
|---|---|---|
| T1 — schema migration + index | ✅ Done | `48108be` |
| T2 — POST validation/defaulting | ✅ Done | `37a9b0d` |
| T3 — GET filter support | ✅ Done | `0227677` |
| T4 — client category input | ✅ Done | `064dac1` |
| T5 — client filter dropdown | ✅ Done | `4aa9362` |
| T6 — client empty state | ✅ Done | `bbcf503` |
| T7 — client delete-under-filter | ✅ Done (no code change needed — already satisfied by T5's loadItems default param) | `3280893` |
| T8 — Playwright add-with/without-category | ✅ Done | `7a8a500` |
| T9 — Playwright filter/empty-state | ✅ Done | `c2a1cb7` |
| T10 — Playwright delete-under-filter | ✅ Done | `e5253d8` |
| T11 — Playwright invalid-input coverage | ✅ Done | `e85a4f2` |
| T12 — load-test script (blocks Stage 8 PR) | ✅ Done — measured avg 142-146ms unfiltered / 26-28ms filtered at 10k items, both under the 200ms NFR-1 threshold | `9565b9c` |

## Known Limitations (from Stage 7, carry directly into Stage 8's PR)

- `server` npm audit: 1 critical + 4 high vulns, all in `sqlite3`'s
  build-time native-addon compile chain (`tar`/`node-gyp`/
  `make-fetch-happen`), not runtime; fix requires breaking `sqlite3` bump.
  Plus 1 moderate `qs`/`express` runtime vuln with a non-breaking
  `npm audit fix` available, not applied in this story's scope.
- `client` npm audit: 30 vulns, all in `react-scripts` build/dev tooling;
  shipped `react`/`react-dom` runtime deps have 0 findings. Standard CRA
  ecosystem debt, not addressed.
- DRY duplication (non-blocking): `category` type-check duplicated between
  `GET`/`POST` handlers in `server/index.js`; schema-migration logic
  duplicated (deliberately) between `server/index.js` and
  `server/scripts/load-test.js`.
- No Playwright spec for `DELETE` of a non-existent item ID (behavior is
  graceful, just untested; not required by NFR-4's enumerated list).
- Concurrent-boot migration safety: startup `ALTER TABLE` check assumes
  single-instance deployment; accepted architectural risk, not fixed
  (see `architecture.md` §8, `design-review.md` §3).
- Playwright worker/DB-contention flake on `can delete an item`: mitigated
  with `retries: 1`, not eliminated at the root (shared SQLite file across
  parallel workers).

Full detail and rationale for each: `my-app/verification-report.md` §5.

## Notes for whoever/whatever picks this up next

- Requirements are locked (FR-1..FR-8, NFR-1..NFR-4). Architecture stage
  should design against those, not re-litigate scope.
- Repo push access: local commits succeed; pushing to
  `origin` (`https://github.com/SakshiGaba/ClaudeCapstone.git`) requires
  credentials not currently available in this environment — flag this to
  the human each time a stage commits, so they can push manually if needed.
