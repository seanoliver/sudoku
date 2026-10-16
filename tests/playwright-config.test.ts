import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const run = (env: Record<string, string>) => spawnSync(process.execPath, ['--input-type=module', '-e', "const c = (await import('./playwright.config.ts')).default; console.log(JSON.stringify({ url: c.use.baseURL, reuse: c.webServer.reuseExistingServer }))"], {
  env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'CI' && key !== 'E2E_PORT')), ...env } as NodeJS.ProcessEnv,
  encoding: 'utf8',
});
const config = (env: Record<string, string> = {}) => {
  const result = run(env);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as { url: string; reuse: boolean };
};

test('no run reuses a server, locally or in CI', () => {
  assert.equal(config().reuse, false);
  assert.equal(config({ CI: '1' }).reuse, false);
});

test('CI uses 3400 and a local run uses a port from 3400 to 5399', () => {
  assert.equal(config({ CI: '1' }).url, 'http://localhost:3400');
  const port = Number(new URL(config().url).port);
  assert.ok(port >= 3400 && port <= 5399, String(port));
});

test('E2E_PORT wins, locally and in CI', () => {
  assert.equal(config({ E2E_PORT: '3911' }).url, 'http://localhost:3911');
  assert.equal(config({ CI: '1', E2E_PORT: '3911' }).url, 'http://localhost:3911');
});

test('an invalid E2E_PORT throws', () => {
  for (const value of ['abc', '0', '80', '0x1000', '1e3', '3400.5', '70000']) assert.match(run({ E2E_PORT: value }).stderr, /E2E_PORT must be a port/, value);
});
