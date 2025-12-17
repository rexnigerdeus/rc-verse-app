// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 1. Add support for the 3D library (Three.js) source files
config.resolver.sourceExts.push('mjs');

// 2. Add support for 3D assets (if you add models later)
config.resolver.assetExts.push('glb', 'gltf', 'png', 'jpg');

module.exports = config;