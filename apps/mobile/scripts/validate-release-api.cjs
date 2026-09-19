const { resolveMobileApiBaseUrl } = require('../src/api/api-config.ts');

const isEasHook = process.argv.includes('--eas-hook');
const isDevelopmentBuild = isEasHook && process.env.EAS_BUILD_PROFILE === 'development';

resolveMobileApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL, isDevelopmentBuild);
