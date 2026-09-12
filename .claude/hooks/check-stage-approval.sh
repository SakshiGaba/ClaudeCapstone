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
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APPROVALS_DIR="$REPO_ROOT/.claude/approvals"

INPUT="$(cat)"

# Extract tool name and file_path using python3 (robust JSON parsing).
TOOL_NAME="$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || echo "")"
FILE_PATH="$(echo "$INPUT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
ti = d.get('tool_input', {}) or {}
print(ti.get('file_path', '') or ti.get('path', ''))
" 2>/dev/null || echo "")"

# Only Write/Edit tools are in scope for this gate.
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

# Map a file path to the SDLC stage that owns it. Extend this map as new
# stages/artifacts are built (architecture.md, design-review.md, etc.).
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
