# DayFeed v1.2/v1.3 — on-device smoke test

Run top to bottom on the phone (~20 min). Anything that fails or feels off,
note it under **Findings** at the bottom with the step number.

## 0. Install / upgrade

- [ ] Install `app-release.apk` from the [latest release](https://github.com/DranzerZERogue56/DayFeed/releases/latest) **over** the installed version (no uninstall).
- [ ] App opens with **all your existing v1.1 notes intact** (feed history, photos, transcripts). This proves the v3 migration didn't touch old rows.
- [ ] Six tabs visible: Feed · Flip · Flop · Agenda · View All · Vault.

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

## 14. v1.4.10 — copy extracted photo text

- [ ] A photo note with extracted text shows a **"Copy"** link next to the "EXTRACTED TEXT" label.
- [ ] Tap it → label briefly changes to "Copied", then reverts.
- [ ] Paste elsewhere (e.g. the composer) → the full extracted text (all combined blocks, not just what's visible when collapsed) is pasted.
- [ ] Same behavior in Feed, View All, and Flip's day page.

## 15. v1.4.11 — filter status-bar noise out of OCR text

- [ ] Photograph a phone/tablet screen showing text with the status bar visible (clock, battery %, LTE/Wi-Fi) in frame → extract text → the clock, battery %, and connectivity chrome are gone from the extracted text; the actual on-screen content is intact.
- [ ] A plain paper/whiteboard photo's extracted text is unchanged from before (nothing legitimate gets stripped).
- [ ] A note whose real content happens to contain a time (e.g. "Meeting at 9:41 with the team") or a percentage (e.g. "100% sure this works") still keeps that text — only status-bar-*only* lines are dropped.
- [ ] A photo that's *entirely* status bar (rare, e.g. a cropped screenshot sliver) → "No text found", not an empty extracted-text block.

## 16. v1.5.0 — Vault: biometric-locked password/username storage

- [ ] A new **Vault** tab appears (padlock icon) alongside Feed/Flip/Flop/Agenda/View All.
- [ ] Opening it prompts fingerprint/Face unlock immediately. Cancel it → a "Vault locked" screen with an **Unlock** button appears; tapping it re-prompts.
- [ ] Switch to another tab and back to Vault → it re-locks and prompts again every time (no "stay unlocked" window).
- [ ] On a device/emulator with **no fingerprint/face/PIN set up** → a "No screen lock set up" message shows instead of a broken prompt, no crash.
- [ ] After unlocking, tap **+** → add an entry: a label ("what it's for"), username, password. Save requires all three filled in.
- [ ] The saved entry shows as a card: label at top, then a **USERNAME** pill and a **PASSWORD** pill below it, both masked with dots by default.
- [ ] Tap a pill → it unfurls to show the real text; tap again → it re-masks.
- [ ] A long username/password that overflows the pill's width can be **scrolled horizontally** within the pill to see the rest.
- [ ] Tap the **⋯** on a card → Edit opens the composer pre-filled; Delete asks to confirm, then removes the entry.
- [ ] Force-close and reopen the app, unlock Vault again → entries are still there (persisted via expo-secure-store, not lost on restart).
- [ ] Uninstalling and reinstalling the app clears the Vault (SecureStore is sandboxed to the app install, same as expected for Android Keystore/iOS Keychain).

## 17. v1.5.1 — Photos sub-feed + OCR text layout/list formatting

- [ ] A small photos-grid icon appears in Feed's header, next to the light/dark toggle.
- [ ] Tapping it opens a **Photos** screen: a 3-column grid of every photo note, newest first (separate from the Feed chat list).
- [ ] A tile with more than one image shows a count badge; a tile whose note has extracted text shows an "Aa" badge.
- [ ] Tapping a tile opens a detail view with that note's images (tap to open the swipeable full-screen viewer) and its OCR "Extract text"/extracted-text control — same behavior as in Feed (extract, copy, unfurl not applicable here but expand/collapse and checkbox-tap all work).
- [ ] **Delete** on the detail view asks to confirm, then removes the note and returns to the grid (tile disappears).
- [ ] Photograph a **numbered/bulleted/checkbox list** (printed or handwritten, e.g. "1) Milk", "• Eggs", "☐ Bread") → extracted text renders with real numbers/bullets/checkboxes (not raw "1)"/"•"/"☐"), and a checkbox tap toggles and persists.
- [ ] Photograph something with **distinct paragraph/column grouping** (e.g. a receipt with a line-item column, or a form with separate fields) → extracted text keeps that grouping (blank line between groups) instead of one run-on paragraph.
- [ ] A photo with plain prose (no lists) still extracts and displays exactly as before — no stray markers introduced.

## 18. v1.5.2 — filter browser tab-switcher chrome out of OCR text

- [ ] Photograph a browser's tab-switcher/tab-strip view (multiple open tabs visible) → the extracted text does not contain a garbled line of concatenated tab titles with stray "x"/"X" tokens between them.
- [ ] A note that happens to mention "x" once (e.g. "meet me x the shop", a single multiplication) is unaffected.
- [ ] Known limitation: a line that's *only* math with 2+ "x" multiplication signs and no other punctuation (e.g. "5 x 3 = 2 x 4") could be misidentified as tab-strip noise and dropped — rare, but worth knowing about if a math-heavy photo note loses a line.

## 19. v1.5.3 — more pronounced Photos button

- [ ] Feed's header shows a bronze-tinted pill labeled "Photos" (icon + text), not just a bare icon — matches the visual weight of Flop's "+" and Vault's "+" buttons.
- [ ] Tapping it still opens the Photos grid as before.

## 20. v1.5.4 — hide audio, Agenda dedup fix, swipe nav

- [ ] Feed: a transcribed voice note shows a **"Hide audio"** link below the transcript → tap it → the play button and duration track disappear, leaving just the text; tap **"Show audio"** to bring the player back.
- [ ] Same Hide/Show audio toggle works on a voice note in **View All**, on a **Flip** day page, and inside a **Flop** voice note.
- [ ] Transcribe a voice note whose text contains a date (e.g. "call mom next Friday") → it appears once on the **Agenda**.
- [ ] Tap **✎ Edit** on that transcript, tweak a word (keep the date phrase), Save → the note still appears **only once** on the Agenda, not duplicated.
- [ ] Edit the transcript again to remove the date phrase entirely → the old Agenda entry for that note is gone (not left behind as a stale duplicate).
- [ ] A small dot strip appears just above the tab bar while on **Feed**, **Flip**, or **Flop**; it's **not** shown on Agenda, View All, or Vault.
- [ ] On Feed, swipe the dot strip **left** → jumps to Flip; swipe left again → jumps to Flop; swiping left again does nothing (already at the end).
- [ ] Swipe the strip **right** from Flop → back to Flip → back to Feed; swiping right from Feed does nothing.
- [ ] The active dot always matches the current tab (leftmost on Feed, middle on Flip, rightmost on Flop) whether you got there by swiping or by tapping a tab icon.
- [ ] Swiping vertically or with very little horizontal movement on the strip does nothing (doesn't accidentally change tabs while scrolling the page above it).

## 21. v1.5.5 — reminder times, radial menu, Feed layout fixes

### Pick the reminder time on Agenda

- [ ] Tap the bell on an Agenda entry that has no reminder yet → a time picker appears (native Android dialog, or a bottom sheet with Cancel/Set on iOS) instead of silently scheduling for 9:00 AM.
- [ ] Pick a time and confirm → the bell fills in, and the row's caption shows "reminder <chosen time>" (not always "9:00 AM").
- [ ] Cancel the picker (back button / Cancel) → no reminder is set, bell stays unfilled.
- [ ] Pick a time that's already passed today (for a date_key of today) → "Too late to remind" alert naming the chosen time, no reminder set.
- [ ] Tap the filled bell on an existing reminder → it cancels immediately (no picker), same as before.
- [ ] Force-close and reopen the app → a previously set reminder's caption still shows its originally chosen time (persisted, not reset to a default).
- [ ] Upgrading in place from v1.5.4 (not a fresh install) → existing reminders still fire and the Agenda opens without error (the reminder_hour/reminder_minute migration ran cleanly).

### Hide-audio toggle beside Edit

- [ ] A transcribed voice note shows **✎ Edit** and **Hide audio** side by side on the TRANSCRIPT header row — not on a separate line below — and both have a bronze hairline border.
- [ ] Tapping Hide audio still collapses the player; the label flips to Show audio.

### Feed text layout

- [ ] A Feed note mixing numbered, bullet, and checkbox lines, each long enough to wrap 2–3 lines, keeps all text inside the bubble — nothing crosses the right border and no line overlaps the one below it.
- [ ] Long Feed notes now reach close to the full screen width; a short one-word note still renders as a small bubble.
- [ ] The same note renders unchanged on Flip and View All.

### Radial long-press menu

- [ ] Long-press a Feed text note → two round `⋯` buttons appear at the left and right edges, about two thirds down the screen.
- [ ] Tap the left one → Edit / Copy / Flop / Delete fan out in an arc to the right. Tap the right one instead → the same arc, mirrored. No pill is clipped by the screen edge.
- [ ] Tapping the dimmed backdrop closes the menu without running anything.
- [ ] **Edit** → the note becomes an editor in place; type `1. ` then Enter and the list auto-continues; Save persists the change, Cancel discards it.
- [ ] **Copy** → paste elsewhere and the note's text is on the clipboard.
- [ ] **Delete** → still asks to confirm before removing.
- [ ] Long-press a voice note → Copy takes the transcript and there is no Edit pill. An un-transcribed voice note shows no Copy pill either.
- [ ] Long-press a photo note → Copy takes the extracted text; no Flop pill.
- [ ] The same menu appears on long-press in **View All** and **Vault**.
- [ ] Delete confirmations and the "… is now a Flop root note" notice still appear as bottom sheets, not radial menus.
- [ ] Turn on the OS "reduce motion" setting → the pills fade in at their final positions instead of sweeping out.
- [ ] Menu is legible in both light and dark themes.

## 22. v1.6 — Flop document import / export

### Importing files

- [ ] Open a Flop note → a **FILES** section appears below the body with a **+ Add file** button.
- [ ] Add a `.docx` → the row shows the original filename and its size; the document's text appears underneath under a **TEXT** label and matches the file.
- [ ] Add a `.md` → its text appears with list markers rendered as bullets/numbers, not raw `-` characters.
- [ ] Add a `.txt` → its text appears.
- [ ] Add a `.pdf` → the row appears with **no** extracted text (expected — see below); tapping the row opens it in the system PDF viewer.
- [ ] Tapping a `.docx`/`.txt` row also opens it in whatever app handles that type.
- [ ] Add a file whose text is longer than ~240 characters → **Show more** expands it and **Show less** collapses it again.
- [ ] Tap **Copy** on an extracted text block → it reads "Copied" briefly and the text pastes elsewhere.
- [ ] Rename a `.zip` to `.docx` and add it → it still attaches, simply with no text, and the app does not crash.
- [ ] Force-close and reopen the app → attachments and their extracted text are still there.
- [ ] Tap **✕** on an attachment → a confirmation appears; confirm → that row goes and the others remain.
- [ ] Delete a Flop note that has attachments **and** a child that also has attachments → the note is gone; re-adding a file to a new note still works (no leftover state).
- [ ] Note the known limitation: PDFs attach and reopen but contribute no text, because there is no dependable offline PDF text extractor for React Native.

### Exporting

- [ ] A Flop note's top bar shows **Export** between Edit and Delete.
- [ ] Tap it → a sheet asks the scope: *This note only* / *This note and its children* / *Everything in Flop*.
- [ ] Choose a scope → a second sheet asks the format: **PDF** or **Word (.docx)**.
- [ ] Export a nested note as **PDF** → the share sheet opens; save it and confirm the child notes appear indented under their parent, with SUPPORTS / IDEA / OPPOSES labels.
- [ ] Export the same as **.docx** → it opens in Word or Google Docs **without a "repair this file" prompt**, headings nested by depth.
- [ ] Export with scope *This note only* → children are absent from the output.
- [ ] Export with scope *Everything in Flop* → every root note and its tree is present.
- [ ] Export a note that has attachments → the output lists the attachment filenames (the files themselves are not embedded).
- [ ] Export a note whose text contains `<`, `&`, and `"` → both formats render those characters literally rather than breaking the document.
- [ ] Cancel out of either sheet without choosing → nothing is exported.

### Upgrade

- [ ] Install **over** v1.5.5 rather than fresh → existing Flop notes, stream notes, Vault entries and reminders all survive the v8 migration, and the FILES section appears empty on old notes.

## 23. v1.6 — notes tagged for Claude

### Tagging

- [ ] The capture bar shows a **★** button between the camera and the text field; it's grey when off.
- [ ] Tap it → it lights up in bronze with a tinted background.
- [ ] Type a note and send → the note's footer shows a small bronze ★ next to its timestamp.
- [ ] The capture bar's ★ **stays armed** after sending. Send a second note → also tagged.
- [ ] Tap the ★ off, send a third note → no marker on that one.
- [ ] Arm the ★ and hold the mic to record a voice note → the voice note carries the marker too.
- [ ] **Recorder regression check** (the ★ sits beside that gesture): press-and-hold the mic records, releasing saves, and sliding left cancels — all still working.
- [ ] Known limitation: the ★ only tags notes *as you create them*. There's no way to tag a note you wrote earlier.

### Exporting

- [ ] Feed's header shows **★ Export** beside the Photos button.
- [ ] Tap it with nothing tagged → a sheet says no notes are tagged; no file is produced.
- [ ] Tag a few notes, tap **★ Export** → the share sheet opens on a markdown file named `dayfeed-claude-notes.md`.
- [ ] Save it to **Downloads**.
- [ ] Open the saved file on the phone → it lists only the tagged notes, oldest first, each under a `##` heading with its date and time.
- [ ] A tagged voice note appears with its **transcript**. A tagged voice note that hasn't been transcribed shows "(voice note, not transcribed yet)" rather than an empty section.

### Pulling to the laptop

- [ ] Plug the phone in over USB, unlock it, accept the debugging prompt.
- [ ] Run `./scripts/pull-claude-notes.sh` → it reports the source path, the destination, when the export was made on the phone, and the note count.
- [ ] `.claude-notes/dayfeed-claude-notes.md` exists in the repo and matches what was on the phone.
- [ ] Run the script with the phone unplugged → it fails with a clear "no phone connected" message rather than a stack trace.
- [ ] **The actual goal:** ask Claude to read `.claude-notes/dayfeed-claude-notes.md` and act on it, without pasting any note text into the prompt.

## 24. v1.7 — direct note access, tagging existing notes

Tagging notes already in the feed:

- [ ] Long-press an untagged text note → the radial menu shows **Tag**. Tap it → the ★ appears in the note's footer.
- [ ] Long-press it again → the menu now reads **Untag**. Tap it → the ★ goes away.
- [ ] Tag a voice note the same way; its ★ appears too.
- [ ] Long-press a photo note → there is **no** Tag option (the export covers text and voice only).
- [ ] Tag a note that was written before this version was installed — the whole point of the feature.
- [ ] Toggling the tag leaves the note's text, transcript and timestamp untouched.

Reading the notes from the laptop:

- [ ] Install this build (the previous one is not debuggable, so `run-as` will refuse until you do).
- [ ] Plug the phone in, unlock it, accept the debugging prompt.
- [ ] Ask Claude to read the tagged notes → a permission prompt appears **every** time, even on the second and third run.
- [ ] The notes that arrive are exactly the tagged ones, oldest first — no untagged notes, no photo notes, no Flop content.
- [ ] A voice note with no transcript shows as `_(voice note, not transcribed yet)_` rather than blank.
- [ ] `.claude-notes/access.log` gains one line per run.
- [ ] Ask Claude to run `adb pull` or `run-as` against the app directly → it is denied by the guard, not merely discouraged.
- [ ] Unplug the phone and run the script → clear "no phone connected" message, no stack trace.
- [ ] After all of the above, the notes on the phone are unchanged and nothing has been deleted.

## Findings

<!-- e.g. "§5 breadcrumb: tapping root crumb flashes wrong page" -->

-
