import assert from 'node:assert/strict';
import test from 'node:test';
import { runHomeScrollMigration } from '../setup-home-scroll.mjs';

const fixture = () => {
  let component = { id: 42, name: 'home_page', schema: { title: { type: 'text' }, unrelated: { type: 'boolean' } } };
  const calls = [];
  return {
    calls,
    api: {
      listComponents: async () => [structuredClone(component)],
      updateComponent: async (id, value) => { calls.push('update'); component = structuredClone(value); },
    },
    backup: async value => { calls.push('backup'); assert.equal(value.schema.unrelated.type, 'boolean'); },
    get: () => component,
  };
};
test('snap field migration is additive, backed up, opt-in and idempotent', async () => {
  const f = fixture();
  assert.deepEqual(await runHomeScrollMigration(f), {changed: true, applied: false});
  assert.deepEqual(f.calls, []);
  assert.deepEqual(await runHomeScrollMigration({...f, apply: true}), {changed: true, applied: true});
  assert.deepEqual(f.calls, ['backup', 'update']);
  assert.equal(f.get().schema.snap_scrolling.default_value, 'false');
  assert.equal(f.get().schema.unrelated.type, 'boolean');
  assert.deepEqual(await runHomeScrollMigration({...f, apply: true}), {changed: false, applied: false});
});
test('snap migration refuses incompatible existing fields and concurrent schema edits', async () => {
  const f = fixture();
  f.get().schema.snap_scrolling = {type: 'text'};
  await assert.rejects(runHomeScrollMigration({...f, apply: true}), /conflicts/);
  const g = fixture();
  const originalList = g.api.listComponents;
  let count = 0;
  g.api.listComponents = async () => {
    if (++count === 2) g.get().schema.new_field = {type: 'text'};
    return originalList();
  };
  await assert.rejects(runHomeScrollMigration({...g, apply: true}), /changed/);
  assert.deepEqual(g.calls, []);
});

test('snap migration accepts equivalent editor-added boolean metadata', async () => {
  const f = fixture();
  const { STORYBLOK_COMPONENTS } = await import('../storyblok-schema.mjs');
  const field = STORYBLOK_COMPONENTS.find(c => c.name === 'home_page').schema.snap_scrolling;
  f.get().schema.snap_scrolling = {...field, id: 'editor-id', default_value: false, translatable: false, tooltip: false};
  assert.deepEqual(await runHomeScrollMigration({...f, apply: true}), {changed: false, applied: false});
  assert.deepEqual(f.calls, []);
});
