# Installing DayFeed on an Android phone

There are two ways to get DayFeed onto a phone: **A) install the prebuilt APK**
(easiest — no computer or build tools needed), or **B) build it from source**.

## Requirements

- **Android 7.0 (Nougat) or newer**, on a **64-bit ARM** device (`arm64-v8a`) —
  essentially every phone sold since ~2017.
- **~200 MB free space** — the app bundles a ~142 MB on-device speech model so
  transcription works fully offline.
- Permission to install apps from outside the Play Store ("unknown sources").

---

## A. Install the prebuilt APK (recommended)

Do all of this **on the phone itself**.

1. Open the Releases page in the phone's browser:
   **https://github.com/DranzerZERogue56/DayFeed/releases/latest**
2. Under **Assets**, tap **`app-release.apk`** to download it (~173 MB).
3. When the download finishes, tap it (or open **Files → Downloads** and tap it).
4. Android will block it the first time: tap **Settings** on the prompt, enable
   **"Allow from this source"** for your browser (or Files app), then press Back.
5. Tap **Install**, then **Open**.
6. On first use, allow **Microphone** (voice notes) and **Camera** (photo notes)
   when prompted.

**Good to know**

- The APK is **debug-signed** — perfectly fine for personal sideloading. (Publishing
  to the Play Store would require your own release keystore.)
- "**App not installed**" usually means an older DayFeed is already installed
  (uninstall it first) or you're low on space.
- **From a computer instead?** With USB debugging on and the phone plugged in:
  ```bash
  adb install app-release.apk
  ```

---

## B. Build from source

Prerequisites: Node 20+, the Android SDK (platform 35, **NDK 27**, **CMake 3.22.1**),
and JDK 17+. See the main **README → Development setup** for details.

```bash
# 1. Clone and install JS deps
git clone https://github.com/DranzerZERogue56/DayFeed.git
cd DayFeed
npm install

# 2. Fetch the whisper model (kept out of git; ~142 MB)
curl -L -o assets/models/ggml-base.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin

# 3a. Build AND install onto a connected phone (USB debugging on):
npx expo run:android --variant release

# 3b. …or just produce the APK, then install it:
npx expo prebuild --platform android
cd android
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
adb install app/build/outputs/apk/release/app-release.apk
```

> Building all ABIs: drop the `-PreactNativeArchitectures=arm64-v8a` flag to make
> an APK that also runs on 32-bit / x86 devices (larger, slower to build).

---

## Troubleshooting

- **"There was a problem parsing the package."** The download was incomplete, or
  the device isn't `arm64-v8a`. Re-download, or rebuild without the ABI flag.
- **Transcribe button does nothing / errors.** The model wasn't bundled — make sure
  `assets/models/ggml-base.bin` is the real ~142 MB file *before* building.
- **Won't install over an existing copy.** Uninstall the previous DayFeed first
  (signatures/keystores must match to update in place).
