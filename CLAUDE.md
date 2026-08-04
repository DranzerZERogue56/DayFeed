# DayFeed

Offline-first Android notes app (React Native / Expo, bare workflow). No
network, no accounts — everything lives on the phone.

## Noted-updates

Changes destined for a Claude Code session are written in the **Noted-updates**
overlay (header button on Feed), then **Copy all** puts them on the clipboard
as a numbered list to paste into a prompt.

This replaced an earlier attempt to read tagged notes off the phone over adb.
Worth knowing why, so it doesn't get rebuilt: it needed a debuggable release
build, and it still failed on the actual hardware, because Samsung's user
builds ship no `sqlite3` an app UID may execute. Copying the whole database to
the laptop instead would have read far more than the notes in question. The
clipboard costs one paste and needs none of that.

`noted_updates` is its own table rather than a flag on `notes` (see
`MIGRATION_V9`): these are written to be copied out and cleared, and they
should not turn up in the Feed, the Agenda, or search.

## Build notes

- `expo prebuild` deletes `android/local.properties`. Restore it afterwards
  with `sdk.dir=/home/benjamin/Android/Sdk`, or gradle falls back to a system
  SDK that lacks `platforms;android-36` and the build fails confusingly.
- A version bump in `app.json` only reaches the APK after a prebuild.
- Release APK: `cd android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a`
- Checks: `npx tsc --noEmit` and `npx jest`.
