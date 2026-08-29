import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { buildPlaywrightConfig } from './playwright.config.options';

const frontendRoot = fileURLToPath(new URL('.', import.meta.url));
const backendRoot = resolve(frontendRoot, '../../..', 'EVRY-Backend', '.worktrees', 'release-candidate');
export default buildPlaywrightConfig({
  frontendRoot,
  backendRoot,
  environment: process.env,
});
