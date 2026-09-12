#!/usr/bin/env bash
# PreToolUse hook — enforces human approval before any Write/Edit to a
# scope-defining SDLC artifact. This is a technical gate, not just an
# instruction: if no valid one-time approval marker exists for the stage
# that owns the target file, the tool call is blocked (exit 2) and Claude
# cannot write the file no matter what the command/agent prompts say.
#
# Approval markers are single-use: the moment this hook allows a write, it
# deletes the marker, so the next write to the same artifact requires a
# fresh approval. This stops silent re-writes as much as first writes.
#
# JSON parsing: tries node (this is a Node.js project, so node is expected
# to be present) first, then python3, then python. If NONE are available,
# this hook FAILS CLOSED (blocks, exit 2) rather than failing open — a
# security/governance gate must never silently no-op just because its
# parser is missing. (Earlier version of this script used python3 only and
# swallowed its absence with `|| echo ""`, which caused it to fail OPEN —
# found and fixed 2026-09-12 after a real Windows environment had no
# python3 binary, only a Microsoft Store alias stub.)
set -uo pipefail

# Resolve repo root robustly regardless of Claude Code's invocation cwd.
REPO_ROOT="${CLAUDE_PROJECT_DIR:-}"
if [[ -z "$REPO_ROOT" ]]; then
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd 2>/dev/null)"
fi
APPROVALS_DIR="$REPO_ROOT/.claude/approvals"

INPUT="$(cat)"

PARSED=""
PARSE_OK=0

# --- Attempt 1: node ---
if command -v node >/dev/null 2>&1; then
  PARSED="$(printf '%s' "$INPUT" | node -e '
    let data = "";
    process.stdin.on("data", c => data += c);
    process.stdin.on("end", () => {
      try {
        const d = JSON.parse(data);
        const ti = d.tool_input || {};
        const toolName = d.tool_name || "";
        const filePath = ti.file_path || ti.path || "";
        process.stdout.write(JSON.stringify({ tool_name: toolName, file_path: filePath }));
      } catch (e) {
        process.exit(1);
      }
    });
  ' 2>/dev/null)"
  if [[ $? -eq 0 && -n "$PARSED" ]]; then PARSE_OK=1; fi
fi

# --- Attempt 2: python3 ---
if [[ $PARSE_OK -ne 1 ]] && command -v python3 >/dev/null 2>&1; then
  PARSED="$(printf '%s' "$INPUT" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    ti = d.get("tool_input", {}) or {}
    print(json.dumps({"tool_name": d.get("tool_name",""), "file_path": ti.get("file_path","") or ti.get("path","")}))
except Exception:
    sys.exit(1)
' 2>/dev/null)"
  if [[ $? -eq 0 && -n "$PARSED" ]]; then PARSE_OK=1; fi
fi

# --- Attempt 3: python (some systems alias python3 -> python) ---
if [[ $PARSE_OK -ne 1 ]] && command -v python >/dev/null 2>&1; then
  PARSED="$(printf '%s' "$INPUT" | python -c '
import json, sys
try:
    d = json.load(sys.stdin)
    ti = d.get("tool_input", {}) or {}
    print(json.dumps({"tool_name": d.get("tool_name",""), "file_path": ti.get("file_path","") or ti.get("path","")}))
except Exception:
    sys.exit(1)
' 2>/dev/null)"
  if [[ $? -eq 0 && -n "$PARSED" ]]; then PARSE_OK=1; fi
fi

# --- FAIL CLOSED if nothing could parse the input ---
if [[ $PARSE_OK -ne 1 ]]; then
  echo "HOOK ERROR: no working JSON interpreter found (tried node, python3, python)." >&2
  echo "This approval gate cannot safely evaluate the request without one, so it" >&2
  echo "is BLOCKING this Write/Edit rather than silently allowing it." >&2
  echo "Install Node.js (recommended — this is a Node.js project) or Python 3," >&2
  echo "then retry." >&2
  exit 2
fi

# PARSED is our own controlled minimal JSON shape: {"tool_name":"...","file_path":"..."}
# Extract with sed rather than re-invoking an interpreter, since the shape is fixed.
TOOL_NAME="$(printf '%s' "$PARSED" | sed -n 's/.*"tool_name":"\([^"]*\)".*/\1/p')"
FILE_PATH="$(printf '%s' "$PARSED" | sed -n 's/.*"file_path":"\([^"]*\)".*/\1/p')"

# Only Write/Edit tools are in scope for this gate.
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

# Map a file path to the SDLC stage that owns it. Extend this map as new
# stages/artifacts are built.
STAGE=""
case "$FILE_PATH" in
  */my-app/requirements.md)   STAGE="requirements" ;;
  */my-app/architecture.md)   STAGE="architecture" ;;
  */my-app/design-review.md)  STAGE="design-review" ;;
  */my-app/impl-plan.md)      STAGE="plan" ;;
  */my-app/code-review.md)    STAGE="code-review" ;;
  *) exit 0 ;;  # not a gated artifact — allow normally
esac

MARKER="$APPROVALS_DIR/${STAGE}.approved"

if [[ ! -f "$MARKER" ]]; then
  echo "BLOCKED: writing '$FILE_PATH' requires human approval for stage '$STAGE'." >&2
  echo "No approval marker found at .claude/approvals/${STAGE}.approved." >&2
  echo "Ask the human your clarifying questions, get their answers, then run:" >&2
  echo "  bash .claude/scripts/record-approval.sh $STAGE \"<quoted summary of human's confirmation>\"" >&2
  echo "before attempting this write again." >&2
  exit 2
fi

# Marker exists — this is a genuine, single-use approval. Consume it so a
# future write to this same artifact requires fresh approval.
rm -f "$MARKER"
echo "Approval marker for stage '$STAGE' verified and consumed. Write allowed." >&2
exit 0
