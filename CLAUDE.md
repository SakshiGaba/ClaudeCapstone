# ClaudeCapstone — Agentic SDLC Pipeline

This repo is driven end-to-end by an **Agentic SDLC pipeline**: requirements →
architecture → design review → implementation planning → implementation →
code review → verification → PR. Every stage produces a durable artifact
(a markdown file, a diff, a test run) — nothing is considered "done" until
its artifact exists and is committed.

Project under management: `my-app/` (React + Express + SQLite items app).

## Pipeline stages and their artifacts

| # | Stage | Artifact | Command | Status |
|---|---|---|---|---|
| 1 | Requirements | `my-app/requirements.md` | `/requirements` | ✅ implemented |
| 2 | Architecture | `my-app/architecture.md` | `/architecture` | ✅ implemented |
| 3 | Design Review | `my-app/design-review.md` | `/design-review` | ✅ implemented |
| 4 | Implementation Planning | `my-app/impl-plan.md` | `/plan` | ✅ implemented |
| 5 | Implementation | source diffs | (main agent loop) | ⏳ not yet built |
| 6 | Code Review | review notes / `my-app/code-review.md` | `/code-review` | ⏳ not yet built |
| 7 | Verification | test run output | `/verify` | ⏳ not yet built |
| 8 | PR | PR description | `/open-pr` | ⏳ not yet built |

Live pipeline state (which stage is current, what's been approved) is tracked
in `.claude/pipeline-state.md`. Always read that file at the start of a
session in this repo before deciding what to do next.

## Ground rules for every stage

- **Human-in-the-loop is mandatory.** Every stage that produces or changes
  a scope-defining artifact (requirements, architecture, design review,
  plan, code review) must pause and ask the human clarifying questions
  *before* writing the artifact, if the input is ambiguous or
  underspecified. A `PreToolUse` hook (`.claude/hooks/check-stage-approval.sh`,
  wired in `.claude/settings.json`) was built to make this a technical gate
  rather than just an instruction — but **confirmed via extensive testing
  (see `.claude/pipeline-state.md` "Enforcement" section) that it does not
  actually fire in this environment's `claude` CLI, in any permission
  mode**, despite being correctly registered and correctly written. Treat
  it as a best-effort defense that may or may not engage depending on your
  Claude Code installation — the actual operative safeguard is that every
  command's Phase B/C/D procedure must still be followed by instruction:
  ask real questions, wait for a real human answer, call
  `record-approval.sh <stage> "<confirmation>"` (which itself rejects
  empty/bogus input, giving at least an auditable trail), then write. The
  human should read what gets written before it's committed — that review
  is the real backstop in this environment, not the hook.
- **Auto-generate after unblocked.** Once the human has answered outstanding
  questions for a stage, immediately write the artifact and commit it —
  do not wait for an additional "go ahead" prompt for that same stage.
- **One stage at a time.** Do not jump ahead to a later stage's artifact
  (e.g. don't sketch architecture while still gathering requirements) unless
  explicitly asked to.
- **Every artifact gets committed.** Use descriptive commit messages that
  name the stage and reference the prior stage's artifact where relevant.
- **Update `.claude/pipeline-state.md`** after completing a stage, so the
  orchestrator (and any future session) knows where things stand.

## Stack context (for all stages)

- **Frontend:** React (`my-app/client`)
- **Backend:** Express (`my-app/server/index.js`)
- **DB:** SQLite (`my-app/server/db/app.db`, created at runtime)
- **Tests:** Playwright (`my-app/tests/`)
- Existing API: `GET /api/health`, `GET /api/items`, `POST /api/items`,
  `DELETE /api/items/:id`

## Enforcement layer (hooks)

- `.claude/settings.json` — registers the `PreToolUse` hook for Write/Edit.
- `.claude/hooks/check-stage-approval.sh` — the gate itself; maps artifact
  file paths to stages and blocks (exit 2) unless that stage's approval
  marker exists, consuming it on success.
- `.claude/scripts/record-approval.sh` — the only supported way to create an
  approval marker; rejects empty confirmations and unrecognized stages.
- `.claude/approvals/` — holds the (gitignored, ephemeral) marker files.

## Orchestrator

The `sdlc-orchestrator` subagent (`.claude/agents/orchestrator.md`) is
responsible for sequencing these stages, checking `.claude/pipeline-state.md`,
and invoking the right command for the current stage. Prefer delegating to it
when asked to "continue the pipeline" or "do the next step," rather than
guessing which stage comes next.
