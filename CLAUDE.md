# DayFeed

Offline-first Android notes app (React Native / Expo, bare workflow). No
network, no accounts — everything lives on the phone.

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

The upload key already exists at `~/.dayfeed-keys/dayfeed-upload.keystore`
(passwords in `~/.dayfeed-keys/keystore.properties`, which points at it by
absolute path). It lives outside the repo **and outside `android/`** on
purpose: `expo prebuild --clean` deletes everything in `android/`. After each
prebuild, copy `~/.dayfeed-keys/keystore.properties` into `android/`. **Back
up `~/.dayfeed-keys/` somewhere safe** — with Play App Signing a lost upload
key can be reset by Google, but only if the account is still yours.

**Sideloading onto a phone that has the debug-signed app:** move
`android/keystore.properties` out of the way first. A different signature makes
Android refuse the update, and the only way past that is uninstalling, which
deletes the app's notes. With no properties file the build falls back to the
debug key and installs over the top.

### Release hardening

`plugins/withReleaseShrink.js` turns on code/resource shrinking for release
builds and adds keep rules for whisper (`com.rnwhisper`) and ML Kit
(`com.rnmlkit`). Neither ships its own rules, and both are reached from C++ or
by name, so without them they crash only in release builds. After changing
either library, run dictation and photo text-scanning in a release build.

`app.json` blocks four permissions the template adds but nothing uses:
INTERNET, SYSTEM_ALERT_WINDOW and the two FOREGROUND_SERVICE ones. Blocking
INTERNET means the app cannot reach a dev server, so a dev-client build needs
that line removed temporarily.

See `PLAY_STORE.md` for the Play Console answers and `PRIVACY.md` for the policy.
