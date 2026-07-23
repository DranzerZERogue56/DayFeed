# DayFeed v1.2/v1.3 — on-device smoke test

Run top to bottom on the phone (~20 min). Anything that fails or feels off,
note it under **Findings** at the bottom with the step number.

## 0. Install / upgrade

- [ ] Install `app-release.apk` from the [latest release](https://github.com/DranzerZERogue56/DayFeed/releases/latest) **over** the installed version (no uninstall).
- [ ] App opens with **all your existing v1.1 notes intact** (feed history, photos, transcripts). This proves the v3 migration didn't touch old rows.
- [ ] Five tabs visible: Feed · Flip · Flop · Agenda · View All.

## 1. Feed

- [ ] Send a text note — appears at the bottom, correct timestamp.
- [ ] Send a text note containing a date, e.g. `dentist next Friday` (used again in §4).
- [ ] Hold mic → record a short voice note → release: bubble appears with duration.
- [ ] Hold mic → **slide left** → recording cancels, nothing is added.
- [ ] Play the voice note; pause mid-way; play again. (expo-audio migration — listen for stutter, wrong speed, or no audio.)
- [ ] Tap 📷 → take a single photo → one photo note appears with a thumbnail.
- [ ] 📷 again → burst or multi-select from gallery → **one** note with a grid (max 4 + "+N").
- [ ] Tap a thumbnail → full-screen viewer opens, swipes between images, closes.
- [ ] Long-press a throwaway note → delete → it's gone (and stays gone after switching tabs).

## 2. Transcription

- [ ] On today's voice note, tap **Transcribe** — spinner, then text appears under the bubble.
- [ ] Transcript quality is roughly right (base model — perfection not expected).
- [ ] Record a voice note saying a future date ("remind me on August 5th"), transcribe it — then check it shows up in Agenda (§4).
- [ ] View All → search a word that only exists in a transcript → the voice note is found.

## 3. Flip

- [ ] Opens on **Today**, showing today's notes from §1 in oldest-first order.
- [ ] Swipe back through days — pages render, empty days show the empty state.
- [ ] Tap 📅 → jump to a far date → correct page; jump back to today.
- [ ] A day someone *referred to* (e.g. next Friday from §1) shows an **Agenda section** at the top of its page.

## 4. Agenda

- [ ] The `dentist next Friday` note appears under the correct future day.
- [ ] The transcribed "August 5th" voice note appears under Aug 5.
- [ ] `at 3pm`-style notes with **no date** did NOT create entries.
- [ ] Tap an entry → lands on that source note's day page in Flip.

## 5. Flop (new in v1.2 — spend the most time here)

- [ ] Create a root note with a multi-line body → appears in the list, first line is the title.
- [ ] Open it → add one child of each relation: **support**, **idea**, **oppose**.
- [ ] Child counts/chips on the root card match (1/1/1).
- [ ] Drill into a child → add a grandchild → **breadcrumb** shows root → child; tapping a crumb navigates back up.
- [ ] Record a **voice** child → play it back → transcribe it → its title becomes the transcript's first line.
- [ ] Edit a root's body → it jumps to the **top** of the root list (ordered by last touched).
- [ ] Move a child up/down among its siblings → order sticks after leaving and returning.
- [ ] Change a child's relation (e.g. idea → oppose) → it moves to the end of the new group.
- [ ] Delete a note with children → confirm prompt mentions the subtree → whole subtree is gone.
- [ ] Back-navigation through the Flop stack never gets stuck or shows a stale page.

## 6. View All

- [ ] Newest-first, includes text + voice + photo. **Flop notes deliberately absent.**
- [ ] Filter chips: All / Text / Voice / Photo each show only that type.
- [ ] Search is case-insensitive and matches both content and transcripts.
- [ ] Clearing search/filters restores the full list.

## 7. Robustness

- [ ] Force-close the app (swipe away) → reopen → everything from this session is still there.
- [ ] Airplane mode on → app fully usable (it should never care about network).
- [ ] Rotate / background the app mid-playback and mid-recording → no crash.
- [ ] Deny mic permission once (Settings → revoke) → recording fails gracefully, not a crash. Re-grant after.

## 8. v1.3 — Send to Flop

- [ ] Feed: long-press a **text** note → menu shows *Send to Flop* / *Delete…* / *Cancel*.
- [ ] Send it → "Sent to Flop" alert → *Open Flop* lands on the Flop tab with the new root at the top.
- [ ] The original note is **still in the Feed**, and editing the Flop copy doesn't touch it.
- [ ] Promote a **voice** note (one with a transcript) → the Flop root plays the audio and carries the transcript; its title is the transcript's first line.
- [ ] Delete the promoted Flop root → the **original Feed note's audio still plays** (files are copies, not shared).
- [ ] Long-press a **photo** note → straight to delete confirm (no Send to Flop — Flop has no photo type).
- [ ] View All: long-press a text/voice note → same menu works there.

## 9. v1.3 — Agenda reminders

- [ ] Agenda: upcoming entries show a **bell** (greyed = off); past days show no bell.
- [ ] Tap a bell for the first time → Android asks for notification permission → allow → bell turns solid, row shows "reminder 9:00 AM".
- [ ] Toggle the bell off → the "reminder 9:00 AM" tag disappears.
- [ ] Real-fire test: write a note referring to **tomorrow**, set its bell, and check the notification arrives at 9:00 AM (title = the day, body = the snippet).
- [ ] Delete a note whose entry has a reminder set → the entry vanishes and no notification fires the next morning.
- [ ] Deny the permission instead (or revoke in Settings) → tapping a bell shows the "Notifications are off" alert, no crash.

## 10. v1.4 — dark mode, icons, app icon

- [ ] Launcher shows the new **book + quill** icon (long-press → App info also shows it).
- [ ] Tab bar and buttons use the **line-art icons** (no emojis anywhere).
- [ ] Tap the **moon** in any header → whole app flips to dark brown, including tab bar, cards, inputs, and the Flip page.
- [ ] Dark mode: open every tab + a Flop note + the date picker + the camera — nothing stays glaringly light or unreadable.
- [ ] Force-close and reopen → still dark (choice persists). Sun icon flips it back.
- [ ] Flop relation chips (Support/Idea/Oppose) stay readable in both modes.

---

## 11. v1.4.7 — edit voice transcripts

- [ ] Feed: a voice note with a transcript shows a small **✎ Edit** next to "TRANSCRIPT".
- [ ] Tap it → transcript becomes an editable box with **Cancel** / **Save** below it.
- [ ] Edit the text and Save → the bubble immediately shows the corrected transcript.
- [ ] Cancel instead → reverts to the original transcript, nothing saved.
- [ ] Same Edit control works in **View All** and inside a **Flop** voice note.
- [ ] Editing a Feed transcript that now contains a date phrase (e.g. "next Tuesday") → check it still shows up on the Agenda tab.
- [ ] Saving an edit with the text unchanged, or emptied out entirely, doesn't crash or wipe the transcript.

## 12. v1.4.8 — photo text extraction (OCR)

- [ ] Feed: a photo note (with text visible in at least one image, e.g. a sign or note card) shows an **✎ Extract text** button below the thumbnails.
- [ ] Tap it → button shows "Extracting…" → the recognized text appears under an "EXTRACTED TEXT" label.
- [ ] A photo note with **multiple images** (some with text, some without) → extracting combines all readable text into one block, separated by blank lines.
- [ ] Once text exists, a **"Hide photos"** link appears → tap it → thumbnails collapse, extracted text stays visible; tap **"Show photos (N)"** to bring them back.
- [ ] Photo with no readable text → "No text found" alert, no crash, no extract button hidden.
- [ ] View All: search for a word that only appears in an extracted-text block → the photo note shows up in results.
- [ ] Same behavior in **View All**'s photo notes (extract, collapse/expand, long-text "Show more/less").
- [ ] Force-close and reopen → extracted text and collapse choice (photos visible unless you'd hidden them) still there — note collapse state itself doesn't need to persist across restarts, just the extracted text.

## 13. v1.4.9 — markdown-lite lists

- [ ] In Feed's composer, type `1. ` then some text, hit Enter → the next line auto-starts with `2. `.
- [ ] Type `- ` then text, Enter → next line auto-starts with `- `. Type `[] ` then text, Enter → next line auto-starts with `[ ] `.
- [ ] Hit Enter on a **bare** marker (e.g. an empty `- ` with nothing typed after it) → the list breaks out, leaving a plain blank line instead of continuing.
- [ ] Send a note with a numbered/bulleted/checkbox list → it renders with real markers/checkboxes (not raw `1. `/`- `/`[ ] ` text) in the Feed bubble.
- [ ] Tap a rendered checkbox → it toggles checked (strike-through) and stays checked after backgrounding/reopening the app.
- [ ] Same list rendering + tappable checkboxes in **View All** and on a **Flip** day page.
- [ ] Same typing behavior (auto-continue, `[]` → `[ ]`) in **Flop's** "New Flop note" composer, a child composer, and Flop's in-place text editor (tap Edit on a Flop text note).
- [ ] Edit a **voice transcript** (✎ Edit) and type a list into it → same auto-continue behavior works there too.
- [ ] A Flop note whose **first line** is itself a list marker (e.g. title line `1. Groceries`) still shows a sensible title and the rest of the list renders normally below it.

## Findings

<!-- e.g. "§5 breadcrumb: tapping root crumb flashes wrong page" -->

-
