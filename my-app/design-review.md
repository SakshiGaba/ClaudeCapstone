# Design Review: ITEMS-101 — Categorize and Filter Items

**Status:** Reviewed and agreed with human on 2026-10-28 (fresh review round on `step1-clean`)
**Reviewed artifact:** `my-app/architecture.md` (as revised for this branch's FR-7 change,
commit `16fc4b6`; further revised per this review — see §4)

## 1. Review Summary

The architecture is a well-reasoned, appropriately minimal delta for this branch's changed FR-7
(whitespace-only category now rejected instead of defaulted) — full FR/NFR traceability, correct
use of parameterized queries, no unnecessary complexity, and the client-side key-omission design
genuinely solves a real serialization ambiguity rather than papering over it. It was **not ready
as-is**: one documentation-accuracy defect (a misleading equivalence claim in §7) needed
correcting before it could mislead a later stage, plus one consistency gap (an unspecified error
message). Both are now resolved; architecture is **approved as revised**.

This is a fresh review round — the previous `design-review.md` on this branch reviewed the
pre-FR-7-change architecture and explicitly re-confirmed the opposite whitespace-only decision as
binding. That review is superseded by this one; it no longer reflects the current scope.

## 2. Findings by Dimension

| Dimension | Finding | Severity | Agreed decision |
|---|---|---|---|
| Correctness vs requirements | Every FR-1..8 and NFR-1..4 maps to something explicit in the architecture. The apparent empty-string-vs-whitespace ambiguity is already resolved by requirements.md's own wording (FR-7 defines whitespace-only operationally as "empty after trimming," which includes the literal empty string) — architecture traces this correctly, no gap introduced. | No issue | No action |
| Security | All SQL uses `?` placeholders; React auto-escapes rendered category text; no new input surface. | No issue | No action |
| Error handling | Every other validation branch in the document names its exact error message; the new whitespace-only-rejection branch (§3, §4 step 5) didn't. | **Should note** | Added `"Category cannot be only whitespace"` to §3 and §4 for consistency and Stage 5/7 readiness. |
| Documentation accuracy | §7's NFR-2 row claimed a direct API call sending `category: ""` "is rejected exactly like one from the UI would be" — inaccurate, since the UI's analogous "untouched field" case omits the key entirely and gets **defaulted**, not rejected. Equating these could mislead Code Review (Stage 6) into expecting behavior that doesn't exist. | **Must address** | Corrected: now explicitly states the equivalence is to a typed-then-cleared-to-whitespace submission, and explicitly states it is *not* equivalent to the untouched-field case. |
| Data integrity / migration | Schema/migration unchanged by this revision — carried forward from the original review unchanged. | No issue (carried) | No action; prior "should note" (unspecified behavior if `ALTER TABLE`/`CREATE INDEX` throws at startup) still stands, still deferred, fail-fast still the reasonable default. |
| Performance & scalability | This revision is validation-only; the expression index and query shape are untouched, so the original NFR-1 reasoning still holds. | No issue | No action |
| Consistency with conventions | The new server branch follows the existing early-return `res.status(400).json({error})` pattern exactly. The client's conditional key-omission is a new idiom in `App.js`, but answers a genuine new need rather than contradicting an existing pattern. | No issue | No action |
| Testability | The client-omission design's entire purpose was to make "omitted" and "whitespace-only" independently reachable and assertable from the UI — confirmed it succeeds: untouched field → defaults (testable); typed-space field → rejected (testable). NFR-4's test list already names both cases explicitly. | No issue | No action |
| Maintainability | Appropriately minimal; no new dependencies or abstractions introduced for this change. | No issue | No action |
| UX design decision | Clearing a previously-typed category back to empty behaves identically to never having typed anything (both omit the key, both default) — a genuine equivalence inherent to the chosen design, not a defect. | Should note (decision, not a defect) | Accepted as-is — matches normal form UX, unsurprising to users. No architecture change. |

## 3. Carried-Forward Risks Re-Assessed (`architecture.md` §8)

1. **Client-omission UX equivalence** — **resolved as an accepted design decision** (see table
   above), not left open. Confirmed with human: no change needed.
2. **Concurrent-boot migration safety** — **still open in principle, unchanged.** Nothing in
   `requirements.md` or the app's current form implies multi-instance deployment; no action needed
   unless that assumption changes. Carried forward from the original (pre-this-branch) review
   without re-litigation, since nothing about this revision touches migration logic.
3. **Cross-item casing inconsistency** — **still resolved/accepted,** unchanged. Matches the
   stated out-of-scope item (no category CRUD/normalization) in `requirements.md` §5.

## 4. Changes Required to `architecture.md`

Made (commit follows this document):

- Added a "Revised per Design Review (2026-10-28)" note under the header.
- §3 (server row) and §4 (Flow A step 5): added the exact validation error message,
  `"Category cannot be only whitespace"`, for the new whitespace-only-rejection branch.
- §7 (NFR-2 row): corrected the misleading equivalence claim — now explicitly distinguishes
  "direct API call with an explicit empty string" (rejected) from "UI's untouched-field
  submission" (omits the key, defaults), rather than conflating them.
- §8 (first risk item): annotated as confirmed/accepted by this Design Review, so it reads as
  resolved rather than still open.

Not changed: Overview, Component Diagram, Data Flow (beyond the one message addition), Data Model,
remaining Technology Choices rows, and the other two §8 risk items — all unchanged from the
Stage 2 revision, no issues found there.
