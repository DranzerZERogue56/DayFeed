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

`PRIVACY.md` is the policy text. It's published via GitHub Pages at
**https://dranzerzerogue56.github.io/DayFeed/** (source: `docs/index.html`,
kept in sync with `PRIVACY.md` by hand). Paste that URL into Play Console's
privacy policy field.

## Data safety form

DayFeed has no internet permission and sends nothing anywhere itself.

| Question | Answer |
|---|---|
| Does the app collect or share user data? | **No** — nothing leaves the device through the app. |
| Is data encrypted in transit? | Not applicable (no transit). |
| Can users request data deletion? | Uninstalling deletes everything. |

One thing to be upfront about if a reviewer asks:

- **Android Auto Backup** may copy notes and photos to the user's own Google
  account. Google treats this as the user's device backup, not developer
  collection.

Speech-to-text runs on the phone with a bundled model, so dictation sends no
audio anywhere.

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

- **Category:** Productivity. **Contact email:** benwrenn61438@gmail.com.
- **Assets:** 512×512 icon (`store-assets/icon-512.png`) and 1024×500
  feature graphic (`store-assets/feature-graphic.png`) are done. Play wants at
  least 2 phone screenshots (up to 8), no taller than twice their width. The two
  in `store-assets/screenshot-*.png` are cropped to fit, but they show test notes;
  retake them with believable sample notes before submitting.
- **Short description (80 characters):** "Private notes that stay on your phone: quick capture, voice notes, and a vault."
- **Full description:**

  > Write things down without handing them to anyone else. DayFeed keeps
  > every note, photo, and voice memo on your phone — no account, no sign-in,
  > no internet connection at all.
  >
  > Drop a quick note the moment you think of it, in a running feed like a
  > chat with yourself. Flip back through your notes one day at a time, like
  > pages in a notebook. Or open Flop, a separate space for the bigger ideas
  > you're still working out, where you can branch off supporting points,
  > new ideas, or counterarguments as you go.
  >
  > Say a note out loud and DayFeed writes it down for you — the
  > speech-to-text runs right on your phone, so nothing you say is ever sent
  > anywhere. Snap a photo of a note or a receipt and DayFeed can pull the
  > text out of the picture, also without leaving your phone.
  >
  > Mention a date in a note — "dentist next Tuesday" — and it shows up on
  > your agenda automatically, with a reminder if you want one.
  >
  > For anything more private, the Vault stores logins and passwords behind
  > your phone's own fingerprint, face, or screen lock.
  >
  > Pick from a handful of color themes and make it feel like yours.
  >
  > DayFeed doesn't connect to the internet, doesn't show ads, and doesn't
  > track you. Your notes are yours, and they stay on your device.

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
