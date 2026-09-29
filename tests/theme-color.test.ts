import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEME_COLOR } from '../src/lib/theme-color.ts';

test('the browser theme color matches the canvas color in both themes', () => {
  const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
  const light = css.match(/:root \{[^}]*--canvas: (#[0-9a-f]+)/)?.[1];
  const dark = css.match(/:root\[data-theme='dark'\] \{[^}]*--canvas: (#[0-9a-f]+)/)?.[1];
  assert.deepEqual(THEME_COLOR, { light, dark });
});
