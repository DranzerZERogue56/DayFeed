#!/usr/bin/env python3
"""Cases for scripts/claude-db-guard.py.

Run: python3 scripts/test-claude-db-guard.py

These live in a file rather than a shell one-liner on purpose: the guard reads
the command it is asked about, so a test that lists denied commands inline
would be blocked by the very guard it is testing.

The prose cases matter as much as the denials. The first version of this guard
matched raw text and blocked a git commit whose message described the commands
it denies — a guard that fires on documentation gets switched off.
"""

import json
import subprocess
import sys
from pathlib import Path

GUARD = Path(__file__).with_name("claude-db-guard.py")

CASES = [
    # (expected decision, command)
    ("deny", "adb exec-out run-as com.dayfeed.app cat files/SQLite/dayfeed.db > /tmp/x.db"),
    ("deny", "adb pull /sdcard/Download/foo.md"),
    ("deny", "adb push local.db /sdcard/"),
    ("deny", "adb uninstall com.dayfeed.app"),
    ("deny", "adb shell pm clear com.dayfeed.app"),
    ("deny", 'bash -c "adb pull /sdcard/x"'),
    ("deny", "echo hi && run-as com.dayfeed.app ls"),
    ("deny", "sqlite3 /tmp/dayfeed.db 'select * from notes'"),
    ("deny", "adb shell run-as com.dayfeed.app ls files"),
    # Chaining the sanctioned script onto a denied command is still denied.
    ("deny", "./scripts/pull-claude-notes.sh && adb pull /sdcard/x"),
    # The one sanctioned path.
    ("ask", "./scripts/pull-claude-notes.sh"),
    ("ask", "cd /home/benjamin/Code/Mobile/DayFeed && ./scripts/pull-claude-notes.sh"),
    # Ordinary work must stay untouched.
    ("none", "adb install android/app/build/outputs/apk/release/app-release.apk"),
    ("none", "adb devices"),
    ("none", "adb logcat -d"),
    ("none", "npx jest"),
    ("none", "git status"),
    # Writing about the guard is not using it.
    ("none", "git commit -m 'block run-as and adb pull, deny sqlite3 on dayfeed.db'"),
    ("none", "git commit -F - <<'EOF'\nDeny run-as, adb pull, pm clear\nand sqlite3 against dayfeed.db\nEOF"),
]


def decision_for(command: str) -> str:
    payload = json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
    result = subprocess.run(
        [sys.executable, str(GUARD)], input=payload, capture_output=True, text=True
    )
    if result.returncode != 0:
        return f"crash({result.returncode}): {result.stderr.strip()}"
    if not result.stdout.strip():
        return "none"
    return json.loads(result.stdout)["hookSpecificOutput"]["permissionDecision"]


def main() -> int:
    failures = 0
    for expected, command in CASES:
        actual = decision_for(command)
        ok = actual == expected
        failures += 0 if ok else 1
        mark = "ok  " if ok else "FAIL"
        print(f"{mark} {expected:>4} {command[:78]}")
        if not ok:
            print(f"       got: {actual}")
    print(f"\n{len(CASES) - failures}/{len(CASES)} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
