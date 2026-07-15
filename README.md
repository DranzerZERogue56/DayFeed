# DayFeed

An **offline-first** notes app that combines a chat-style quick-capture **Feed**
with a day-by-day **Flip** notebook, a **Flop** workspace for long-form thinking,
an **Agenda** timeline, and a searchable **View All** list. All data lives
on-device in SQLite — no accounts, no network, no cloud. Transcription runs
**on-device** (whisper.cpp); nothing leaves the phone.

> 📱 **Put it on your phone:** grab the APK from the
> [latest release](https://github.com/DranzerZERogue56/DayFeed/releases/latest) —
> full step-by-step in **[INSTALL.md](./INSTALL.md)**.

- **Feed** — chat bubbles, newest at the bottom. Type + send, hold the mic to
  record a voice note (slide left to cancel), or tap 📷 to capture a photo note.
  Day separators mark date changes. Long-press a note to delete it.
- **Flip** — one paper "page" per calendar day. Each page shows an **Agenda**
  section (dates that *refer to* this day) above the notes written on it. Swipe
  through days (including empty ones); tap 📅 to jump to any date. Opens on today.
- **Flop** — a workspace for the long thoughts, the ones that outlive a day. See
  [Flop](#flop-long-form-workspace) below.
- **Agenda** — a chronological timeline of every date DayFeed found in your notes,
  grouped by the day it refers to. Tap an entry to jump to the source note's day
  page in Flip.
- **View All** — every note newest-first, with **All / Text / Voice / Photo**
  filter chips and case-insensitive search over note text **and transcripts**.

## What's new in v1.1

- **Photo notes** — camera capture (single shot, burst mode, or multi-select
  gallery import). One capture session = one note with many images; images are
  copied into app storage. Thumbnail grids (max 4 + "+N") open a swipeable
  full-screen viewer.
- **On-device transcription** — each voice note has a **Transcribe** button that
  runs whisper.cpp locally, saves the text to the note, and makes it searchable.
- **Date detection + Agenda** — new text notes and completed transcripts are
  scanned (chrono-node) for present/future dates, which populate the Agenda tab
  and Flip day-page sections.

## Stack

- Expo SDK 57 (dev client workflow — **not** Expo Go; it uses custom native modules)
- `expo-sqlite` — local storage (`notes` + `detected_dates`, and `flop_notes`)
- `expo-audio` — voice-note playback and the mic permission;
  `@fugood/react-native-audio-pcm-stream` — 16 kHz mono WAV recording (see
  *Transcription* below)
- `@react-navigation/native-stack` — Flop's drill-in stack
- `whisper.rn` — on-device transcription (whisper.cpp), **base** model bundled
- `expo-camera` + `expo-image-picker` — photo capture and gallery import
- `chrono-node` — offline natural-language date parsing
- `react-native-pager-view` — Flip view + photo viewer
- React Navigation bottom tabs · TypeScript throughout

> Dependency note: `buffer` is installed as a polyfill required by `whisper.rn`
> (loaded in `src/polyfills.ts`).

## Project layout

```
src/
  db/          initDb + migrations, notes (createNote, getNotesByDay,
               getAllNotes, getDayKeysWithNotes, deleteNote, setTranscript),
               detectedDates (getAgendaEntries, getDetectedDatesForDay,
               addDetectedDates), flopNotes (createFlopNote, getRootFlopNotes,
               getFlopChildren, getFlopAncestors, deleteFlopNote), seed, types,
               flopTypes
  screens/     FeedScreen, FlipScreen, AllNotesScreen, AgendaScreen,
               CaptureCameraScreen, FlopListScreen, FlopNoteScreen
  components/  CaptureBar, NoteBubble, VoicePlayerRow, DayPage, DaySeparator,
               DatePickerModal, PhotoGrid, PhotoViewer, TranscribeButton,
               AgendaSection, FlopComposer, FlopBreadcrumb, RelationChips
  hooks/       NotesContext, AudioPlayerContext, useRecorder, useQueries,
               FlopContext, useFlopQueries, useReducedMotion
  lib/         transcription (whisper wrapper), dateDetection (chrono-node)
  navigation/  RootTabs, FlopStack, types
  utils/       date, audioFiles, mediaFiles, notePreview
assets/models/ ggml-base.bin  ← replace the placeholder with the real model
```

### Data model

`notes` (unchanged v1 columns plus):

| column        | type    | notes                                              |
| ------------- | ------- | -------------------------------------------------- |
| `type`        | TEXT    | `'text' \| 'voice' \| 'photo'`                     |
| `transcript`  | TEXT    | on-device transcript for voice notes (null until set) |
| `media_uris`  | TEXT    | JSON array of local image URIs (photo notes)       |

`detected_dates` (new): `id`, `note_id` (FK → `notes`, cascade delete),
`date_key` (`YYYY-MM-DD`), `snippet` (the matched phrase). Migrations run off
`PRAGMA user_version`; a v1 database upgrades in place with no data loss.

`flop_notes` (new in the Flop release) is a **second, separate table** — Flop notes
carry no day semantics and need tree structure, so they are not overloaded onto
`notes`:

| column       | type    | notes                                                       |
| ------------ | ------- | ----------------------------------------------------------- |
| `parent_id`  | TEXT    | null = root note; else FK → `flop_notes` (cascade delete)   |
| `relation`   | TEXT    | `'root' \| 'support' \| 'idea' \| 'oppose'` (root iff no parent) |
| `type`       | TEXT    | `'text' \| 'voice'`                                         |
| `content`    | TEXT    | body; the **first line is the title** (no separate column)  |
| `transcript` | TEXT    | on-device transcript for voice Flop notes                   |
| `updated_at` | INTEGER | Flop notes are editable, unlike stream notes; orders the list |
| `sort_order` | INTEGER | manual position among siblings                              |

Note there is **no `day_key`** — that absence is the whole point of Flop.

`day_key` / `date_key` are derived in local time and never recomputed on read.

## Flop (long-form workspace)

Flop is for large, **day-independent** notes — an argument you develop over weeks
rather than something that happened on Tuesday. It is deliberately its own world.

**Nested, typed children.** Every Flop note can carry children, each one typed by
its relation to its parent:

| relation      | means                                    | color       |
| ------------- | ---------------------------------------- | ----------- |
| ↑ **Support** | evidence or reasoning *for* the parent   | moss green  |
| ⑂ **Idea**    | a branch off the parent — the extra idea | bronze      |
| ← **Oppose**  | a counter to the parent                  | brick red   |

Picking the relation is a deliberate act: the composer makes you choose one
*before* you write. Children can be text or voice.

**Drill-in navigation.** The note *is* the page. Tapping a note opens it with its
first line as the headline, its body beneath, and its children grouped by
relation. Tapping a child drills one level deeper (sliding in from the right —
deeper is rightward), to unlimited depth; only ever one level renders per screen.
The breadcrumb above the headline jumps back to any ancestor, and back walks up
one level. Long-press a child to change its relation, reorder it among its
siblings, or delete it — deleting takes the note's entire subtree with it, and the
confirmation says how many notes that is.

**Flop is excluded from everything else — by design:**

- Flop notes never appear in the **Feed**, **Flip** pages, or **View All**.
- Search does **not** index `flop_notes`.
- Date detection does **not** run on Flop. Flop is timeless; a Flop note that
  mentions "the 16th" must never create an agenda entry.

Voice Flop notes do support **Transcribe**, identical to stream notes (the
single-job-at-a-time rule is global across both tables). The transcript is stored
on the Flop note and stays out of search and the agenda like the rest of Flop.

## Transcription (usage + how it works)

1. Record a voice note (hold the mic in the Feed).
2. Tap **Transcribe** on the note's player row. The bundled whisper **base** model
   is initialized lazily on first use, then runs on-device with a progress spinner.
3. The transcript is saved to the note (button → text, collapsible if long),
   date-detection runs over it, and the note becomes findable in View All search.

Only one transcription runs at a time; the button is disabled while a job runs.

**Audio format:** whisper.rn decodes **PCM WAV only**. Since the Expo audio
modules cannot record WAV on Android, voice notes are recorded as **16 kHz mono
WAV** via `@fugood/react-native-audio-pcm-stream` so they feed the model directly
on both platforms. Playback uses `expo-audio`.

> **Note on `expo-av`:** this app used `expo-av` through v1.1. It was removed from
> the Expo SDK, and its last release (`16.0.8`) ships a **prebuilt** binary linked
> against a pre-0.86 JSI ABI — under React Native 0.86 it fails to load with
> `UnsatisfiedLinkError` at startup, before any JS runs, crashing the app on every
> platform. It has been replaced with `expo-audio`. Do not add it back.

**Model asset:** the committed `assets/models/ggml-base.bin` is a tiny
**placeholder**. Download the real model once before a real build (see
`assets/models/README.md`):

```bash
curl -L -o assets/models/ggml-base.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin   # ~142 MB
```

Metro bundles it as an asset (`.bin` added to `assetExts` in `metro.config.js`).

## Agenda behavior

- On every **new** text note and every **completed transcript**, chrono-node
  parses the text using the note's `created_at` as the reference date (so "next
  Friday" resolves correctly). Present/future dates are stored in
  `detected_dates`; purely past dates are ignored. **New notes only** — existing
  notes are never backfilled or rescanned.
- A note can be *written* on one day but *refer* to another: the Agenda entry
  appears on the day it refers to (its `date_key`), while the source note stays on
  the day it was written.
- Deleting a note removes its detected dates (FK cascade).

Example: writing "dentist appointment on the 14th" adds an entry on the 14th's
Flip page and in the Agenda tab; tapping it opens the source note's day page.

## Development setup (dev build)

This app uses custom native modules, so it needs a **dev build** — Expo Go won't
work. v1.1 adds native modules (camera, whisper, PCM stream), so **rebuild the dev
client** rather than reusing a v1 one.

```bash
npm install
npx expo run:android            # build & install the dev client
# …or: eas build -p android --profile development
npx expo start --dev-client     # start the bundler
```

On first launch in `__DEV__`, a few sample text notes are seeded (no-ops once the
database has any notes). The seed inserts directly and is not date-scanned.

## Build an installable APK (EAS)

`eas.json`'s **preview** profile outputs an **APK** (unchanged from v1 — the
bundled model needs no EAS config change, it just rides along as an asset):

```bash
eas login
eas build -p android --profile preview
```

Expect the APK to be **~140 MB+ larger** than v1 once the real whisper base model
is in place — this is expected. (The `production` profile builds an AAB.)

## v1.2 roadmap (deferred)

- **Auto-tagging** of notes — the `tags` column already exists (`'[]'` for now);
  no tagging UI yet. Tagging does **not** apply to Flop.
- **Backup export** — must include `flop_notes` alongside `notes`.

Still out of scope: cloud sync, auth, and any network calls (the app is fully
offline; the only network use is the one-time model download at build time).
