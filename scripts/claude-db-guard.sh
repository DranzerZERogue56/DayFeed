#!/usr/bin/env bash
# PreToolUse guard: the enforcement half of the Claude-notes access rules.
#
# Wired up in .claude/settings.json against the Bash tool. It reads the hook
# payload on stdin and answers with a permission decision:
#
#   deny  — any direct route into DayFeed's private app data. run-as, adb pull,
#           adb push, adb backup, uninstall, pm clear, or sqlite3 pointed at
#           dayfeed.db. These bypass the narrow query in pull-claude-notes.sh,
#           so they are refused outright rather than prompted for.
#   ask   — scripts/pull-claude-notes.sh, the one sanctioned path. It prompts
#           every single time; there is deliberately no "remember this" here,
#           which is why this is a hook rather than a permissions rule.
#   (none) — everything else falls through to normal permission handling.
#            adb install / devices / logcat are untouched, so building and
#            sideloading the APK still works exactly as before.
#
# Deny is evaluated before ask, so a command that chains the sanctioned script
# onto a denied one is denied rather than prompted.
#
# This exists because a rule Claude merely agrees to follow is not a control.
# The harness runs this hook; Claude does not get to skip it.
set -euo pipefail

PAYLOAD="$(cat)"
CMD="$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.command // ""')"

decide() {
  jq -n --arg d "$1" --arg r "$2" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: $d, permissionDecisionReason: $r}}'
  exit 0
}

# --- deny: direct access to the app's private data -------------------------
DENY_REASON="Blocked by scripts/claude-db-guard.sh. Direct access to DayFeed's app data is not permitted — it would read more than the Claude-tagged notes, or could modify them. The only sanctioned path is ./scripts/pull-claude-notes.sh, which runs one fixed read-only query for tagged notes."

if printf '%s' "$CMD" | grep -Eqi 'run-as|adb[[:space:]]+(-[^[:space:]]+[[:space:]]+)*(pull|push|backup|uninstall|restore)|pm[[:space:]]+clear|sqlite3[^|;]*dayfeed\.db'; then
  decide deny "$DENY_REASON"
fi

# adb exec-out / adb shell aimed at the package: same bypass, different spelling.
if printf '%s' "$CMD" | grep -Eqi 'adb[[:space:]]+(-[^[:space:]]+[[:space:]]+)*(exec-out|shell)' \
  && printf '%s' "$CMD" | grep -Eqi 'com\.dayfeed\.app|dayfeed\.db'; then
  decide deny "$DENY_REASON"
fi

# --- ask: the one sanctioned path ------------------------------------------
if printf '%s' "$CMD" | grep -Eq 'scripts/pull-claude-notes\.sh'; then
  decide ask "This reads the Claude-tagged notes from the phone: one fixed read-only query, tagged text and voice notes only, no writes and nothing deleted. Every run is logged to .claude-notes/access.log. Approve each time you want the notes read."
fi

exit 0
