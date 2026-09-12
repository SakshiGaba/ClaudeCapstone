# Requirements: ITEMS-101 — Categorize and Filter Items

**Status:** Finalized after clarification
**Source:** User story doc `ITEMS-101` (Epic: Item Organization, Priority: High)
**Clarified with:** Product owner (Q&A below), during Step 1 of the Agentic SDLC pipeline

## 1. Narrative

As a user of the Items app, I want to assign a category to each item and filter the
item list by category, so that I can organize my items and quickly find items that
belong to a specific group instead of scrolling through one long flat list.

## 2. Clarifying Q&A (resolves the open questions from the source story)

| # | Question | Decision |
|---|---|---|
| 1 | Is category matching case-sensitive? | **No — case-insensitive.** `"Work"` and `"work"` are the same category for filtering, defaulting, and uniqueness purposes. |
| 2 | Free-text or fixed enum of categories? | **Free-text.** Any string is accepted, subject to the length/whitespace validation below. No enum for this story. |
| 3 | What happens when the active filter's category has zero items left? | **Show an empty state; do not auto-clear the filter.** The user stays on the category they selected and sees a "no items" message until they change or clear the filter themselves. |
| 4 | How to backfill category for pre-existing rows? | **Schema migration with a SQL-level default.** The `category` column is added with `DEFAULT 'Uncategorized'`, so existing rows are backfilled at the database level, not patched in application code. |

## 3. Functional Requirements

### FR-1 — Add category on item creation
- `POST /api/items` accepts an optional `category` field alongside `name`.
- If `category` is omitted, blank, or whitespace-only, the stored value is `"Uncategorized"`.
- Leading/trailing whitespace on a provided category is trimmed before storage.

### FR-2 — Case-insensitive category identity
- Category comparisons (for filtering and for applying the default) are case-insensitive.
- The category is stored as originally typed (preserving the user's casing for display), but all matching/filtering logic normalizes case before comparing.

### FR-3 — Filter items by category
- `GET /api/items` accepts an optional `category` query parameter.
- When provided, only items whose category matches case-insensitively are returned.
- When omitted (or set to an "All" sentinel from the UI), all items are returned regardless of category.

### FR-4 — Live-updating filtered view
- When a category filter is active in the UI and a new item matching that category is added, it appears in the filtered list without a manual page reload (client re-fetches or updates state after a successful add).

### FR-5 — Empty state on filtered view
- If the active category filter matches zero items (including the case where the last matching item was just deleted), the UI shows an explicit empty-state message (e.g. "No items in this category") rather than an error or a blank silent screen. The filter selection itself is not changed automatically.

### FR-6 — Deletion respects active filter
- `DELETE /api/items/:id` behaves as today. On success, the item is removed from the underlying data and disappears from any currently active filtered view (see FR-5 for the zero-remaining case).

### FR-7 — Category validation
- A submitted category must not exceed 50 characters after trimming.
- A category consisting only of whitespace is treated as "no category provided" (→ defaults to `Uncategorized`, per FR-1), not as a validation error.
- A category over 50 characters is rejected with HTTP 400 and a clear validation message (consistent with the existing `name` validation pattern in `server/index.js`).

### FR-8 — Backward-compatible data migration
- The `items` table gets a new `category TEXT NOT NULL DEFAULT 'Uncategorized'` column.
- Existing rows (created before this feature shipped) are backfilled to `'Uncategorized'` automatically via the column default — no separate backfill script required.

## 4. Non-Functional Requirements

### NFR-1 — Performance
- `GET /api/items`, filtered or unfiltered, must respond in under 200ms for a table of up to 10,000 items. Category filtering must be done with an indexed/efficient query (e.g. `WHERE LOWER(category) = LOWER(?)`), not a full in-memory scan on every request if avoidable.

### NFR-2 — Server-side enforcement
- Category filtering is enforced in the Express API layer via the `category` query parameter. The React client must not be the only place filtering happens — a direct API call with a `category` param must return correctly filtered results.

### NFR-3 — Backward compatibility
- Deploying this change must not break access to items created under the old schema (no `category` column). This is satisfied structurally by FR-8's default-value migration.

### NFR-4 — Test coverage
- All new/changed behavior (add with category, add without category, filter by category, filter with no matches, validation rejection for overlong category, delete under an active filter) must have Playwright end-to-end coverage for both the happy path and edge/invalid-input cases.

## 5. Out of Scope (unchanged from source story)

- Multi-category tagging per item — one category per item only.
- User-managed category CRUD (no admin UI for defining/renaming/deleting category names) — categories remain free-text.
- Sorting or bulk-editing items.
- A fixed enum/dropdown of pre-defined categories (may be revisited in a future story per clarification Q2).

## 6. Definition of Done

- [x] `requirements.md` (this document) captures the finalized, clarified scope.
- [ ] `architecture.md` produced and reviewed (Step 2–3).
- [ ] Implementation plan produced (Step 4).
- [ ] Code implemented, reviewed, and tested — unit + Playwright e2e (Steps 5–7).
- [ ] PR created with all required sections: Summary, Changes Made, Test Evidence, Known Limitations, Reviewer Checklist (Step 8).
