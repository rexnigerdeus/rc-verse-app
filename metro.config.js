// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 1. Add support for the 3D library (Three.js) source files
config.resolver.sourceExts.push('mjs');

// 2. Add support for 3D assets (if you add models later)
config.resolver.assetExts.push('glb', 'gltf', 'png', 'jpg');

// 3. Add support for SQLite databases (offline Bible, offline data cache)
config.resolver.assetExts.push('sqlite', 'db', 'sqlite3');

// 4. Add support for WebAssembly modules (used by expo-sqlite on web)
config.resolver.assetExts.push('wasm');

// 5. Disable package exports for wa-sqlite so Metro can find the .wasm
//    inside expo-sqlite/web/wa-sqlite/ via the relative worker.ts import.
//    Without this, Metro reports "Unable to resolve ./wa-sqlite/wa-sqlite.wasm".
config.resolver.unstable_enablePackageExports = false;

module.exports = config;

