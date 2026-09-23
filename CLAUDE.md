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

## Launch screen

`src/components/BootSplash.tsx` overlays the app during launch: a loading ring,
then the bronzes splashing outward, then a dark cover opening onto the Feed.

Two things about it are load-bearing and easy to break:

- It starts on the literal `#FAF8F3` (`BOOT_BG`), **not** `colors.bg`, because
  the native splash underneath is hardcoded cream by the Expo config. A themed
  value flashes bright-then-dark on a dark-mode launch.
- It renders **over** the app, not instead of it, and `App.tsx` mounts the app
  tree as soon as the database opens. The cover can only open onto the Feed if
  the Feed is already there behind it.

Timings live in one block at the top of `src/lib/bootSplash.ts`.

## Build notes

- `expo prebuild` deletes `android/local.properties`. Restore it afterwards
  with `sdk.dir=/home/benjamin/Android/Sdk`, or gradle falls back to a system
  SDK that lacks `platforms;android-36` and the build fails confusingly.
- A version bump in `app.json` only reaches the APK after a prebuild.
- Release APK (sideloading): `cd android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a`
- Release AAB (Play Store — it rejects APKs): `cd android && ./gradlew :app:bundleRelease`.
  The bundle lands at `android/app/build/outputs/bundle/release/app-release.aab`.
- Checks: `npx tsc --noEmit` and `npx jest`.

### Release signing

Release builds are **debug-signed** (fine for sideloading, but the Play
Store won't accept a debug-signed upload) until a real keystore is set up.
`plugins/withReleaseSigning.js` wires `android/app/build.gradle` to use one
automatically — it has to be a config plugin, not a one-time edit, because
`android/` is gitignored and prebuild regenerates it from scratch every time
(same reason `local.properties` needs restoring, above). It falls back to
the debug key when no keystore is configured, so a fresh checkout still
builds.

One-time setup, on the machine that will do release builds:

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore release.keystore -alias dayfeed-release \
  -keyalg RSA -keysize 2048 -validity 10000
```

Then, after each `expo prebuild`:
1. Move `release.keystore` into `android/`.
2. Copy `keystore.properties.example` (repo root) to `android/keystore.properties`
   and fill in the real store/key passwords and alias.

Both files are gitignored (`*.keystore`, `keystore.properties`) — back the
keystore up somewhere safe outside the repo. **Losing it means you can never
publish an update to the same Play Store listing again**, only a new one.
