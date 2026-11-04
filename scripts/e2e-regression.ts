// Run inside Firebase emulators:exec; every browser uses a separate demo identity.
import { spawnSync } from 'node:child_process';
const cli = new URL('../node_modules/@playwright/test/cli.js', import.meta.url);
for (const args of [['test'], ['test', '--grep', '20 isolated', '--repeat-each=2']]) {
  const result = spawnSync(process.execPath, [cli.pathname, ...args, '--project=chromium'], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
