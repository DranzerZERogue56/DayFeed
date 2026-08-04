// Make the release build debuggable so `adb run-as com.dayfeed.app` works.
//
// Why: DayFeed is offline by design, so the only way to get notes from the
// phone to a Claude Code session on the laptop is over adb. Reading the app's
// private database needs `run-as`, and `run-as` refuses a non-debuggable
// package — hence this flag.
//
// This lives as a config plugin because `expo prebuild` regenerates android/
// from scratch; a hand-edit to build.gradle would silently vanish on the next
// prebuild and the pull script would start failing with a confusing
// permission error rather than an obvious one.
//
// Scope of the trade: `run-as` is reachable only through adb, which requires
// USB debugging enabled and this specific host authorised on the device. It is
// not a network-facing hole, and the app still talks to nothing. What it does
// mean is that anyone who can unlock the phone AND authorise a USB host can
// read the notes database. That is the accepted cost of the feature.
const { withAppBuildGradle } = require('@expo/config-plugins');

const ANCHOR = 'signingConfig signingConfigs.debug';
const FLAG = 'debuggable true';

/** Insert `debuggable true` into the release buildType block. */
function addDebuggableToRelease(contents) {
  const start = contents.indexOf('buildTypes {');
  if (start === -1) throw new Error('withDebuggableRelease: no buildTypes block in build.gradle');

  const releaseStart = contents.indexOf('release {', start);
  if (releaseStart === -1) throw new Error('withDebuggableRelease: no release buildType');

  // Anchor on the release block's own signingConfig line rather than on the
  // first match in the file — debug declares the identical line just above.
  const anchorAt = contents.indexOf(ANCHOR, releaseStart);
  if (anchorAt === -1) throw new Error('withDebuggableRelease: release signingConfig not found');

  const lineEnd = contents.indexOf('\n', anchorAt);
  const head = contents.slice(0, lineEnd);
  const tail = contents.slice(lineEnd);
  if (tail.slice(0, 400).includes(FLAG)) return contents; // already applied

  return `${head}\n            // Added by plugins/withDebuggableRelease.js — see that file.\n            ${FLAG}${tail}`;
}

module.exports = function withDebuggableRelease(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withDebuggableRelease: expected a groovy build.gradle');
    }
    cfg.modResults.contents = addDebuggableToRelease(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.addDebuggableToRelease = addDebuggableToRelease;
