# Design Review: ITEMS-101 — Categorize and Filter Items

**Status:** Reviewed and agreed with human on 2026-09-12
**Reviewed artifact:** `my-app/architecture.md` (as of commit `f13efd2`; revised per this
review — see §4)

## 1. Review Summary

The architecture is a solid, appropriately minimal delta on the existing React/Express/SQLite
stack — full FR/NFR traceability, correct use of parameterized queries, and no unnecessary
complexity. It was **not ready as-is**: two gaps (an unresolved requirements-vs-story conflict
left open for a later stage, and a missing input-type-safety guard) needed to be closed before
implementation. Both are now resolved; architecture is **approved as revised**.

## 2. Findings by Dimension

| Dimension | Finding | Severity | Agreed decision |
|---|---|---|---|
| Correctness vs requirements | Every FR-1..8 and NFR-1..4 maps to something explicit in the architecture. No silent gaps. | No issue | No action |
| Security | All SQL uses `?` placeholders (parameterized) — no injection risk. React auto-escapes rendered category text. | No issue | No action |
| Error handling | Neither the architecture nor the existing `name`-validation pattern it follows guards against non-string input (`.trim()` on an array/number/`null` throws, surfacing as an uncaught `500`). Directly relevant since NFR-4 requires invalid-input Playwright coverage. | **Must address** | Add explicit `typeof === 'string'` type-checking, returning `400` before any `.trim()`/comparison. Folded into `architecture.md` §3, §4 (Flow A), §6. |
| Correctness (carried risk) | The whitespace-only conflict (story AC #7 "reject" vs. `requirements.md` FR-7 "default to Uncategorized") was logged in `architecture.md` §8 as something to "flag again before Code Review" — too late, since implementation is built one way well before Stage 6. | **Must address** | Resolved now, binding: FR-7 stands — whitespace-only categories default to `Uncategorized`. Re-confirmed with human (same decision as Stage 1). |
| Data integrity / migration | Migration is idempotent (`PRAGMA table_info` guard) and additive (`ALTER TABLE ... ADD COLUMN`, no data-loss risk). Unspecified: behavior if `ALTER TABLE`/`CREATE INDEX` throws at startup (disk full, permissions) — crash vs. silently continue isn't stated. | Should note | Deferred — logged only (§3 below). Fail-fast (crash on startup so the operator notices) is the reasonable default; revisit only if this becomes a real operational issue. |
| Performance & scalability | The `LOWER(category)` expression index matches the query's `WHERE LOWER(category) = LOWER(?)` form, so SQLite's planner can use it — NFR-1 is satisfied. At ≤10k rows a full scan would likely also hit 200ms, so the index isn't strictly load-bearing yet, but it's cheap and future-proofs the design. | No issue (minor observation) | No action |
| Consistency with conventions | Matches existing callback-style `db.run`/`db.all` and validation placement in `server/index.js`. | No issue | No action |
| Testability | NFR-1's 200ms/10k-item claim can't be verified by Playwright UI assertions alone — needs a seeded dataset and server-side timing, not mentioned anywhere in the architecture or requirements. | Should note | Deferred — logged only (§3 below). To be planned explicitly at Stage 4 (Implementation Planning): a seed script + direct timing check, separate from the Playwright UI suite. |
| Maintainability | Smallest design that satisfies requirements; no new dependencies or abstractions introduced. | No issue | No action |
| "All" sentinel handling | The design has the client omit the `category` param entirely for "All" (Flow B step 5), which correctly avoids any collision with a real category literally named "All" — but this is implicit, not stated. An implementation that instead special-cased the literal string `"All"` server-side would make a category actually named "All" unreachable. | Should note | Deferred — logged only (§3 below), no `architecture.md` change. Implementation should keep "All" as a client-only concept (omit the param); the server must never special-case any specific string value. |

## 3. Carried-Forward Risks Re-Assessed (`architecture.md` §8, pre-revision)

1. **Whitespace-only conflict (AC #7 vs. FR-7)** — **reframed and resolved as a binding decision
   at this stage**, rather than left open for Code Review. FR-7 stands: whitespace-only categories
   default to `Uncategorized`. This is final for implementation; Stage 6 (Code Review) should treat
   it as settled, not rediscover it.
2. **Concurrent-boot migration safety** — **still open in principle, accepted for current scope.**
   Nothing in `requirements.md` or the app's current form implies multi-instance deployment; no
   action needed unless that assumption changes. (Related "should note" above: what happens if the
   migration itself throws — recommend fail-fast, not addressed by an architecture change.)
3. **Cross-item casing inconsistency** — **resolved.** Explicitly matches the stated out-of-scope
   item (no category CRUD/normalization) in `requirements.md` §5. Accepted as designed.

## 4. Changes Required to `architecture.md`

Made (commit follows this document):

- Added a "Revised per Design Review" note under the header.
- §3 (`server/index.js` row): now specifies rejecting non-string `name`/`category` (body) and
  non-string `category` (query param) with `400` before any `.trim()`/comparison.
- §4 Flow A: inserted an explicit type-validation step (new step 3) ahead of trimming; renumbered
  subsequent steps accordingly.
- §6 Technology Choices: added an "Input type-checking" decision row with rationale tying it to
  NFR-4's invalid-input coverage requirement.

Not changed (deferred per human decision, logged above instead): migration-failure fail-fast
behavior, NFR-1 load-test planning, and the "All" sentinel clarification. These carry forward as
notes for Stage 4 (Implementation Planning) and Stage 6 (Code Review) to be aware of, not
architecture edits.
