import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkoutPortFor } from '../e2e/checkout-port.ts';

const configUrl = new URL('../playwright.config.ts', import.meta.url);
const root = dirname(fileURLToPath(configUrl));
const run = (env: Record<string, string>, cwd = root) => spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', `const c = (await import(${JSON.stringify(configUrl.href)})).default; console.log(JSON.stringify({ url: c.use.baseURL, reuse: c.webServer.reuseExistingServer, serverUrl: c.webServer.url, command: c.webServer.command }))`], {
  cwd,
  env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'CI' && key !== 'E2E_PORT')), ...env } as NodeJS.ProcessEnv,
  encoding: 'utf8',
  timeout: 30_000,
});
const config = (env: Record<string, string> = {}, cwd?: string) => {
  const result = run(env, cwd);
  assert.equal(result.status, 0, result.stderr);
  const loaded = JSON.parse(result.stdout) as { url: string; reuse: boolean; serverUrl: string; command: string };
  assert.equal(loaded.serverUrl, loaded.url);
  assert.ok(loaded.command.endsWith(`--port ${new URL(loaded.url).port}`), loaded.command);
  return loaded;
};

test('no run reuses a server, locally or in CI', () => {
  assert.equal(config().reuse, false);
  assert.equal(config({ CI: '1' }).reuse, false);
});

test('a checkout port is hashed from its folder into 3400 to 4999', () => {
  assert.equal(checkoutPortFor('/a'), 4429);
  assert.equal(checkoutPortFor('/b'), 3521);
});

test('CI uses 3400 and a local run uses the port hashed from the config folder', () => {
  assert.equal(config({ CI: '1' }).url, 'http://localhost:3400');
  const expected = checkoutPortFor(root);
  assert.equal(config().url, `http://localhost:${expected}`);
  assert.equal(config({}, `${root}/e2e`).url, `http://localhost:${expected}`);
});

test('E2E_PORT wins, locally and in CI', () => {
  assert.equal(config({ E2E_PORT: '3911' }).url, 'http://localhost:3911');
  assert.equal(config({ CI: '1', E2E_PORT: '3911' }).url, 'http://localhost:3911');
  assert.equal(config({ E2E_PORT: '1024' }).url, 'http://localhost:1024');
  assert.equal(config({ E2E_PORT: '65535' }).url, 'http://localhost:65535');
});

test('an invalid E2E_PORT throws', () => {
  for (const value of ['abc', '0', '1023', '65536', '0x1000', '1e3', '3400.5']) {
    const result = run({ E2E_PORT: value });
    assert.notEqual(result.status, 0, value);
    assert.match(result.stderr, /E2E_PORT must be a port/, value);
  }
});
