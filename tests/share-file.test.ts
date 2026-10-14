import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCancel } from '../src/components/share-file.ts';

test('a dismissed share sheet counts as a cancel, and other failures do not', () => {
  assert.equal(isCancel(new DOMException('Share canceled', 'AbortError')), true);
  assert.equal(isCancel(new Error('Share canceled')), true);
  assert.equal(isCancel(new DOMException('Not allowed', 'NotAllowedError')), false);
  assert.equal(isCancel(new Error('Unable to write file')), false);
});
