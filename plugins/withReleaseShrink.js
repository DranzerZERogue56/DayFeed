const fs = require('fs');
const path = require('path');
const { withGradleProperties, withDangerousMod } = require('expo/config-plugins');

// Turns on code and resource shrinking for release builds, and adds the keep
// rules the shrinker needs to leave the speech and text-scanning code alone.
//
// Shrinking makes the app smaller and harder to pick apart, and Play expects
// it for a published app. It also removes any code it thinks nothing uses —
// and native libraries that are called from C++ look unused from Java's side,
// so whisper (speech-to-text) and ML Kit (photo text scanning) need explicit
// keep rules or they crash the moment you use them in a release build. Neither
// library ships its own rules, so they live here.
//
// This is a config plugin rather than an edit to android/ because `expo
// prebuild` regenerates that folder from scratch (see CLAUDE.md).
const KEEP_RULES = `
# --- added by plugins/withReleaseShrink.js ---
# whisper.rn: the C++ side calls back into these classes by name.
-keep class com.rnwhisper.** { *; }
# ML Kit text scanning (photo notes) and its React Native bridge.
-keep class com.google.mlkit.** { *; }
-keep class com.rnmlkit.** { *; }
-dontwarn com.google.mlkit.**
`;

const MARKER = 'added by plugins/withReleaseShrink.js';

module.exports = function withReleaseShrink(config) {
  config = withGradleProperties(config, (cfg) => {
    const set = (key, value) => {
      cfg.modResults = cfg.modResults.filter((p) => p.key !== key);
      cfg.modResults.push({ type: 'property', key, value });
    };
    set('android.enableMinifyInReleaseBuilds', 'true');
    set('android.enableShrinkResourcesInReleaseBuilds', 'true');
    return cfg;
  });

  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const file = path.join(cfg.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (!existing.includes(MARKER)) {
        fs.writeFileSync(file, existing + KEEP_RULES);
      }
      return cfg;
    },
  ]);
};
