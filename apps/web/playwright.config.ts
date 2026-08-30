import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { buildPlaywrightConfig } from './playwright.config.options';

const frontendRoot = fileURLToPath(new URL('.', import.meta.url));
const backendRoot = process.env.EVRY_BACKEND_ROOT?.trim()
  ? resolve(process.env.EVRY_BACKEND_ROOT)
  : resolve(frontendRoot, '../../../backend');
export default buildPlaywrightConfig({
  frontendRoot,
  backendRoot,
  environment: process.env,
});
