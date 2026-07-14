// Metro config: allow bundling the whisper model as an asset. `.bin` is not an
// asset extension by default, so `require('.../ggml-base.bin')` needs this.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('bin');

module.exports = config;
