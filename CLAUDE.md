# DayFeed

Offline-first Android notes app (React Native / Expo, bare workflow). No
network, no accounts — everything lives on the phone.

## Reading the owner's notes: the rules

Notes tagged for Claude can be read off the phone. That access is deliberately
narrow, and the narrowness is enforced by tooling, not by good intentions.

**The only permitted command is:**

```
./scripts/pull-claude-notes.sh
```

It runs one fixed query on the phone and writes the result to
`.claude-notes/dayfeed-claude-notes.md`.

**The rules, in full:**

1. **Only the tagged notes.** The query reads four columns from `notes`,
   filtered to rows carrying the `claude` tag, restricted to text and voice
   notes. Nothing else in the database is read — not untagged notes, not photo
   notes, not Flop, not reminders, not the password vault. The script takes no
   arguments, so its query cannot be widened by whoever calls it.
2. **Ask every time.** A PreToolUse hook forces a permission prompt on every
   run. Never work around it, never batch it into another command to slip it
   past the prompt, and never ask the owner to allowlist it.
3. **Read only. Delete nothing.** The database is opened `-readonly` and the
   query runs on the phone. Nothing is written, edited, moved, pushed or
   deleted on the device — not notes, not files, not the app itself.
4. **No other route.** `run-as`, `adb pull`, `adb push`, `adb backup`,
   `adb uninstall`, `pm clear`, and `sqlite3` against `dayfeed.db` are all
   hard-denied by the hook. If one of them seems necessary, stop and ask the
   owner rather than looking for a way around the guard.

**Enforcement** lives in `scripts/claude-db-guard.py`, wired up as a
PreToolUse Bash hook in `.claude/settings.json`. The harness runs it; Claude
does not get to skip it. If you widen the script, widen the guard's reasoning
to match — they are one mechanism split across two files.

Every run appends to `.claude-notes/access.log`, so the owner has a record of
each time the notes were read.

## Why the release build is debuggable

`plugins/withDebuggableRelease.js` sets `debuggable true` on the release build
type, because `adb run-as` refuses a non-debuggable package and that is the
only way to reach the app's private database. `expo prebuild` regenerates
`android/`, which is why this is a config plugin rather than a hand edit.

## Build notes

- `expo prebuild` deletes `android/local.properties`. Restore it afterwards
  with `sdk.dir=/home/benjamin/Android/Sdk`, or gradle falls back to a system
  SDK that lacks `platforms;android-36` and the build fails confusingly.
- A version bump in `app.json` only reaches the APK after a prebuild.
- Release APK: `cd android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a`
- Checks: `npx tsc --noEmit` and `npx jest`.
