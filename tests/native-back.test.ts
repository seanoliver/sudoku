import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finishesSwipe } from '../src/lib/native-back.ts';

const width = 390;

test('a swipe released past 35% of the width goes back', () => {
  assert.equal(finishesSwipe({ offset: 150, width, speed: 0 }), true);
});

test('a short swipe springs back unless it is flicked right', () => {
  assert.equal(finishesSwipe({ offset: 60, width, speed: 100 }), false);
  assert.equal(finishesSwipe({ offset: 60, width, speed: 800 }), true);
});

test('flicking back to the left cancels even past 35%', () => {
  assert.equal(finishesSwipe({ offset: 200, width, speed: -700 }), false);
});
