# Implementation Plan: ITEMS-101 — Categorize and Filter Items

**Status:** Confirmed with human on 2026-10-28 (fresh planning round on `step1-clean`)
**Builds on:** `my-app/architecture.md` (as revised per Design Review, commit `d38dd8d`),
`my-app/design-review.md`

This supersedes the prior `impl-plan.md` on this branch, which was built against the old FR-7
behavior (whitespace-only category defaulting to `Uncategorized` rather than being rejected) and
had no task for the client-side key-omission logic this branch's architecture requires.

## 1. Ordering Principle

Tasks are sequenced **layer-complete**: schema/migration first (nothing else is testable until
the `category` column exists), then all server-side endpoint changes together (both `POST` and
`GET /api/items` live in the same `server/index.js` file, naturally written in one pass), then all
client-side UI changes, then tests alongside each feature. Confirmed with the human over the
feature-slice alternative, which would mean reopening `index.js` three separate times for no real
benefit given how small and shared that file already is — same precedent as the original plan for
this story. The NFR-1 load-test task runs last, once both the schema and the filtering query it
measures exist, and continues to **block Stage 8 (PR)** per human decision — its measured numbers
are required Test Evidence, not a post-merge fast-follow.

## 2. Task List

| ID | Task | Files touched | Satisfies (FR/NFR) | Depends on | Priority |
|---|---|---|---|---|---|
| T1 | Startup migration: add `category TEXT NOT NULL DEFAULT 'Uncategorized'` column and a `LOWER(category)` expression index, guarded by a `PRAGMA table_info(items)` check so it's a no-op after the first run. Fail-fast on error (crash/log loudly rather than silently continuing on a broken schema) per Design Review's "still deferred, fail-fast reasonable default" note. Unchanged from the original plan — FR-7's change doesn't touch the schema. | `my-app/server/index.js` (schema block, ~L10-15) | FR-8, NFR-3 | — | P0 |
| T2 | `POST /api/items`: reject non-string `name`/`category` with `400` *before* any `.trim()` call; then branch on **presence, not just truthiness**: `category === undefined` → default to `'Uncategorized'` (FR-1); `category` is a string that trims to `''` → reject `400` with exact message `"Category cannot be only whitespace"` (FR-7, **changed this branch** — previously this case silently defaulted); trimmed non-empty >50 chars → reject `400` (FR-7, unchanged message); otherwise store as-typed, preserving casing (FR-2). | `my-app/server/index.js` (`POST /api/items` handler, ~L83-110) | FR-1, FR-2, FR-7, NFR-2 | T1 | P0 |
| T3 | `GET /api/items`: accept optional `category` query param; reject a non-string value (e.g. a repeated `?category=` producing an array) with `400`; when present, filter via `WHERE LOWER(category) = LOWER(?)` (case-insensitive, FR-2/FR-3); when absent, return all items unfiltered. Server never special-cases any literal string (including `"All"`) — "All" is purely a client-side concept of omitting the param. Unchanged from the original plan. | `my-app/server/index.js` (`GET /api/items` handler, ~L64-80) | FR-3, NFR-1, NFR-2 | T1 | P0 |
| T4 | Client: add a `category` text input to the add-item form. **Build the POST body so the `category` key is included only when the raw (untyped/untrimmed) input state is non-empty** — an untouched or cleared-back-to-`''` field omits the key entirely (server defaults it, FR-1); any typed content, including pure whitespace, is sent as-is (server may reject it, FR-7). This is new logic this branch requires — on `main`, the body always included `category` unconditionally. Clear both fields on success; on a `400` show the server's validation message inline without clearing the form (existing generic error-display path, no new client validation logic). | `my-app/client/src/App.js` (`addItem`, form inputs) | FR-1, FR-2, FR-7 | T2 | P1 |
| T5 | Client: add a category filter control (dropdown/select, populated from categories present in the currently loaded item set, plus an "All" option); selecting a category issues `GET /api/items?category=<value>`; selecting "All" omits the `category` param entirely (never sent as a literal value). Unchanged from the original plan. | `my-app/client/src/App.js` | FR-3, FR-4 | T3, T4 | P1 |
| T6 | Client: when the active filter's result set is empty, render an explicit empty-state message (e.g. "No items in this category") instead of the current generic "No items yet" text; filter selection is not changed automatically. Unchanged from the original plan. | `my-app/client/src/App.js` | FR-5 | T5 | P1 |
| T7 | Client: after a successful delete, re-fetch under the **currently active filter** (not the unfiltered list), so deleting the last item in a filtered view correctly falls into the T6 empty state without resetting the filter. Unchanged from the original plan. | `my-app/client/src/App.js` | FR-6 | T5, T6 | P1 |
| T8 | Playwright: add specs for (a) add item with an explicit non-whitespace category, (b) add item with the category field left **untouched** → verify it's stored as `Uncategorized` (the omitted-key path, FR-1). This is narrower than the original plan's T8, which also covered "whitespace-only" here — that case moves to T11 since it now has the opposite expected outcome. | `my-app/tests/app.spec.js` | NFR-4, FR-1, FR-2 | T4 | P1 |
| T9 | Playwright: add specs for (a) filter list by a category and see only matching items, (b) filter to a category with zero items and see the empty-state message (not an error, not a blank screen). Unchanged from the original plan. | `my-app/tests/app.spec.js` | NFR-4, FR-3, FR-4, FR-5 | T6 | P1 |
| T10 | Playwright: add spec for deleting the last item in an active filtered view — item disappears, empty state shown, filter selection unchanged. Unchanged from the original plan. | `my-app/tests/app.spec.js` | NFR-4, FR-6 | T7 | P1 |
| T11 | Playwright: add invalid-input specs — (a) category over 50 chars → `400` with its validation message (unchanged); (b) **category field typed with only whitespace** (e.g. fill a single space) → `400` with `"Category cannot be only whitespace"` — this is the opposite expectation from the original plan's T11, which expected this to succeed as `Uncategorized`; this spec is the one that actually proves the omitted-vs-whitespace distinction works end-to-end through the real UI, not just the untouched-field case in T8; (c) non-string/array `category` or `name` → `400`, not a `500` (unchanged). | `my-app/tests/app.spec.js` | NFR-4, FR-7 | T2, T3, T4 | P1 |
| T12 | Load-test script: seed ~10,000 items with a mix of categories directly against the SQLite DB (bypassing the API for seed speed), then time `GET /api/items` both unfiltered and filtered (`?category=`), asserting sub-200ms and printing the measured numbers for the PR's Test Evidence section. Unchanged from the original plan — FR-7's change doesn't affect query performance. | new file: `my-app/server/scripts/load-test.js` | NFR-1 | T1, T3 | P0 (blocks Stage 8 PR per human decision) |

## 3. Blocked Tasks

- **T2, T3** blocked until **T1** completes — the `category` column must exist before either
  endpoint can read or write it.
- **T4** blocked until **T2** completes — the client's key-omission logic only matters once the
  server actually implements the branching it's designed to trigger.
- **T5** blocked until **T3** and **T4** complete — needs both the filtering API and a way to
  create categorized items to filter against.
- **T6** blocked until **T5** completes — the empty state only makes sense once filtering exists.
- **T7** blocked until **T5** and **T6** complete — re-fetching "under the active filter" requires
  both the filter state (T5) and the empty-state rendering (T6) to already be in place.
- **T8** blocked until **T4** completes; **T9** until **T6**; **T10** until **T7** — each test task
  needs the feature it exercises to exist first.
- **T11** blocked until **T2**, **T3**, and **T4** complete — the whitespace-only-rejection spec
  (b) exercises the full round trip: client must actually send the typed-whitespace value (T4),
  and the server must reject it (T2); the other sub-specs only need T2/T3.
- **T12** blocked until **T1** and **T3** complete — needs the schema and the filtered query it's
  timing.

## 4. Deferred Items Carried From Design Review

This round's `design-review.md` resolved its two real findings directly within `architecture.md`
(the §7 wording fix and the exact error message) rather than deferring either to planning — so
there is nothing newly deferred from this round. Two items carried forward from the *original*
(pre-`step1-clean`) design review still apply unchanged, since neither is affected by the FR-7
change:

| Design Review item | Disposition |
|---|---|
| Migration-startup failure behavior (fail-fast recommended) | Folded into **T1** as an explicit implementation requirement, not a separate task. |
| NFR-1 load-test plan (seed script + timing) | **T12**, its own task. Confirmed with human (this round, again): **blocks Stage 8** (PR) — its measured numbers are required Test Evidence. |

The "All"-sentinel-is-client-only note from the original review is folded into **T3** (server: no
special-casing) and **T5** (client: omit the param) as before, unchanged.

## 5. Out of Plan

Restated from `requirements.md` §5 so implementation doesn't accidentally build any of this:

- Multi-category tagging per item (one category per item only).
- User-managed category CRUD — no admin UI for defining/renaming/deleting category names;
  categories remain free-text with no server-side registry.
- Sorting or bulk-editing items.
- A fixed enum/dropdown of pre-defined categories (the T5 filter dropdown lists categories
  *observed in current data*, not a maintained/predefined list).
