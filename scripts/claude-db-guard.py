#!/usr/bin/env python3
"""PreToolUse guard: the enforcement half of the Claude-notes access rules.

Wired up in .claude/settings.json against the Bash tool. Reads the hook payload
on stdin and answers with a permission decision:

  deny   — any direct route into DayFeed's private app data: run-as, adb
           pull/push/backup/uninstall/restore, pm clear, or sqlite3 pointed at
           dayfeed.db. These bypass the narrow query in pull-claude-notes.sh,
           so they are refused outright rather than prompted for.
  ask    — scripts/pull-claude-notes.sh, the one sanctioned path. It prompts
           every single time; there is deliberately no "remember this", which
           is why this is a hook rather than a permissions rule.
  (none) — everything else falls through to normal permission handling. adb
           install / devices / logcat are untouched, so building and
           sideloading the APK still works exactly as before.

Deny is evaluated before ask, so chaining the sanctioned script onto a denied
command is denied rather than prompted.

Matching runs against COMMAND POSITIONS, not raw text, and heredoc bodies are
stripped first. Both matter: the first version of this guard blocked a git
commit whose message merely described the commands it denies. A guard that
cries wolf on prose gets switched off, which is the one outcome that must not
happen.

Known limit: this reads shell text, so it is a rail against carelessness, not
a sandbox. Something determined to get around it (base64, an indirect
variable, a wrapper script) could. The real protection is that the phone must
be plugged in and unlocked.

This exists because a rule Claude merely agrees to follow is not a control.
The harness runs this hook; Claude does not get to skip it.
"""

import json
import re
import sys

DENY_REASON = (
    "Blocked by scripts/claude-db-guard.py. Direct access to DayFeed's app data is "
    "not permitted — it would read more than the Claude-tagged notes, or could modify "
    "them. The only sanctioned path is ./scripts/pull-claude-notes.sh, which runs one "
    "fixed read-only query for tagged notes."
)

ASK_REASON = (
    "This reads the Claude-tagged notes from the phone: one fixed read-only query, "
    "tagged text and voice notes only, no writes and nothing deleted. Every run is "
    "logged to .claude-notes/access.log. Approve each time you want the notes read."
)

# A command starts at the beginning, or after a separator, or inside a
# substitution or a quoted -c argument.
CMD_START = r"(?:^|[;&|(){}\n`\"']|\$\()\s*"

DENY_PATTERNS = [
    # run-as in command position — the only way into private app storage.
    CMD_START + r"run-as\b",
    # adb verbs that move data on or off the device, or wipe it.
    CMD_START + r"adb\b(?:\s+-\S+)*\s+(?:pull|push|backup|restore|uninstall)\b",
    # `adb shell pm clear` and friends.
    r"\bpm\s+clear\b",
    # sqlite3 aimed at the app's database, wherever it is invoked.
    CMD_START + r"sqlite3\b[^;|&\n]*dayfeed\.db",
]

# adb shell / exec-out aimed at the package: same bypass, different spelling.
ADB_SHELL = re.compile(CMD_START + r"adb\b(?:\s+-\S+)*\s+(?:shell|exec-out)\b")
PACKAGE = re.compile(r"com\.dayfeed\.app|dayfeed\.db")

SANCTIONED = re.compile(r"scripts/pull-claude-notes\.sh")

HEREDOC = re.compile(r"<<-?\s*(['\"]?)([A-Za-z_][A-Za-z0-9_]*)\1")


def strip_heredocs(command: str) -> str:
    """Remove heredoc bodies, which are data the shell never executes.

    Without this, writing *about* these commands — a commit message, release
    notes, this file's own documentation — trips the guard.
    """
    while True:
        opener = HEREDOC.search(command)
        if not opener:
            return command
        delimiter = opener.group(2)
        rest = command[opener.end():]
        terminator = re.search(
            r"^\s*" + re.escape(delimiter) + r"\s*$", rest, re.MULTILINE
        )
        # Unterminated heredoc: drop the remainder, it is all body.
        end = opener.end() + (terminator.end() if terminator else len(rest))
        command = command[: opener.start()] + "\n" + command[end:]


def decide(decision: str, reason: str) -> None:
    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": decision,
                "permissionDecisionReason": reason,
            }
        },
        sys.stdout,
    )
    sys.exit(0)


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        # A guard that crashes must not become a guard that blocks everything.
        sys.exit(0)

    raw = payload.get("tool_input", {}).get("command", "") or ""
    command = strip_heredocs(raw)

    for pattern in DENY_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            decide("deny", DENY_REASON)

    if ADB_SHELL.search(command) and PACKAGE.search(command):
        decide("deny", DENY_REASON)

    if SANCTIONED.search(command):
        decide("ask", ASK_REASON)

    sys.exit(0)


if __name__ == "__main__":
    main()
