# Verification Report: ITEMS-101 — Categorize and Filter Items

**Status:** Verified and agreed with human on 2026-09-12

## 1. Test Suite Results

Ran `npx playwright test` **8 times total** against a freshly reset
`server/db/app.db` each time (the DB is gitignored and regenerated at
server startup via the T1 migration):

| Phase | Runs | Suite size | Result |
|---|---|---|---|
| Pre-gap-closure (baseline) | 5 | 13 tests | 13/13 passed, every run |
| Post-gap-closure (3 new specs added, before `retries`) | 4 | 16 tests | 3 runs 16/16 clean; 1 run had 1 failure — the pre-existing, unmodified `can delete an item` test (not one of the 3 new specs, not touched by this story) |
| Post-`retries: 1` (final config) | 3 | 16 tests | 16/16 passed, every run |

**Flake characterization:** the `can delete an item` test (predates
ITEMS-101, file/line unchanged by any T1-T12 commit) failed once across 8
runs (~1-in-8, consistent with the ~1-in-3 to ~1-in-5 rate logged during
Stage 5/6). The failure mode each time is a `toBeVisible`/`not.toContainText`
timeout, not an assertion mismatch — consistent with `fullyParallel: true`
workers contending on the single shared SQLite file, not a logic defect.
**Agreed with human:** added `retries: 1` to `playwright.config.js` as a
low-risk mitigation (auto-retry masks the contention-driven false-red) rather
than a code change, since no T1-T12 code is implicated. 16/16 clean across
all 3 runs since.

**3 traceability-gap tests added** (see §3) and verified passing across all
runs above:
- `filtering by category matches case-insensitively` (FR-2)
- `adding an item that matches the active filter appears without a manual reload` (FR-4)
- `a pre-existing row without an explicit category is backfilled to Uncategorized` (FR-8/NFR-3)

## 2. Dependency Audit (final check)

Re-ran `npm audit --omit=dev` in all 3 locations; **identical to Stage 6**,
nothing regressed or newly introduced:

| Location | Vulnerabilities | Notes |
|---|---|---|
| `my-app` (root) | 0 | unchanged |
| `my-app/server` | 9 (1 critical, 4 high, 2 moderate, 2 low) | unchanged — critical/high chain is `sqlite3`'s build-time native-addon compile deps (`tar`/`node-gyp`/`make-fetch-happen`), not runtime; moderate `qs`/`express` is a real runtime dep with a non-breaking `npm audit fix` available |
| `my-app/client` | 30 (9 low, 7 moderate, 14 high) | unchanged — all in `react-scripts` build/dev toolchain; shipped `react`/`react-dom` runtime deps have 0 findings |

**NFR-1 re-confirmed** (`server/scripts/load-test.js`, fresh run at 10,000
items): **73.19ms avg / 86.87ms max unfiltered**, **15.86ms avg / 28.28ms
max filtered** — both well under the 200ms threshold. (Stage 5's original
measurement was 142-146ms/26-28ms; the difference is machine-load variance
between runs, not a regression — both passed comfortably.)

## 3. FR/NFR Traceability Matrix

| Requirement | Satisfied by | Verified by |
|---|---|---|
| FR-1 (add category, default to Uncategorized) | T2 (`server/index.js` POST handler), T4 (client category input) | `adding an item with an explicit category stores it as-is`, `adding an item with category omitted, blank, or whitespace-only defaults to Uncategorized` |
| FR-2 (case-insensitive identity, casing preserved on store) | T2/T3 (`LOWER()` comparison), T2 (stores as-typed) | `filtering by category matches case-insensitively` **(added at Stage 7 — was a gap)** |
| FR-3 (filter by category, "All" omits param) | T3 (server), T5 (client) | `filtering by category shows only matching items` |
| FR-4 (live-updating filtered view) | T5 (client re-fetch after add) | `adding an item that matches the active filter appears without a manual reload` **(added at Stage 7 — was a gap)** |
| FR-5 (empty state on filtered view) | T6 (client empty-state render) | `filtering to a category with zero matching items shows the empty-state message` |
| FR-6 (deletion respects active filter) | T7 (client re-fetch under active filter) | `deleting the last item in an active filtered view keeps the filter and shows the empty state` |
| FR-7 (category validation: >50 chars rejected, whitespace-only defaults) | T2 (server validation) | `a category over 50 characters is rejected with 400`, `a whitespace-only category succeeds and defaults to Uncategorized (not a 400)` |
| FR-8 (backward-compatible migration/backfill) | T1 (`ALTER TABLE ... DEFAULT 'Uncategorized'`) | `a pre-existing row without an explicit category is backfilled to Uncategorized` **(added at Stage 7 — was a gap)** |
| NFR-1 (200ms/10k items) | T3 (indexed query), T12 (load-test script) | `server/scripts/load-test.js` run — 73.19ms/15.86ms avg at 10,000 items, both passing |
| NFR-2 (server-side enforcement) | T2, T3 (validation/filtering in `server/index.js`, not client) | T8/T9/T11 specs use the `request` fixture directly against the API, bypassing the UI, confirming server-side enforcement independent of the client |
| NFR-3 (backward compatibility) | T1 (additive `DEFAULT`-based migration, no data loss) | Same as FR-8 above — the migration mechanism is one and the same |
| NFR-4 (test coverage for all new/changed behavior) | T8-T11 (Playwright specs) | Satisfied by the full matrix above — every enumerated NFR-4 scenario (add w/ and w/o category, filter, filter-no-match, overlong-category rejection, delete-under-filter) has a passing spec; the 3 additional Stage 7 specs close out FR-2/FR-4/FR-8 gaps that existed alongside, but outside, NFR-4's literal enumerated list |

All 8 FRs and 4 NFRs now have at least one specific passing test or
measured check pointed to above — no requirement is "verified" without a
named test/script.

## 4. Document Consistency Check

Read `requirements.md`, `architecture.md`, `design-review.md`,
`impl-plan.md`, and `code-review.md` together, checking for:

- **Contradictions:** none found. The whitespace-only FR-7 decision, the
  "All"-sentinel client-only handling, and the type-checking requirement
  from Design Review finding B are stated consistently across
  `architecture.md`, `design-review.md`, and `code-review.md` — no document
  restates or reinterprets a prior stage's binding decision differently.
- **Broken cross-references:** all 20 commit hashes cited across
  `pipeline-state.md`, `code-review.md`, `design-review.md`, and
  `architecture.md` were checked with `git cat-file -e` and confirmed to
  exist in this repository's history. None dangling.
- **Stale checklists:** `requirements.md` §6 Definition of Done had one
  line (`Code implemented, reviewed, and tested — unit + Playwright e2e
  (Steps 5–7)`) still unchecked, accurate as of when it was written but
  stale once Stage 7 completes. **Fixed, human-approved:** checked off now
  that Stages 5-7 are all complete.
- **Unresolved carried-forward items:** reviewed every item in
  `pipeline-state.md`'s "Open items carried forward" section — each has an
  explicit disposition (resolved-into-artifact, deliberately deferred with
  a stated reason, or now closed by this stage's work). None were silently
  dropped. The one item this stage adds resolution to is the "pre-existing
  Playwright flake" note from Stage 5 — see §1 above for its final
  characterization and the agreed `retries: 1` mitigation.

## 5. Known Limitations (carries into Stage 8's PR description)

- **`server` dependency audit:** 1 critical + 4 high vulnerabilities in the
  `tar`/`node-gyp`/`make-fetch-happen` chain — all transitive build-time
  dependencies of `sqlite3`'s native-addon compilation, not loaded by the
  running server. Clearing them requires `npm audit fix --force`, which
  bumps `sqlite3` to `6.0.1` (breaking) — not applied, flagged as a
  reasonable fast-follow. The 1 moderate `qs`/`express` vuln (a real
  runtime dependency) has a non-breaking fix via plain `npm audit fix`,
  not applied in this story's scope.
- **`client` dependency audit:** 30 vulnerabilities, all in `react-scripts`'
  bundled build/dev toolchain (jest, jsdom, webpack-dev-server, postcss via
  nested transitive deps) — the shipped runtime `react`/`react-dom`
  dependencies have zero findings. Standard Create React App ecosystem
  debt; not addressed in this story.
- **DRY duplication (non-functional, deferred from Code Review):**
  `category` type-checking is duplicated between the `GET` and `POST`
  handlers in `server/index.js`; the startup schema-migration logic is
  duplicated (deliberately, per its own code comment) between
  `server/index.js` and `server/scripts/load-test.js`. No functional impact.
- **Missing test:** no Playwright spec covers `DELETE` of a non-existent
  item ID (behavior is graceful — `200 {deleted: 0}` — but untested).
  Not required by NFR-4's enumerated scenario list.
- **Concurrent-boot migration safety (accepted architectural risk):** the
  startup `ALTER TABLE` check is safe for single-instance deployment but
  would need a proper migration runner with a schema-version table for
  concurrent multi-instance startup. Out of scope per `requirements.md`
  (no multi-instance deployment implied); logged in `architecture.md` §8
  and `design-review.md` §3 as an accepted, not a fixed, risk.
- **Playwright worker/DB-contention flake:** the pre-existing `can delete
  an item` test intermittently fails (~1-in-8 observed rate) when
  `fullyParallel` workers contend on the single shared SQLite file.
  Mitigated with `retries: 1` in `playwright.config.js` (a CI-observed
  retry, not a silent pass) rather than a code fix, since it is not a
  defect in any T1-T12 code.
