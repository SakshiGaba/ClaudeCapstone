# Architecture: ITEMS-101 — Categorize and Filter Items

**Status:** Revised on `step1-clean` (2026-10-28) to reflect `requirements.md`'s
new FR-7 (whitespace-only category is rejected, not defaulted). Original
version proposed/confirmed 2026-09-12, revised per Design Review the same
day; both of those predate this branch's requirements change.
**Builds on:** `my-app/requirements.md` (FR-1..FR-8, NFR-1..NFR-4) as finalized
on `step1-clean`

**Revised per Design Review (2026-10-28):** corrected a misleading NFR-2
sentence in §7 and specified the exact whitespace-rejection error message in
§3/§4 — see `my-app/design-review.md` §2 findings.

## 1. Overview

This is an **incremental extension** of the existing Items app, not a
rewrite. The current system is a flat React client, an Express REST API,
and a single-table SQLite database (`items(id, name)`). This story adds a
`category` field to that same model end-to-end: client form + filter UI,
server validation + query support, and a database column + index. No new
services, frameworks, or infrastructure are introduced — the existing
three-tier shape (client / server / db) is sufficient for the requirements
as written.

**What's different on this branch vs. the version that shipped on `main`:**
FR-7 now rejects a whitespace-only category instead of silently defaulting
it to `Uncategorized`. Because the client's category `<input>` is a React
controlled field that always holds a string (`''` by default), "the field
was left blank" and "the field holds only whitespace" are otherwise
indistinguishable once JSON-serialized — so this revision also changes how
the **client** builds its request body, not just the server's validation.

## 2. Component Diagram

```
┌─────────────────────────────┐        ┌──────────────────────────────┐        ┌───────────────────────┐
│   React Client (client/)    │        │   Express Server (server/)   │        │  SQLite (server/db/)  │
│                              │        │                              │        │                        │
│  App.js                     │  HTTP  │  index.js                    │  SQL   │  items table           │
│  - item list + add form      │◄──────►│  - GET  /api/health           │◄──────►│  id  INTEGER PK        │
│  - category input (new)      │        │  - GET  /api/items            │        │  name TEXT NOT NULL    │
│    omits key if untouched     │        │      ?category=<optional>     │        │  category TEXT (new)   │
│  - category filter (new)     │        │  - POST /api/items             │        │    NOT NULL            │
│  - empty-state view (new)    │        │      { name, category? }       │        │    DEFAULT             │
│                              │        │      omitted → default;        │        │    'Uncategorized'     │
│                              │        │      whitespace-only → 400     │        │  + expression index on │
│                              │        │  - DELETE /api/items/:id       │        │    LOWER(category)     │
│                              │        │  + startup migration check     │        │                        │
└─────────────────────────────┘        └──────────────────────────────┘        └───────────────────────┘
```

## 3. Components and Responsibilities

| Component | Responsibility | What changes for this story |
|---|---|---|
| `client/src/App.js` | Renders item list, add-item form, drives all UI state | Add a `category` text input to the add form; **build the POST body so `category` is included only when the raw input state is non-empty** (`''` → key omitted; anything the user typed, including pure whitespace, → key included as-is) so the server can tell "nothing entered" from "whitespace entered" apart; add a category filter control (dropdown/select) driven by distinct categories currently in view; re-fetch or update state after add/delete so the filtered view stays live (FR-4); render an explicit empty-state message when the filtered list is empty (FR-5); render the server's validation error text as-is on rejection (no new client-side validation logic needed — the existing generic error-display path already covers this, see §4 Flow A) |
| `server/index.js` | Express routes, request validation, SQL access | `POST /api/items`: reject non-string `name`/`category` (arrays, numbers, objects, `null`) with `400` *before* any `.trim()` call, then branch on presence: `category === undefined` → default to `'Uncategorized'` (FR-1); `category` is a string that trims to `''` → reject `400` with `"Category cannot be only whitespace"` (FR-7, new behavior this branch); otherwise trim, reject `400` if >50 chars, else store as-typed. `GET /api/items`: accept optional `category` query param, reject a non-string value with `400`, filter case-insensitively otherwise (FR-3, NFR-2); add a startup migration routine (see §5) |
| `server/db/app.db` (SQLite) | Persistent storage | New `category` column with a `NOT NULL DEFAULT 'Uncategorized'` constraint (FR-8); new expression index for case-insensitive lookups (NFR-1) |
| `tests/app.spec.js` (Playwright) | End-to-end verification | New specs for: add with category, add without category via an untouched field (defaults), add with a whitespace-only-typed category (now a rejection case, distinct from the untouched-field case), filter by category, filter with zero matches (empty state), delete under an active filter, validation rejection for overlong category (NFR-4) — built in Stage 5/7, not this stage |

No new components are introduced. `client/package.json`'s existing `proxy`
setting already routes `/api/*` to the Express server in development, so no
new plumbing is needed there.

## 4. Data Flow

### Flow A — Add an item with a category

1. User types a name and (optionally) a category in the client form, submits.
2. **Client builds the request body:** always includes `name`; includes
   `category` **only if** the raw category input state is non-empty (i.e.
   the user typed at least one character — a bare space counts). If the
   field was never touched (or was cleared back to `''`), the `category`
   key is omitted from the JSON body entirely.
3. Client `POST /api/items` with that body.
4. **Server validates type first:** if `name` is present but not a string,
   or `category` is present but not a string, respond `400` immediately —
   do not call `.trim()` on a non-string value (which would throw and
   surface as an uncaught 500).
5. **Server branches on presence, not just truthiness:**
   - `category === undefined` (key was omitted) → treat as "no category
     provided," store `"Uncategorized"` (FR-1).
   - `category` is a string → trim it. If the trimmed result is `''`
     (i.e. the field was present but held only whitespace) → respond `400`
     with `"Category cannot be only whitespace"` (FR-7, **new** on this
     branch — previously this case silently defaulted).
   - Trimmed, non-empty, ≤50 chars → store as-typed (preserving casing per
     FR-2).
   - Trimmed, non-empty, >50 chars → respond `400` (FR-7, unchanged).
6. Client shows the server's error message on any `400` (existing generic
   error-display path — no new client validation logic required) and does
   not clear the form.
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
moment the column is added — no separate backfill script (FR-8). Unchanged
from the original architecture; FR-7's change does not affect the schema.

## 6. Technology Choices

| Decision | Choice | Rationale |
|---|---|---|
| Migration strategy | **Runtime auto-migration at server startup** (check `PRAGMA table_info(items)` for `category`; `ALTER TABLE` if missing) | Unchanged from the original architecture — no migration framework exists in this codebase today; a guarded, idempotent startup check matches the app's existing style and requires no new dependency. |
| Case-insensitive matching | **SQLite expression index** `CREATE INDEX ... ON items(LOWER(category))`, queries use `WHERE LOWER(category) = LOWER(?)` | Unchanged. Keeps the *stored* value's original casing (FR-2's display requirement) while making case-insensitive lookups index-backed, satisfying NFR-1. |
| Validation location | Server-side only, in `server/index.js` (same file/pattern as existing `name` validation) | Unchanged. NFR-2 requires server-side enforcement. |
| Filter transport | Query parameter on the existing `GET /api/items` endpoint, not a new endpoint | Unchanged. Minimal API surface, conventional REST pattern. |
| Input type-checking | Explicit `typeof === 'string'` guard on `name`/`category` (body) and `category` (query param), returning `400` before any `.trim()`/comparison | Unchanged from the Design-Review-era revision — prevents a non-string value from throwing and surfacing as an uncaught `500`. |
| **Omitted-vs-whitespace boundary (new this revision)** | **Client includes the `category` key in the POST body only when the raw input state is non-empty** (untouched/cleared field → key omitted; any typed content, including pure whitespace, → key included as-is); server branches on `undefined` (default) vs. present-but-trims-to-empty (reject) | Confirmed with human. FR-1 (omitted → default) and FR-7 (whitespace-only → reject) are only distinguishable at the server if the client can actually produce both states on the wire. A React controlled input defaults to `''`, which is indistinguishable from "user typed only spaces" once serialized unless the client itself preserves that distinction. This choice keeps the common "leave category blank" happy path working (still defaults, matching AC #2) while making "typed only spaces" a real, user-visible validation error rather than an unreachable code path. |

## 7. Non-Functional Considerations

| NFR | How this design satisfies it |
|---|---|
| NFR-1 (200ms / 10k items) | Expression index on `LOWER(category)` avoids full-table scans on filtered `GET /api/items` calls. |
| NFR-2 (server-side enforcement) | Filtering and validation both live in `server/index.js`'s request handlers, not just the client; a direct `curl` to the API with `?category=` will be correctly filtered regardless of what the UI does. The new omitted-vs-whitespace-only branch is also enforced server-side: a direct API call sending an explicit `category: ""` is rejected — matching what the UI would produce if a user *typed something and then cleared it back to whitespace* before submitting. It is **not** equivalent to the UI's "never touched the field" case, which omits the `category` key entirely and gets defaulted, not rejected. (Corrected per Design Review — the prior wording conflated these two cases.) |
| NFR-3 (backward compatibility) | The `ALTER TABLE ... DEFAULT 'Uncategorized'` migration backfills existing rows in place; no existing data or endpoint contract is broken. |
| NFR-4 (test coverage) | §3 lists the specific new Playwright specs required, including a dedicated whitespace-only-rejection case distinct from the untouched-field-defaults case; planned for Stage 5/7, not written here. |

## 8. Risks / Open Questions for Design Review

- **Resolved this revision — flag to Design Review as a decision to sanity-check,
  not an open question:** the story-vs-requirements conflict noted in the
  original architecture (AC #7 wants whitespace-only rejected; the
  `main`/`step1-rerun` requirements had it default instead) no longer exists
  on this branch — `requirements.md` now matches AC #7 literally. What's new
  and worth Design Review's attention instead is the **client-side
  key-omission mechanism** in §6: it's a reasonable solution to a real
  serialization ambiguity, but it does mean a user who clears a previously-
  typed category back to empty behaves identically to one who never typed
  anything (both omit the key) — confirm this UX equivalence is acceptable.
  **Confirmed by Design Review (2026-10-28):** accepted as-is, no change —
  matches normal form UX, unsurprising to users.
- **Startup migration on every boot:** the `ALTER TABLE` check runs on every
  server start (guarded to be a no-op after the first successful run). This
  is safe for a single-instance dev/small-scale deployment but would need
  a proper migration runner (with a schema-version table) if this app ever
  runs with multiple server instances starting concurrently against the
  same DB file — worth a Design Review sanity check. (Unchanged from the
  original architecture.)
- **No explicit uniqueness/normalization storage:** two items with
  categories `"Work"` and `"work "` (trailing space) are intentionally
  treated as the same category per FR-2, but nothing prevents the *same*
  logical category from being displayed with inconsistent casing across
  different items. Acceptable per requirements (out-of-scope: category
  CRUD/normalization), but worth confirming Design Review still agrees.
  (Unchanged from the original architecture.)
