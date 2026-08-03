#!/usr/bin/env bash
# Pull the DayFeed notes tagged for Claude off the phone.
#
# The app is offline and its database lives in private storage, so the notes
# come across as a file: tag notes with the ★ in the capture bar, tap ★ Export
# on the Feed header, and save the file to Downloads. This script fetches it.
#
#   ./scripts/pull-claude-notes.sh
#   -> .claude-notes/dayfeed-claude-notes.md
set -euo pipefail

FILENAME="dayfeed-claude-notes.md"
DEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.claude-notes"
DEST="$DEST_DIR/$FILENAME"

# Where Android is likely to have put it, most likely first.
CANDIDATES=(
  "/sdcard/Download/$FILENAME"
  "/sdcard/Downloads/$FILENAME"
  "/storage/emulated/0/Download/$FILENAME"
  "/storage/emulated/0/Documents/$FILENAME"
)

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

found=""
for path in "${CANDIDATES[@]}"; do
  if adb shell "test -f '$path'" >/dev/null 2>&1; then
    found="$path"
    break
  fi
done

# Not in the usual places — search shared storage rather than give up.
if [ -z "$found" ]; then
  echo "Not in the usual folders; searching shared storage…"
  found="$(adb shell "find /sdcard -name '$FILENAME' -type f 2>/dev/null | head -1" | tr -d '\r')"
fi

if [ -z "$found" ]; then
  echo "error: could not find $FILENAME on the phone." >&2
  echo "  In DayFeed: tap ★ Export on the Feed header, then save to Downloads." >&2
  exit 1
fi

mkdir -p "$DEST_DIR"
adb pull "$found" "$DEST" >/dev/null

# Surface the export's age — a stale file from a previous session looks
# identical to a fresh one once it is sitting in the repo.
modified="$(adb shell "date -r '$found' '+%Y-%m-%d %H:%M'" 2>/dev/null | tr -d '\r' || true)"
count="$(grep -c '^## ' "$DEST" || true)"

echo "Pulled $found"
echo "  -> $DEST"
[ -n "$modified" ] && echo "  exported on phone: $modified"
echo "  notes: ${count:-0}"
