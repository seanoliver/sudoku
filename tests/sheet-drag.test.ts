import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closesOnRelease } from '../src/lib/sheet-drag.ts';

test('a drag past 100px closes, however slowly it ends', () => {
  assert.equal(closesOnRelease({ distance: 140, previous: { y: 0, at: 0 }, last: { y: 1, at: 100 } }), true);
});

test('a short, quick flick down closes', () => {
  assert.equal(closesOnRelease({ distance: 40, previous: { y: 20, at: 0 }, last: { y: 40, at: 16 } }), true);
});

test('a short, slow drag springs back', () => {
  assert.equal(closesOnRelease({ distance: 40, previous: { y: 35, at: 0 }, last: { y: 40, at: 16 } }), false);
});

test('a quick flick back up after dragging down springs back', () => {
  assert.equal(closesOnRelease({ distance: 40, previous: { y: 60, at: 0 }, last: { y: 40, at: 16 } }), false);
});

test('pulling up never closes', () => {
  assert.equal(closesOnRelease({ distance: -5, previous: { y: 0, at: 0 }, last: { y: 30, at: 10 } }), false);
});
