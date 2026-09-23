# Color themes — implementation plan

Status: **code complete on `claude/admiring-bell-qpftdm`**, not yet verified on
a device. This doc is the reference for finishing that verification and
covers what to do if any theme needs another pass.

## What changed

The accent ("spine color") was split out from the base warm-paper palette
so it can be chosen independently of light/dark mode. Bronze is the
original and stays the default — existing installs look unchanged until a
theme is picked in Settings. Six more accents were added: three sourced
from men's color-preference surveys (Ocean, Forest, Slate) and three from
women's (Amethyst, Blush, Teal) — sourcing only, nothing in the app itself
is labeled by gender.

Each accent gets a light and dark variant for free, via the existing
mode toggle (the sun/moon button in the header) — 7 themes × 2 modes,
without maintaining 14 separate palettes.

## Where it lives

- `src/theme.ts` — `accentThemes` (the 7 accents × light/dark token sets),
  `accentOrder` (picker order), `makePalette(mode, accentId)` (merges base
  + accent into the `ColorPalette` every component reads).
- `src/hooks/ThemeContext.tsx` — `accentId` state, persisted to the
  `settings` table under `themeAccent` (separate key from `themeMode`),
  `setAccentId()`.
- `src/screens/SettingsScreen.tsx` — the swatch-row picker under
  "COLOR THEME".

## The color schemes

Base tokens (bg/surface/text/divider) are unaffected by theme choice —
only these accent tokens change. `tint`/`edge` are the accent at 10%/28%
opacity in light mode, 14%/35% in dark mode.

| Theme | Mode | Accent | Pressed | Tint | Edge |
|---|---|---|---|---|---|
| Bronze *(default)* | Light | `#A67C52` | `#8B6B42` | 10% | 28% |
| Bronze | Dark | `#C89B66` | `#A67C52` | 14% | 35% |
| Ocean | Light | `#3E6FA6` | `#335A87` | 10% | 28% |
| Ocean | Dark | `#6FA0D8` | `#3E6FA6` | 14% | 35% |
| Forest | Light | `#4C7A52` | `#3D6242` | 10% | 28% |
| Forest | Dark | `#79AD80` | `#4C7A52` | 14% | 35% |
| Slate | Light | `#63798A` | `#516371` | 10% | 28% |
| Slate | Dark | `#A9BDC9` | `#63798A` | 14% | 35% |
| Amethyst | Light | `#7C5C9E` | `#654B80` | 10% | 28% |
| Amethyst | Dark | `#AD8BCB` | `#7C5C9E` | 14% | 35% |
| Blush | Light | `#C15B78` | `#9E4B62` | 10% | 28% |
| Blush | Dark | `#EF89A6` | `#C15B78` | 14% | 35% |
| Teal | Light | `#5FA39E` | `#4E8682` | 10% | 28% |
| Teal | Dark | `#91D6D0` | `#5FA39E` | 14% | 35% |

Revision notes from review:
- **Blush** was shifted from a muted mauve to a clearer, more saturated pink.
- **Teal** was lightened — the original was too dark for black chip text
  in light mode (~3.65:1 contrast); the new value gets ~5.97:1.
- **Slate** was brightened in both modes — the original read as muddy.

## Status

- [x] `accentThemes` defined for all 7 themes × 2 modes
- [x] `ThemeContext` persists `accentId` independently of `mode`
- [x] Settings swatch picker wired to `setAccentId`
- [x] `npx tsc --noEmit` clean
- [x] `npx jest` clean (258/258)
- [ ] Release APK built and installed on device
- [ ] Each of the 7 themes checked visually in **both** light and dark
- [ ] Spot-check text-on-accent contrast in real light (chips, buttons,
  selected dates) — not just computed contrast ratios
- [ ] Confirm Bronze-as-default didn't change anything for the current
  install (no visual diff before picking a theme)

## Steps to finish

1. On the dev machine (already set up, per `CLAUDE.md` → Build notes):
   ```bash
   cd android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
   ```
   No `expo prebuild` needed for this change — it's pure JS/TS, no native
   config touched. If `expo prebuild` is run for an unrelated reason,
   remember to restore `android/local.properties` per the existing note.
2. Sideload `android/app/build/outputs/apk/release/app-release.apk`.
3. In Settings → COLOR THEME, tap through all 7 swatches, confirming each
   looks right against the paper background.
4. Toggle dark mode (header sun/moon) and repeat step 3 for all 7.
5. Report back anything that reads wrong — a specific theme/mode pair,
   what looks off — and it gets a follow-up pass the same way Blush/Teal/
   Slate did.

## Open questions for later

- Should the picker eventually show which theme is "yours" more visibly
  (e.g. survey-sourced grouping), or stay as it is now — ungrouped swatches?
- Any interest in a per-theme name pass once they're seen on a real screen
  (e.g. "Slate" reading differently once it's brighter)?
