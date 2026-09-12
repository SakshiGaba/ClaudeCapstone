#!/usr/bin/env bash
# Records a one-time approval marker for an SDLC stage. This is the ONLY
# supported way to create an approval marker — it requires a non-empty
# confirmation string (intended to be a quoted summary of what the human
# actually said) so the approval is auditable, not just a bare touch(1).
#
# Usage: record-approval.sh <stage> "<confirmation text>"
set -euo pipefail

VALID_STAGES=("requirements" "architecture" "design-review" "plan" "code-review")

STAGE="${1:-}"
CONFIRMATION="${2:-}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APPROVALS_DIR="$REPO_ROOT/.claude/approvals"

if [[ -z "$STAGE" ]]; then
  echo "Usage: record-approval.sh <stage> \"<confirmation text>\"" >&2
  echo "Valid stages: ${VALID_STAGES[*]}" >&2
  exit 1
fi

if [[ ! " ${VALID_STAGES[*]} " =~ " ${STAGE} " ]]; then
  echo "Error: '$STAGE' is not a recognized stage." >&2
  echo "Valid stages: ${VALID_STAGES[*]}" >&2
  exit 1
fi

if [[ -z "$CONFIRMATION" ]]; then
  echo "Error: a non-empty confirmation string is required (quote the human's answer/approval)." >&2
  exit 1
fi

mkdir -p "$APPROVALS_DIR"
MARKER="$APPROVALS_DIR/${STAGE}.approved"

{
  echo "stage: $STAGE"
  echo "approved_at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "confirmation: $CONFIRMATION"
} > "$MARKER"

echo "Approval recorded for stage '$STAGE' at $MARKER" >&2
echo "This marker is single-use: it will be consumed by the next matching Write/Edit." >&2
