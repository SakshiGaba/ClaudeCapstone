# Implementation Plan: ITEMS-101 — Categorize and Filter Items

**Status:** Confirmed with human on 2026-09-12
**Builds on:** `my-app/architecture.md` (as revised per Design Review), `my-app/design-review.md`

## 1. Ordering Principle

Tasks are sequenced **layer-complete**: schema/migration first (nothing else is testable until
the `category` column exists), then all server-side endpoint changes together (both `POST` and
`GET /api/items` live in the same `server/index.js` file and their validation/filtering logic is
naturally written in one pass), then all client-side UI changes, then tests. This was confirmed
with the human over the alternative (feature-slice: schema→server→client→test per flow), which
would have meant re-opening `index.js` three separate times for no real benefit given how small
and shared that file already is. The NFR-1 load-test task runs last, once both the schema and the
filtering query it measures exist.

## 2. Task List

| ID | Task | Files touched | Satisfies (FR/NFR) | Depends on | Priority |
|---|---|---|---|---|---|
| T1 | Startup migration: add `category TEXT NOT NULL DEFAULT 'Uncategorized'` column and a `LOWER(category)` expression index, guarded by a `PRAGMA table_info(items)` check so it's a no-op after the first run. Fail-fast on error (let the process crash/log loudly rather than silently continuing on a broken schema) per Design Review should-note #1. | `my-app/server/index.js` (schema block, ~L10-15) | FR-8, NFR-3 | — | P0 |
| T2 | `POST /api/items`: reject non-string `name`/`category` with `400` *before* any `.trim()` call (Design Review finding B); then trim; default blank/whitespace-only `category` to `Uncategorized` (FR-1); reject a trimmed `category` over 50 chars with `400` (FR-7); preserve original casing on store (FR-2). | `my-app/server/index.js` (`POST /api/items` handler, ~L30-40) | FR-1, FR-2, FR-7, NFR-2, Design Review finding B | T1 | P0 |
| T3 | `GET /api/items`: accept optional `category` query param; reject a non-string value (e.g. a repeated `?category=` producing an array) with `400`; when present, filter via `WHERE LOWER(category) = LOWER(?)` (case-insensitive, FR-2/FR-3); when absent, return all items unfiltered. Server never special-cases any literal string (including `"All"`) — "All" is purely a client-side concept of omitting the param (Design Review "All"-sentinel note). | `my-app/server/index.js` (`GET /api/items` handler, ~L22-28) | FR-3, NFR-1, NFR-2, Design Review finding B + "All" sentinel note | T1 | P0 |
| T4 | Client: add a `category` text input to the add-item form; include `category` in the `POST /api/items` body; clear both fields on success; on a `400` show the validation message inline without clearing the form. | `my-app/client/src/App.js` | FR-1, FR-2 | T2 | P1 |
| T5 | Client: add a category filter control (dropdown/select, populated from categories present in the currently loaded item set, plus an "All" option); selecting a category issues `GET /api/items?category=<value>`; selecting "All" omits the `category` param entirely (never sent as a literal value). | `my-app/client/src/App.js` | FR-3, FR-4 | T3, T4 | P1 |
| T6 | Client: when the active filter's result set is empty, render an explicit empty-state message (e.g. "No items in this category") instead of the current generic "No items yet" text; filter selection is not changed automatically. | `my-app/client/src/App.js` | FR-5 | T5 | P1 |
| T7 | Client: after a successful delete, re-fetch under the **currently active filter** (not the unfiltered list), so deleting the last item in a filtered view correctly falls into the T6 empty state without resetting the filter. | `my-app/client/src/App.js` | FR-6 | T5, T6 | P1 |
| T8 | Playwright: add specs for (a) add item with an explicit category, (b) add item with category omitted/blank/whitespace-only → stored as `Uncategorized`. | `my-app/tests/app.spec.js` | NFR-4, FR-1, FR-2 | T4 | P1 |
| T9 | Playwright: add specs for (a) filter list by a category and see only matching items, (b) filter to a category with zero items and see the empty-state message (not an error, not a blank screen). | `my-app/tests/app.spec.js` | NFR-4, FR-3, FR-4, FR-5 | T6 | P1 |
| T10 | Playwright: add spec for deleting the last item in an active filtered view — item disappears, empty state shown, filter selection unchanged. | `my-app/tests/app.spec.js` | NFR-4, FR-6 | T7 | P1 |
| T11 | Playwright: add invalid-input specs — category over 50 chars → `400` with validation message; whitespace-only category → success with `Uncategorized` (not a `400`, confirming the resolved FR-7 behavior); non-string/array `category` or `name` (e.g. a repeated query param, or a JSON body with `category: 123`) → `400`, not a `500`. | `my-app/tests/app.spec.js` | NFR-4, FR-7, Design Review finding B | T2, T3 | P1 |
| T12 | Load-test script: seed ~10,000 items with a mix of categories directly against the SQLite DB (bypassing the API for seed speed), then time `GET /api/items` both unfiltered and filtered (`?category=`), asserting sub-200ms and printing the measured numbers for the PR's Test Evidence section. | new file: `my-app/server/scripts/load-test.js` | NFR-1, Design Review deferred item #2 | T1, T3 | P0 (blocks Stage 8 PR per human decision) |

## 3. Blocked Tasks

- **T2, T3** blocked until **T1** completes — the `category` column must exist before either
  endpoint can read or write it.
- **T4** blocked until **T2** completes — the client shouldn't send a field the server doesn't
  yet accept/validate.
- **T5** blocked until **T3** and **T4** complete — needs both the filtering API and a way to
  create categorized items to filter against.
- **T6** blocked until **T5** completes — the empty state only makes sense once filtering exists.
- **T7** blocked until **T5** and **T6** complete — re-fetching "under the active filter" requires
  both the filter state (T5) and the empty-state rendering (T6) to already be in place.
- **T8** blocked until **T4** completes; **T9** until **T6**; **T10** until **T7** — each test task
  needs the feature it exercises to exist first.
- **T11** blocked until **T2** and **T3** complete — exercises validation in both endpoints.
- **T12** blocked until **T1** and **T3** complete — needs the schema and the filtered query it's
  timing.

## 4. Deferred Items Carried From Design Review

| Design Review item | Disposition |
|---|---|
| Migration-startup failure behavior (fail-fast recommended) | Folded into **T1** as an explicit implementation requirement, not a separate task. |
| NFR-1 load-test plan (seed script + timing) | **T12**, its own task. Per human decision, this **blocks Stage 8** (PR) — its measured numbers are required Test Evidence, not a post-merge fast-follow. |
| "All" sentinel is client-only, server never special-cases it | Folded into **T3** (server: no special-casing) and **T5** (client: omit the param) as explicit acceptance criteria, not a separate task. |

## 5. Out of Plan

Restated from `requirements.md` §5 so implementation doesn't accidentally build any of this:

- Multi-category tagging per item (one category per item only).
- User-managed category CRUD — no admin UI for defining/renaming/deleting category names;
  categories remain free-text with no server-side registry.
- Sorting or bulk-editing items.
- A fixed enum/dropdown of pre-defined categories (the T5 filter dropdown lists categories
  *observed in current data*, not a maintained/predefined list).
