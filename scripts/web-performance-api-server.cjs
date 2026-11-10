// Same compiled Nest modules and guards; only the local test listener differs.
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const startupStarted = performance.now();
const startupDiagnostics = process.env.EVRY_LOCAL_STARTUP_DIAGNOSTICS === '1';
function startupStage(name) {
  if (startupDiagnostics) console.error(`[local-api-startup] ${name}: ${Math.round(performance.now() - startupStarted)}ms`);
}
startupStage('runner entered');
const backendRoot = process.env.EVRY_BACKEND_ROOT;
if (!backendRoot) throw new Error('EVRY_BACKEND_ROOT is required for the local API runner');
const backendRequire = createRequire(resolve(backendRoot, 'package.json'));
backendRequire('reflect-metadata');
startupStage('reflect metadata loaded');
const { NestFactory } = backendRequire('@nestjs/core');
startupStage('Nest core loaded');
const { AppModule } = backendRequire('./dist/app.module');
startupStage('AppModule loaded');
const { configureApp } = backendRequire('./dist/configure-app');
startupStage('HTTP configuration module loaded');

let app;
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  try { if (app) await app.close(); process.exit(0); }
  catch { process.exit(1); }
}
process.on('SIGTERM', () => { void close(); });
process.on('SIGINT', () => { void close(); });

(async () => {
  startupStage('Nest factory starting');
  app = await NestFactory.create(AppModule, { logger: false });
  startupStage('Nest factory ready');
  configureApp(app);
  startupStage('HTTP configuration applied');
  await app.listen(4000, '127.0.0.1');
  startupStage('listener ready');
  const address = app.getHttpServer().address();
  if (!address || typeof address === 'string' || address.address !== '127.0.0.1' || address.port !== 4000) {
    throw new Error('Local API listener must remain loopback');
  }
  console.log('Compiled synthetic API listening on 127.0.0.1:4000');
})().catch(async () => {
  console.error('Local compiled API failed to initialize');
  try { if (app) await app.close(); } finally { process.exit(1); }
});
