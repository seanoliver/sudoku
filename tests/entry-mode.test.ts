import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeMode, beginBatch, selectMode, toggleMode, INITIAL_ENTRY_MODE } from '../src/lib/entry-mode.ts';

test('any mode is one selection away outside a batch', () => {
  for (const mode of ['value', 'note', 'exclude'] as const) {
    assert.equal(activeMode(selectMode(INITIAL_ENTRY_MODE, { mode, batch: false }), { batch: false }), mode);
  }
});

test('keyboard toggles go to the mode or back to Numbers', () => {
  const excluding = toggleMode(INITIAL_ENTRY_MODE, { mode: 'exclude', batch: false });
  assert.equal(excluding.mode, 'exclude');
  assert.equal(toggleMode(excluding, { mode: 'exclude', batch: false }).mode, 'value');
  assert.equal(toggleMode(excluding, { mode: 'note', batch: false }).mode, 'note');
});

test('a batch keeps the annotation mode after it ends', () => {
  const fromExclude = beginBatch({ mode: 'exclude', batchMode: 'note' });
  assert.equal(activeMode(fromExclude, { batch: true }), 'exclude');
  assert.equal(fromExclude.mode, 'exclude');
  const switched = selectMode(fromExclude, { mode: 'note', batch: true });
  assert.equal(activeMode(switched, { batch: true }), 'note');
  assert.equal(activeMode(switched, { batch: false }), 'note');
});

test('a batch started in Numbers annotates as Notes and returns to Numbers', () => {
  const fromValue = beginBatch(INITIAL_ENTRY_MODE);
  assert.equal(activeMode(fromValue, { batch: true }), 'note');
  const switched = selectMode(fromValue, { mode: 'exclude', batch: true });
  assert.equal(activeMode(switched, { batch: true }), 'exclude');
  assert.equal(activeMode(switched, { batch: false }), 'value');
});

test('choosing Numbers during a batch leaves annotation modes', () => {
  const batch = beginBatch({ mode: 'note', batchMode: 'note' });
  assert.equal(selectMode(batch, { mode: 'value', batch: true }).mode, 'value');
  assert.equal(toggleMode(batch, { mode: 'note', batch: true }).mode, 'value');
});

test('a batch from Notes annotates as Notes and keeps Notes', () => {
  const fromNotes = beginBatch({ mode: 'note', batchMode: 'exclude' });
  assert.deepEqual(fromNotes, { mode: 'note', batchMode: 'note' });
});

test('keyboard toggles inside a batch started in Numbers', () => {
  const batch = beginBatch(INITIAL_ENTRY_MODE);
  const excluding = toggleMode(batch, { mode: 'exclude', batch: true });
  assert.equal(activeMode(excluding, { batch: true }), 'exclude');
  assert.equal(excluding.mode, 'value');
  assert.equal(toggleMode(excluding, { mode: 'exclude', batch: true }).mode, 'value');
});
