# Google Play submission notes

Answers to have ready for the Play Console forms, and what to upload. This is
a working checklist, not app documentation. Play's forms change now and then,
so check each answer against the form in front of you.

## What to upload

- **App bundle**, not an APK: `cd android && ./gradlew :app:bundleRelease`
  → `android/app/build/outputs/bundle/release/app-release.aab`. Needs
  `android/keystore.properties` in place (see CLAUDE.md, "Release signing").
- Turn on **Play App Signing** when creating the app. The key in
  `~/.dayfeed-keys/` is the **upload key**; Google holds the real signing key.
  If the upload key is ever lost, Google can reset it. The signing key cannot
  be recovered by anyone else, which is why Play holds it.
- Bump `version` and `versionCode` in `app.json` for every upload, then run
  `expo prebuild` (see CLAUDE.md). Play rejects a versionCode it has seen.

## Moving from the sideloaded app to the Play version

The copy of DayFeed on the phone today is signed with a debug key. The Play
version will be signed with a different key, and Android will not update one
into the other. Installing the Play version means **uninstalling the current
one, which deletes its notes**. Before that, export anything worth keeping
(Flop export, or copy notes out) and back up the phone. This only happens once.

## Privacy policy

`PRIVACY.md` is the policy text. Play needs it at a **public web address**.
Options: turn on GitHub Pages for this repo (needs it public), or paste the
text into any free page host. Fill in the contact email first.

## Data safety form

DayFeed has no internet permission and sends nothing anywhere itself.

| Question | Answer |
|---|---|
| Does the app collect or share user data? | **No** — nothing leaves the device through the app. |
| Is data encrypted in transit? | Not applicable (no transit). |
| Can users request data deletion? | Uninstalling deletes everything. |

Two things to be honest about in the free-text or review notes if asked:

- **Wispr Flow** is a separate app the user can choose for dictation. It sends
  speech to its own servers. DayFeed does not send or receive it. The Settings
  screen already says this.
- **Android Auto Backup** may copy notes and photos to the user's own Google
  account. Google treats this as the user's device backup, not developer
  collection.

## Permissions (declared in the app)

Camera, microphone, notifications, biometric unlock, run-at-boot (so reminders
survive a restart), vibrate, and read/write storage on Android 12 and older
only. Every one is used by a visible feature; see `PRIVACY.md` for the
plain-language reasons.

Removed on purpose, because nothing uses them: **internet**, **draw over other
apps**, and the two **foreground service** permissions. That keeps the Data
safety answers simple and avoids Play's extra scrutiny of those.

## Content rating questionnaire

Notes app: no violence, no user-to-user contact, no user-generated content
shared with others, no location, no purchases, no ads. Expect the lowest
rating.

## Store listing

- **Category:** Productivity. **Contact email:** required.
- **Assets needed:** 512×512 icon, 1024×500 feature graphic, at least 2 phone
  screenshots (up to 8). None of these exist yet.
- **Short description (80 characters):** "Notes that stay on your phone: quick capture, daily journal, private vault."
- **Full description:** draft from the README, in plain words.

## Account and testing rules

- One-time registration fee and identity check for the developer account.
- New personal accounts have had to run a closed test with a set number of
  testers for a set number of days before production. Check the current
  numbers in the Play Console; they have changed before.

## Before the first upload

- [ ] Signed release built with the real key, opened on a phone from Play's
      internal testing track (not just sideloaded).
- [ ] Dictation, photo text scanning, reminders and the Vault tried in the
      shrunk release build. Shrinking can break code that is only reached
      at runtime, and these are the parts most at risk.
- [ ] App size checked against the bundle limit (last on the list).
