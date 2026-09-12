---
description: Stage 1 of the SDLC pipeline — read a user story and produce a clarified requirements.md
argument-hint: [path-to-story-file]
---

You are running **Stage 1: Requirements** of the ClaudeCapstone Agentic SDLC
pipeline. Follow this procedure exactly, one phase at a time — do not skip
ahead to architecture or implementation.

## Input

Story source: `$ARGUMENTS`

If no path was given, ask the user for the story source (file path, or pasted
text) before doing anything else. Accept `.docx`, `.md`, `.txt`, or pasted
JIRA/Confluence-style text.

## Phase A — Read

1. If the source is a `.docx`, extract its text with `pandoc -t markdown
   <file>`. If it's `.md`/`.txt`, read it directly. If it's pasted text in the
   conversation, use that.
2. Summarize the story back in 2-3 sentences (narrative + acceptance criteria
   at a glance) so the human can confirm you read the right thing.
3. Cross-reference the story against the **current state of the actual
   codebase** (`my-app/`), not just the story text in isolation — e.g. check
   `my-app/server/index.js` for the existing schema/API shape, and
   `my-app/requirements.md` if one already exists from a prior story, so you
   don't contradict established decisions.

## Phase B — Clarify (human-in-the-loop, mandatory)

1. Identify real ambiguities: anything the story leaves open, any explicit
   "Open Questions" section in the source, and anything you notice conflicts
   with or is unspecified against the existing codebase (data migration,
   validation edge cases, case-sensitivity, concurrency, etc.).
2. Ask the human these questions. Prefer a small number of concrete,
   answerable questions over a long list — 3-5 is typical. Do not proceed to
   Phase C until the human has answered.
3. If the story is already fully unambiguous (rare), state that explicitly
   and confirm with the human before skipping straight to Phase C.

## Phase C — Capture (automatic once unblocked)

Once the human has answered, **immediately** — without waiting for a further
"go ahead" — write `my-app/requirements.md` with this structure:

```
# Requirements: <STORY-ID> — <Title>

**Status:** Finalized after clarification
**Source:** <where the story came from>

## 1. Narrative
## 2. Clarifying Q&A (table: question | decision)
## 3. Functional Requirements (FR-1, FR-2, ...)
## 4. Non-Functional Requirements (NFR-1, NFR-2, ...)
## 5. Out of Scope
## 6. Definition of Done (checklist spanning the whole pipeline, stages 2-8
      unchecked)
```

If `my-app/requirements.md` already exists from a previous story, do not
overwrite it silently — ask whether this is a new story (append/new section)
or a revision of the existing one (replace with confirmation).

## Phase D — Commit and update state

1. `git add my-app/requirements.md` and commit with a message naming the
   stage and story ID, summarizing the key clarified decisions in the body.
2. Update `.claude/pipeline-state.md`: mark stage 1 complete for this story,
   record the commit hash, set "Current stage" to Architecture, clear any
   resolved open items.
3. Attempt `git push`. If it fails (e.g. missing credentials), say so plainly
   and let the human know the commit exists locally and needs a manual push.
4. Tell the human requirements are locked and ready for Stage 2
   (`/architecture`), but do not start that stage yourself.

## Guardrails

- Do not invent acceptance criteria the story didn't imply and the human
  didn't confirm — if unsure, ask rather than assume.
- Do not silently downgrade a "must" to a "should" or vice versa.
- Keep FR/NFR items testable — each should be phrasable as a Playwright
  assertion or an API contract check, since Stage 7 (Verification) will need
  to trace back to these.
