#!/usr/bin/env bash
# Read the DayFeed notes tagged for Claude, straight from the phone's database.
#
#   ./scripts/pull-claude-notes.sh
#   -> .claude-notes/dayfeed-claude-notes.md
#
# This is the ONLY sanctioned path from a Claude Code session to the notes
# database, and it is deliberately narrow. The rules it enforces:
#
#   1. ONE query, fixed below. It selects four columns from `notes`, filtered
#      to rows carrying the claude tag. Nothing else in the database is read —
#      not untagged notes, not photo notes, not Flop, not reminders, not
#      passwords. The script takes no arguments, so the query cannot be
#      widened, redirected, or parameterised by its caller.
#   2. READ ONLY. The database is opened with sqlite3 -readonly, and the query
#      runs ON THE PHONE so only the matching rows ever cross the cable. The
#      database file itself is never copied off the device.
#   3. NO WRITES OF ANY KIND to the phone. Nothing is deleted, edited, moved or
#      pushed. A read-only open makes that structural rather than a promise.
#   4. EVERY RUN IS LOGGED to .claude-notes/access.log, so there is an
#      after-the-fact record of each time the notes were read.
#
# Claude must ask before each run: .claude/settings.json has a PreToolUse hook
# that forces a permission prompt for this script and hard-denies every other
# route to the app's data (run-as, adb pull, adb push, uninstall, pm clear).
#
# The hook lives in scripts/claude-db-guard.py, with cases in
# scripts/test-claude-db-guard.py. If you widen this script, widen the guard's
# reasoning too — they are one mechanism split across two files.
set -euo pipefail

PACKAGE="com.dayfeed.app"
CLAUDE_TAG="claude"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST_DIR="$REPO/.claude-notes"
DEST="$DEST_DIR/dayfeed-claude-notes.md"
LOG="$DEST_DIR/access.log"

if [ "$#" -ne 0 ]; then
  echo "error: this script takes no arguments." >&2
  echo "  The query is fixed on purpose — see the header comment." >&2
  exit 2
fi

if ! command -v adb >/dev/null 2>&1; then
  echo "error: adb is not installed or not on PATH." >&2
  exit 1
fi

if [ -z "$(adb devices | awk 'NR>1 && $2=="device"')" ]; then
  echo "error: no phone connected." >&2
  echo "  Plug it in over USB, unlock it, and accept the debugging prompt." >&2
  echo "  'adb devices' should list it as 'device' (not 'unauthorized')." >&2
  exit 1
fi

# run-as only works on a debuggable build. plugins/withDebuggableRelease.js
# sets that flag; an APK built before that plugin existed will fail here.
if ! adb exec-out run-as "$PACKAGE" true >/dev/null 2>&1; then
  echo "error: 'run-as $PACKAGE' was refused." >&2
  echo "  Either DayFeed isn't installed, or the installed APK predates the" >&2
  echo "  debuggable-release plugin. Rebuild and reinstall:" >&2
  echo "    npx expo prebuild --platform android" >&2
  echo "    (cd android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a)" >&2
  exit 1
fi

# expo-sqlite keeps its databases under files/SQLite; the platform default
# databases/ dir is checked too so a future storage change fails loudly here
# rather than silently reporting zero notes.
DB=""
for candidate in "files/SQLite/dayfeed.db" "databases/dayfeed.db"; do
  if adb exec-out run-as "$PACKAGE" test -f "$candidate" >/dev/null 2>&1; then
    DB="$candidate"
    break
  fi
done

if [ -z "$DB" ]; then
  echo "error: dayfeed.db not found in the app's private storage." >&2
  echo "  Open DayFeed once on the phone so the database is created." >&2
  exit 1
fi

if ! adb exec-out run-as "$PACKAGE" sh -c 'command -v sqlite3' >/dev/null 2>&1; then
  echo "error: no sqlite3 binary on this phone." >&2
  echo "  The query has to run on-device so that only the tagged notes leave" >&2
  echo "  it. Copying the whole database here instead would read far more than" >&2
  echo "  the tagged notes, which this script will not do." >&2
  exit 1
fi

# The one query. Emits markdown directly, matching the format that
# src/lib/claudeTag.ts produces for the in-app export, so both routes to the
# same notes read identically.
read -r -d '' SQL <<SQLEOF || true
SELECT '## '
       || strftime('%Y-%m-%d %H:%M', created_at / 1000, 'unixepoch', 'localtime')
       || CASE type WHEN 'voice' THEN ' · voice' ELSE '' END
       || char(10) || char(10)
       || CASE type
            WHEN 'voice'
              THEN COALESCE(NULLIF(TRIM(transcript), ''), '_(voice note, not transcribed yet)_')
            ELSE COALESCE(NULLIF(TRIM(content), ''), '_(empty note)_')
          END
       || char(10)
  FROM notes
 WHERE type IN ('text', 'voice')
   AND tags LIKE '%"${CLAUDE_TAG}"%'
 ORDER BY created_at ASC;
SQLEOF

# base64 so the SQL survives the trip through adb's shell without quoting
# games; the encoded form is alphanumeric and cannot be misread as shell.
SQL_B64="$(printf '%s' "$SQL" | base64 -w0)"

set +e
BODY="$(adb exec-out run-as "$PACKAGE" sh -c \
  "echo $SQL_B64 | base64 -d | sqlite3 -readonly -noheader -list '$DB'" 2>/tmp/dayfeed-sql-err)"
STATUS=$?
set -e

if [ "$STATUS" -ne 0 ]; then
  echo "error: the query failed on the phone." >&2
  sed 's/^/  /' /tmp/dayfeed-sql-err >&2 || true
  rm -f /tmp/dayfeed-sql-err
  exit 1
fi
rm -f /tmp/dayfeed-sql-err

# adb hands back CRLF line endings; strip the CRs so the markdown is clean.
BODY="${BODY//$'\r'/}"

COUNT="$(printf '%s\n' "$BODY" | grep -c '^## ' || true)"
COUNT="${COUNT:-0}"

mkdir -p "$DEST_DIR"
{
  echo "# DayFeed — notes tagged for Claude"
  echo
  echo "Read $(date '+%Y-%m-%d %H:%M') from the phone · ${COUNT} note$([ "$COUNT" = 1 ] || echo s)"
  echo
  if [ "$COUNT" -eq 0 ]; then
    echo "_No notes are currently tagged._"
  else
    printf '%s\n' "$BODY"
  fi
} > "$DEST"

echo "$(date '+%Y-%m-%d %H:%M:%S')  read ${COUNT} tagged note(s) from ${PACKAGE}:${DB}" >> "$LOG"

echo "Read ${COUNT} tagged note(s) from the phone (read-only, tagged rows only)."
echo "  -> $DEST"
echo "  audit log: $LOG"
