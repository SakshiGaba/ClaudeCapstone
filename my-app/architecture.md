# Architecture: ITEMS-101 — Categorize and Filter Items

**Status:** Proposed and confirmed with human on 2026-09-12
**Builds on:** `my-app/requirements.md` (FR-1..FR-8, NFR-1..NFR-4)

## 1. Overview

This is an **incremental extension** of the existing Items app, not a
rewrite. The current system is a flat React client, an Express REST API,
and a single-table SQLite database (`items(id, name)`). This story adds a
`category` field to that same model end-to-end: client form + filter UI,
server validation + query support, and a database column + index. No new
services, frameworks, or infrastructure are introduced — the existing
three-tier shape (client / server / db) is sufficient for the requirements
as written.

## 2. Component Diagram

```
┌─────────────────────────────┐        ┌──────────────────────────────┐        ┌───────────────────────┐
│   React Client (client/)    │        │   Express Server (server/)   │        │  SQLite (server/db/)  │
│                              │        │                              │        │                        │
│  App.js                     │  HTTP  │  index.js                    │  SQL   │  items table           │
│  - item list + add form      │◄──────►│  - GET  /api/health           │◄──────►│  id  INTEGER PK        │
│  - category input (new)      │        │  - GET  /api/items            │        │  name TEXT NOT NULL    │
│  - category filter (new)     │        │      ?category=<optional>     │        │  category TEXT (new)   │
│  - empty-state view (new)    │        │  - POST /api/items             │        │    NOT NULL            │
│                              │        │      { name, category? }       │        │    DEFAULT             │
│                              │        │  - DELETE /api/items/:id       │        │    'Uncategorized'     │
│                              │        │  + startup migration check     │        │  + expression index on │
│                              │        │  + category validation/default │        │    LOWER(category)     │
└─────────────────────────────┘        └──────────────────────────────┘        └───────────────────────┘
```

## 3. Components and Responsibilities

| Component | Responsibility | What changes for this story |
|---|---|---|
| `client/src/App.js` | Renders item list, add-item form, drives all UI state | Add a `category` text input to the add form; add a category filter control (dropdown/select) driven by distinct categories currently in view; re-fetch or update state after add/delete so the filtered view stays live (FR-4); render an explicit empty-state message when the filtered list is empty (FR-5) instead of the current generic "no items yet" text |
| `server/index.js` | Express routes, request validation, SQL access | `POST /api/items`: accept optional `category`, trim it, default to `Uncategorized` if blank/whitespace-only, reject if >50 chars after trim (FR-1, FR-7); `GET /api/items`: accept optional `category` query param, filter case-insensitively when present (FR-3, NFR-2); add a startup migration routine (see §5) |
| `server/db/app.db` (SQLite) | Persistent storage | New `category` column with a `NOT NULL DEFAULT 'Uncategorized'` constraint (FR-8); new expression index for case-insensitive lookups (NFR-1) |
| `tests/app.spec.js` (Playwright) | End-to-end verification | New specs for: add with category, add without category (defaults), filter by category, filter with zero matches (empty state), delete under an active filter, validation rejection for overlong category (NFR-4) — built in Stage 5/7, not this stage |

No new components are introduced. `client/package.json`'s existing `proxy`
setting already routes `/api/*` to the Express server in development, so no
new plumbing is needed there.

## 4. Data Flow

### Flow A — Add an item with a category
1. User types a name and (optionally) a category in the client form, submits.
2. Client `POST /api/items` with `{ name, category }` (category may be
   omitted or empty).
3. Server trims `name` (existing behavior, unchanged) and `category`.
4. If trimmed `category` is empty → server stores `"Uncategorized"` (FR-1).
5. If trimmed `category` is non-empty and ≤50 chars → server stores it
   as-typed (preserving casing per FR-2).
6. If trimmed `category` is non-empty and >50 chars → server responds
   `400` with a validation message (FR-7); client shows the error, does not
   clear the form.
7. On success, server responds `201` with the created row (id, name,
   category). Client clears the form and re-fetches (or optimistically
   inserts) so the item appears immediately — including if it matches the
   currently active filter (FR-4).

### Flow B — Filter the list by category
1. User selects a category from the filter control (populated from the
   categories currently present in the loaded item set).
2. Client issues `GET /api/items?category=<value>`.
3. Server runs `SELECT * FROM items WHERE LOWER(category) = LOWER(?) ORDER BY id DESC`
   with the expression index from §5 keeping this fast at scale (NFR-1).
4. If zero rows match, client renders the empty-state message and **keeps
   the filter selection as-is** (FR-5) — it does not auto-reset to "All".
5. Selecting "All" (or an equivalent client-side sentinel) simply omits the
   `category` query param, returning the unfiltered list (FR-3).

### Flow C — Delete an item while a filter is active
1. User clicks Delete on a visible (filtered) row.
2. Client `DELETE /api/items/:id` (unchanged endpoint/behavior).
3. On success, client re-fetches under the **current filter** — if that
   was the last item in the active category, the result is the Flow B
   zero-match case, i.e. empty state, filter unchanged (FR-6, FR-5).

## 5. Data Model / Schema Changes

```sql
-- Startup migration (see rationale in §6): run once, guarded by a check.
-- PRAGMA table_info(items) is inspected first; only ALTER if 'category'
-- is not already a column, so this is safe to run on every server start.
ALTER TABLE items ADD COLUMN category TEXT NOT NULL DEFAULT 'Uncategorized';

-- Expression index for fast case-insensitive filtering (NFR-1).
CREATE INDEX IF NOT EXISTS idx_items_category_lower ON items (LOWER(category));
```

Existing rows are backfilled automatically by the `DEFAULT` clause the
moment the column is added — no separate backfill script (FR-8).

## 6. Technology Choices

| Decision | Choice | Rationale |
|---|---|---|
| Migration strategy | **Runtime auto-migration at server startup** (check `PRAGMA table_info(items)` for `category`; `ALTER TABLE` if missing) | Confirmed with human. No migration framework exists in this codebase today (schema is created inline via `CREATE TABLE IF NOT EXISTS`); introducing one (e.g. `knex`/`umzug`) for a single-column addition on a single-table SQLite app would be disproportionate. A guarded, idempotent startup check matches the app's existing style and requires no new dependency. |
| Case-insensitive matching | **SQLite expression index** `CREATE INDEX ... ON items(LOWER(category))`, queries use `WHERE LOWER(category) = LOWER(?)` | Confirmed with human. Keeps the *stored* value's original casing (FR-2's display requirement) while making case-insensitive lookups index-backed rather than a full table scan, satisfying NFR-1 without adding a normalized shadow column (which would need to be kept in sync on every write). |
| Validation location | Server-side only, in `server/index.js` (same file/pattern as existing `name` validation) | NFR-2 explicitly requires server-side enforcement; the existing `name` validation already lives here, so this follows the established pattern rather than introducing a separate validation layer/library. |
| Filter transport | Query parameter on the existing `GET /api/items` endpoint, not a new endpoint | Keeps the API surface minimal; a query param is the conventional REST approach for optional filtering and requires no client-side routing changes. |

## 7. Non-Functional Considerations

| NFR | How this design satisfies it |
|---|---|
| NFR-1 (200ms / 10k items) | Expression index on `LOWER(category)` avoids full-table scans on filtered `GET /api/items` calls. |
| NFR-2 (server-side enforcement) | Filtering and validation both live in `server/index.js`'s request handlers, not just the client; a direct `curl` to the API with `?category=` will be correctly filtered regardless of what the UI does. |
| NFR-3 (backward compatibility) | The `ALTER TABLE ... DEFAULT 'Uncategorized'` migration backfills existing rows in place; no existing data or endpoint contract is broken. |
| NFR-4 (test coverage) | §3 lists the specific new Playwright specs required; this is planned for Stage 5/7, not written here. |

## 8. Risks / Open Questions for Design Review

- **Carried-forward from Stage 1:** the source story's literal AC #7 wants
  whitespace-only categories *rejected*, while `requirements.md` FR-1/FR-7
  (as confirmed by the human) treat them as *omitted* → default to
  `Uncategorized`. This architecture builds to FR-7 as written. Flagging
  again here so Design Review and Code Review don't independently rediscover
  it as if it were new.
- **Startup migration on every boot:** the `ALTER TABLE` check runs on every
  server start (guarded to be a no-op after the first successful run). This
  is safe for a single-instance dev/small-scale deployment but would need
  a proper migration runner (with a schema-version table) if this app ever
  runs with multiple server instances starting concurrently against the
  same DB file — worth a Design Review sanity check.
- **No explicit uniqueness/normalization storage:** two items with
  categories `"Work"` and `"work "` (trailing space) are intentionally
  treated as the same category per FR-2, but nothing prevents the *same*
  logical category from being displayed with inconsistent casing across
  different items (e.g. one item shows "Work", another "work"). This is
  acceptable per requirements (out-of-scope: category CRUD/normalization),
  but worth confirming Design Review agrees this UX inconsistency is
  acceptable rather than something Code Review should flag as a bug.
