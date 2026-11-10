const { createHash } = require('node:crypto');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Production transforms inline this public value. Do not reuse a previous
// endpoint's compiled client when only the build environment has changed.
// Preserve Expo's monorepo defaults and never hash private server secrets.
const endpointHash = createHash('sha256')
  .update(process.env.EXPO_PUBLIC_API_BASE_URL ?? '')
  .digest('hex');
config.cacheVersion = `${config.cacheVersion}-evry-api-${endpointHash}`;

module.exports = config;
