import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPRINGS } from '../src/lib/motion.ts';

test('three spring presets, each a spring with stiffness and damping', () => {
  assert.deepEqual(Object.keys(SPRINGS), ['snappy', 'smooth', 'gentle']);
  for (const spring of Object.values(SPRINGS)) {
    assert.equal(spring.type, 'spring');
    assert.ok(spring.stiffness > 0 && spring.damping > 0);
  }
});

test('gentle does not overshoot', () => {
  const { stiffness, damping } = SPRINGS.gentle;
  assert.ok(damping >= 2 * Math.sqrt(stiffness));
});
